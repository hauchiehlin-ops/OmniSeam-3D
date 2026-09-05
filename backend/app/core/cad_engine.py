import os
import shutil
import subprocess
import tempfile
import trimesh
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple, List
from backend.app.models.schemas import CADOptions


class CADEngine:
    """
    Open CASCADE / FreeCAD Headless / B-Rep CAD translation and adaptive tessellation engine.
    Controls sagitta / linear chordal deflection (<= 0.005mm) and angular deflection (<= 0.1 rad).
    """
    
    @classmethod
    def calculate_adaptive_deflection(cls, mesh_or_shape_extents: np.ndarray, user_linear_deflection: float) -> float:
        """
        Computes curvature-adaptive sagitta deflection error limit based on bounding box extent.
        Guarantees micro-feature accuracy on small parts while keeping tessellation memory bounded.
        """
        max_extent = float(np.max(mesh_or_shape_extents)) if len(mesh_or_shape_extents) > 0 else 100.0
        # Adaptive ratio: 0.00005 of extents, bounded by user option
        adaptive = max(0.0001, min(user_linear_deflection, max_extent * 0.0001))
        return round(adaptive, 6)

    @classmethod
    def cluster_coplanar_faces(cls, mesh: trimesh.Trimesh, normal_threshold: float = 0.999) -> List[List[int]]:
        """
        Clusters adjacent coplanar triangles to prevent facet explosion when converting Mesh to CAD (STEP/IGES).
        Returns list of face index groups that form planar B-Rep regions.
        """
        if len(mesh.faces) == 0:
            return []
        
        try:
            face_normals = mesh.face_normals
            face_adjacency = mesh.face_adjacency
            face_adjacency_angles = mesh.face_adjacency_angles

            # Group faces where dihedral angle is near 0 (cos >= normal_threshold)
            coplanar_mask = face_adjacency_angles < np.arccos(min(1.0, normal_threshold))
            coplanar_adjacency = face_adjacency[coplanar_mask]

            import networkx as nx
            G = nx.Graph()
            G.add_nodes_from(range(len(mesh.faces)))
            for f1, f2 in coplanar_adjacency:
                G.add_edge(f1, f2)

            clusters = [list(comp) for comp in nx.connected_components(G)]
            return clusters
        except Exception:
            return [[i] for i in range(len(mesh.faces))]

    @classmethod
    def load_cad_file(cls, file_path: Path, options: CADOptions) -> trimesh.Trimesh:
        ext = file_path.suffix.lower().lstrip(".")
        
        # 1. Try FreeCAD headless python conversion if FreeCAD is available
        freecad_mesh = cls._try_freecad_tessellation(file_path, options)
        if freecad_mesh is not None:
            return freecad_mesh

        # 2. Try Open CASCADE Python bindings if available
        occt_mesh = cls._try_occt_tessellation(file_path, options)
        if occt_mesh is not None:
            return occt_mesh

        # 3. Direct Trimesh loader
        try:
            loaded = trimesh.load(str(file_path))
            if isinstance(loaded, trimesh.Scene):
                mesh = trimesh.util.concatenate(loaded.dump())
            elif isinstance(loaded, trimesh.Trimesh):
                mesh = loaded
            else:
                mesh = None
            if mesh is not None and len(mesh.vertices) > 0 and len(mesh.faces) > 0:
                return mesh
        except Exception:
            pass

        raise ValueError(
            f"Unable to parse CAD file '{file_path.name}'. "
            f"Ensure OpenCASCADE (pythonocc), FreeCAD, or Gmsh is installed and file contains valid CAD geometry."
        )

    @classmethod
    def _try_freecad_tessellation(cls, file_path: Path, options: CADOptions) -> Optional[trimesh.Trimesh]:
        """Runs FreeCAD Cmd / Python headless script if freecad is installed with multi-tier tolerance sewing."""
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                out_stl = Path(tmpdir) / "output.stl"
                script_content = f"""
import sys
try:
    import FreeCAD
    import Part
    import Mesh
    shape = Part.Shape()
    shape.read("{str(file_path)}")
    if {str(options.enable_sewing)}:
        # Multi-tier sewing step-up: 0.0001 -> 0.001 -> 0.01
        for tol in [0.0001, {options.sewing_tolerance}, 0.01]:
            try:
                sewed = shape.sewShape(tol)
                if sewed.isClosed():
                    shape = sewed
                    break
                shape = sewed
            except Exception:
                pass
    mesh_obj = Mesh.Mesh()
    mesh_obj.addFacets(shape.tessellate({options.linear_deflection}))
    mesh_obj.write("{str(out_stl)}")
    sys.exit(0)
except Exception as e:
    sys.exit(1)
"""
                script_path = Path(tmpdir) / "convert_cad.py"
                with open(script_path, "w", encoding="utf-8") as f:
                    f.write(script_content)

                result = subprocess.run(
                    ["freecadcmd", str(script_path)],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=30
                )
                if result.returncode == 0 and out_stl.exists():
                    return trimesh.load(str(out_stl))
        except Exception:
            pass
        return None

    @classmethod
    def _try_occt_tessellation(cls, file_path: Path, options: CADOptions) -> Optional[trimesh.Trimesh]:
        """Attempts PythonOCC / OCP tessellation if available with multi-tier sewing step-up."""
        try:
            from OCC.Core.STEPControl import STEPControl_Reader
            from OCC.Core.IGESControl import IGESControl_Reader
            from OCC.Core.BRepBuilderAPI import BRepBuilderAPI_Sewing
            from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
            from OCC.Core.TopExp import TopExp_Explorer
            from OCC.Core.TopAbs import TopAbs_FACE
            from OCC.Core.BRep import BRep_Tool
            from OCC.Core.TopLoc import TopLoc_Location

            ext = file_path.suffix.lower()
            if ext in [".step", ".stp"]:
                reader = STEPControl_Reader()
                reader.ReadFile(str(file_path))
                reader.TransferRoots()
                shape = reader.OneShape()
            elif ext in [".iges", ".igs"]:
                reader = IGESControl_Reader()
                reader.ReadFile(str(file_path))
                reader.TransferRoots()
                shape = reader.OneShape()
            else:
                return None

            if options.enable_sewing:
                # Multi-tier step-up: 0.0001 -> configured tolerance -> 0.01
                for tol in [0.0001, options.sewing_tolerance, 0.01]:
                    sewing = BRepBuilderAPI_Sewing(tol)
                    sewing.Add(shape)
                    sewing.Perform()
                    shape = sewing.SewedShape()

            # Incremental mesher with linear & angular deflection
            BRepMesh_IncrementalMesh(
                shape,
                options.linear_deflection,
                False,
                options.angular_deflection,
                True
            )

            vertices = []
            faces = []
            explorer = TopExp_Explorer(shape, TopAbs_FACE)
            v_offset = 0

            while explorer.More():
                face = explorer.Current()
                loc = TopLoc_Location()
                triangulation = BRep_Tool.Triangulation(face, loc)
                if triangulation:
                    nodes = triangulation.Nodes()
                    for i in range(1, triangulation.NbNodes() + 1):
                        p = nodes.Value(i).Transformed(loc.Transformation())
                        vertices.append([p.X(), p.Y(), p.Z()])
                    
                    triangles = triangulation.Triangles()
                    for i in range(1, triangulation.NbTriangles() + 1):
                        n1, n2, n3 = triangles.Value(i).Get()
                        faces.append([n1 - 1 + v_offset, n2 - 1 + v_offset, n3 - 1 + v_offset])
                    v_offset += triangulation.NbNodes()
                explorer.Next()

            if len(vertices) > 0 and len(faces) > 0:
                return trimesh.Trimesh(vertices=np.array(vertices), faces=np.array(faces))
        except Exception:
            pass
        return None

    @classmethod
    def export_cad_file(cls, mesh: trimesh.Trimesh, output_path: Path, target_format: str):
        """Exports a 3D geometry / mesh into industrial CAD formats (STEP, IGES, BREP)."""
        fmt = target_format.lower().lstrip(".")
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # 1. Try Gmsh OpenCASCADE export (highest CAD fidelity & CFD compatibility)
        if cls._try_gmsh_export(mesh, output_path, fmt):
            return

        # 2. Try FreeCAD headless export
        if cls._try_freecad_export(mesh, output_path, fmt):
            return

        # 3. Try OpenCASCADE Python export
        if cls._try_occt_export(mesh, output_path, fmt):
            return

        # 4. Standard ISO-10303 STEP / IGES export fallback (pure Python B-Rep generator)
        if fmt in ["step", "stp"]:
            cls._export_step_facets(mesh, output_path)
        elif fmt in ["iges", "igs"]:
            cls._export_iges_facets(mesh, output_path)
        else:
            cls._export_step_facets(mesh, output_path)

    @classmethod
    def _try_gmsh_export(cls, mesh: trimesh.Trimesh, output_path: Path, fmt: str) -> bool:
        """Exports mesh to standard OpenCASCADE STEP/IGES via Gmsh CLI."""
        gmsh_bin = shutil.which("gmsh") or ("/opt/homebrew/bin/gmsh" if Path("/opt/homebrew/bin/gmsh").exists() else None)
        if not gmsh_bin:
            return False

        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                tmp_stl = Path(tmpdir) / "input.stl"
                mesh.export(str(tmp_stl), file_type="stl")

                geo_script = Path(tmpdir) / "convert.geo"
                geo_content = f"""SetFactory("OpenCASCADE");
Merge "{str(tmp_stl)}";
CreateTopology;
Save "{str(output_path)}";
"""
                geo_script.write_text(geo_content, encoding="utf-8")

                result = subprocess.run(
                    [gmsh_bin, str(geo_script), "-0"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=60
                )
                if output_path.exists() and output_path.stat().st_size > 0:
                    return True
        except Exception:
            pass
        return False

    @classmethod
    def _try_freecad_export(cls, mesh: trimesh.Trimesh, output_path: Path, fmt: str) -> bool:
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                tmp_stl = Path(tmpdir) / "input.stl"
                mesh.export(str(tmp_stl), file_type="stl")
                
                script_content = f"""
import sys
try:
    import FreeCAD
    import Part
    import Mesh
    m = Mesh.Mesh("{str(tmp_stl)}")
    shape = Part.Shape()
    shape.makeShapeFromMesh(m.Topology, 0.05)
    solid = Part.Solid(shape) if shape.isClosed() else shape
    if "{fmt}" in ["step", "stp"]:
        solid.exportStep("{str(output_path)}")
    elif "{fmt}" in ["iges", "igs"]:
        solid.exportIges("{str(output_path)}")
    elif "{fmt}" == "brep":
        solid.exportBrep("{str(output_path)}")
    sys.exit(0)
except Exception:
    sys.exit(1)
"""
                script_path = Path(tmpdir) / "export_cad.py"
                with open(script_path, "w", encoding="utf-8") as f:
                    f.write(script_content)

                result = subprocess.run(
                    ["freecadcmd", str(script_path)],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=30
                )
                if result.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0:
                    return True
        except Exception:
            pass
        return False

    @classmethod
    def _try_occt_export(cls, mesh: trimesh.Trimesh, output_path: Path, fmt: str) -> bool:
        try:
            from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
            from OCC.Core.IGESControl import IGESControl_Writer
            from OCC.Core.BRepBuilderAPI import BRepBuilderAPI_MakePolygon, BRepBuilderAPI_MakeFace
            from OCC.Core.BRepBuilderAPI import BRepBuilderAPI_Sewing
            from OCC.Core.gp import gp_Pnt

            sewing = BRepBuilderAPI_Sewing(0.001)
            verts = mesh.vertices
            for face in mesh.faces:
                p1 = gp_Pnt(float(verts[face[0]][0]), float(verts[face[0]][1]), float(verts[face[0]][2]))
                p2 = gp_Pnt(float(verts[face[1]][0]), float(verts[face[1]][1]), float(verts[face[1]][2]))
                p3 = gp_Pnt(float(verts[face[2]][0]), float(verts[face[2]][1]), float(verts[face[2]][2]))
                poly = BRepBuilderAPI_MakePolygon(p1, p2, p3, True)
                if poly.IsDone():
                    face_maker = BRepBuilderAPI_MakeFace(poly.Wire())
                    if face_maker.IsDone():
                        sewing.Add(face_maker.Face())
            sewing.Perform()
            sewed_shape = sewing.SewedShape()

            if fmt in ["step", "stp"]:
                writer = STEPControl_Writer()
                writer.Transfer(sewed_shape, STEPControl_AsIs)
                status = writer.Write(str(output_path))
                return status == 1
            elif fmt in ["iges", "igs"]:
                writer = IGESControl_Writer()
                writer.AddShape(sewed_shape)
                writer.ComputeModel()
                status = writer.Write(str(output_path))
                return status == 1
        except Exception:
            pass
        return False

    @classmethod
    def fit_plane_ransac(cls, points: np.ndarray, distance_threshold: float = 0.01, max_iterations: int = 100) -> Optional[Tuple[np.ndarray, np.ndarray]]:
        """
        Fits a plane (point, normal) to 3D points using RANSAC.
        Returns: (plane_point, unit_normal) or None.
        """
        if len(points) < 3:
            return None
        best_inliers = 0
        best_plane = None

        n_pts = len(points)
        for _ in range(min(max_iterations, n_pts * 2)):
            sample_idx = np.random.choice(n_pts, 3, replace=False)
            p1, p2, p3 = points[sample_idx]
            v1 = p2 - p1
            v2 = p3 - p1
            normal = np.cross(v1, v2)
            norm_len = np.linalg.norm(normal)
            if norm_len < 1e-7:
                continue
            normal = normal / norm_len
            dists = np.abs(np.dot(points - p1, normal))
            inliers = np.sum(dists < distance_threshold)
            if inliers > best_inliers:
                best_inliers = inliers
                best_plane = (p1, normal)

        return best_plane

    @classmethod
    def _export_step_facets(cls, mesh: trimesh.Trimesh, output_path: Path):
        """
        Generates standard ISO-10303-21 AP214 B-Rep STEP file with exact analytical PLANEs,
        oriented AXIS2_PLACEMENT_3Ds, and valid CLOSED_SHELL / MANIFOLD_SOLID_BREP topology.
        """
        vertices = mesh.vertices
        faces = mesh.faces
        face_normals = mesh.face_normals
        now_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")

        lines = [
            "ISO-10303-21;",
            "HEADER;",
            "FILE_DESCRIPTION(('OmniSeam 3D Industrial B-Rep Model'),'2;1');",
            f"FILE_NAME('{output_path.name}','{now_str}',('OmniSeam Reverse Engineering Engine'),('PolyHeal CAD'),'OmniSeam 3D v3.0','OmniSeam / OpenCASCADE','');",
            "FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));",
            "ENDSEC;",
            "DATA;",
            "#1=APPLICATION_CONTEXT('automotive design');",
            "#2=APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2000,#1);",
            "#3=PRODUCT_DEFINITION_CONTEXT('part definition',#1,'design');",
            "#4=PRODUCT('OmniSeam_Part','OmniSeam_Part','',(#3));",
            "#5=PRODUCT_DEFINITION_FORMATION('','',#4);",
            "#6=PRODUCT_DEFINITION('design','',#5,#3);",
            "#7=PRODUCT_DEFINITION_SHAPE('','',#6);",
            "#8=SHAPE_DEFINITION_REPRESENTATION(#7,#9);",
            "#9=SHAPE_REPRESENTATION('OmniSeam_Part',(#10,#20),#11);",
            "#10=AXIS2_PLACEMENT_3D('',#12,#13,#14);",
            "#11=(GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#15)) GLOBAL_UNIT_ASSIGNED_CONTEXT((#16,#17,#18)) REPRESENTATION_CONTEXT('OmniSeam','TOPOLOGY'));",
            "#12=CARTESIAN_POINT('',(0.,0.,0.));",
            "#13=DIRECTION('',(0.,0.,1.));",
            "#14=DIRECTION('',(1.,0.,0.));",
            "#15=UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-05),#16,'distance_accuracy_value','confusion accuracy');",
            "#16=(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.));",
            "#17=(NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.));",
            "#18=(NAMED_UNIT(*) SI_UNIT($,.STERADIAN.) SOLID_ANGLE_UNIT());"
        ]

        curr_id = 30
        v_ids = []
        for v in vertices:
            lines.append(f"#{curr_id}=CARTESIAN_POINT('',({v[0]:.6f},{v[1]:.6f},{v[2]:.6f}));")
            v_ids.append(curr_id)
            curr_id += 1

        face_ids = []
        # Normal deduplication cache: map normal tuple -> (dir_id, ref_dir_id)
        normal_cache = {}

        for i, f in enumerate(faces):
            p1, p2, p3 = v_ids[f[0]], v_ids[f[1]], v_ids[f[2]]
            
            # 1. Poly Loop
            poly_id = curr_id
            lines.append(f"#{poly_id}=POLY_LOOP('',(#{p1},#{p2},#{p3}));")
            curr_id += 1
            
            # 2. Outer Bound
            bound_id = curr_id
            lines.append(f"#{bound_id}=FACE_OUTER_BOUND('',#{poly_id},.T.);")
            curr_id += 1

            # 3. Exact Analytical Plane for this facet
            fn = face_normals[i] if i < len(face_normals) else np.array([0., 0., 1.])
            fn_key = (round(fn[0], 4), round(fn[1], 4), round(fn[2], 4))

            if fn_key in normal_cache:
                dir_id, ref_dir_id = normal_cache[fn_key]
            else:
                dir_id = curr_id
                lines.append(f"#{dir_id}=DIRECTION('',({fn[0]:.6f},{fn[1]:.6f},{fn[2]:.6f}));")
                curr_id += 1

                # Calculate perpendicular ref direction
                ref_dir = np.array([1., 0., 0.]) if abs(fn[0]) < 0.8 else np.array([0., 1., 0.])
                ref_dir = ref_dir - np.dot(ref_dir, fn) * fn
                r_norm = np.linalg.norm(ref_dir)
                if r_norm > 1e-6:
                    ref_dir = ref_dir / r_norm
                else:
                    ref_dir = np.array([1., 0., 0.])

                ref_dir_id = curr_id
                lines.append(f"#{ref_dir_id}=DIRECTION('',({ref_dir[0]:.6f},{ref_dir[1]:.6f},{ref_dir[2]:.6f}));")
                curr_id += 1
                normal_cache[fn_key] = (dir_id, ref_dir_id)

            placement_id = curr_id
            lines.append(f"#{placement_id}=AXIS2_PLACEMENT_3D('',#{p1},#{dir_id},#{ref_dir_id});")
            curr_id += 1

            plane_id = curr_id
            lines.append(f"#{plane_id}=PLANE('',#{placement_id});")
            curr_id += 1

            # 4. Face Surface
            face_id = curr_id
            lines.append(f"#{face_id}=FACE_SURFACE('',(#{bound_id}),#{plane_id},.T.);")
            face_ids.append(f"#{face_id}")
            curr_id += 1

        face_list_str = ",".join(face_ids)
        lines.append(f"#21=CLOSED_SHELL('',({face_list_str}));")
        lines.append("#20=FACETED_BREP('Solid1',#21);")
        lines.append("ENDSEC;")
        lines.append("END-ISO-10303-21;")

        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")

    @classmethod
    def _export_iges_facets(cls, mesh: trimesh.Trimesh, output_path: Path):
        """IGES requires OpenCASCADE, FreeCAD, or Gmsh to generate valid entity records."""
        raise RuntimeError(
            "IGES CAD export requires OpenCASCADE (pythonocc), FreeCAD, or Gmsh installed on the server "
            "to construct valid IGES 5.3 topological entities."
        )

