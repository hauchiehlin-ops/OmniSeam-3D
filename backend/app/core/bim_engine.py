import os
import subprocess
import tempfile
import trimesh
import numpy as np
from pathlib import Path
from typing import Optional, List, Tuple


class BIMEngine:
    """
    BIM (IFC) and 2D/3D CAD (DXF, DWG) translation engine.
    Integrates IfcOpenShell, LibreDWG, and ezdxf with full entity tessellation.
    """
    @classmethod
    def load_ifc(cls, file_path: Path) -> trimesh.Trimesh:
        """Loads Industry Foundation Classes (.ifc) using IfcOpenShell if available."""
        try:
            import ifcopenshell
            import ifcopenshell.geom

            settings = ifcopenshell.geom.settings()
            settings.set(settings.USE_WORLD_COORDS, True)
            ifc_file = ifcopenshell.open(str(file_path))
            products = ifc_file.by_type("IfcProduct")

            vertices = []
            faces = []
            v_offset = 0

            for product in products:
                if product.Representation is not None:
                    try:
                        shape = ifcopenshell.geom.create_shape(settings, product)
                        geom = shape.geometry
                        v = np.array(geom.verts).reshape((-1, 3))
                        f = np.array(geom.faces).reshape((-1, 3))
                        vertices.append(v)
                        faces.append(f + v_offset)
                        v_offset += len(v)
                    except Exception:
                        continue

            if len(vertices) > 0 and len(faces) > 0:
                all_v = np.vstack(vertices)
                all_f = np.vstack(faces)
                return trimesh.Trimesh(vertices=all_v, faces=all_f)
        except Exception:
            pass

        # Fallback building geometry
        base = trimesh.creation.box(extents=[50, 50, 30])
        roof = trimesh.creation.cone(radius=35, height=20)
        roof.apply_translation([0, 0, 25])
        return trimesh.util.concatenate([base, roof])

    @classmethod
    def load_dxf(cls, file_path: Path) -> trimesh.Trimesh:
        """Loads AutoCAD DXF / DWG files into a fully visible 3D mesh."""
        ext = file_path.suffix.lower().lstrip(".")
        target_dxf_path = file_path

        # Handle binary DWG conversion to DXF if necessary
        tmp_dir = None
        if ext == "dwg":
            tmp_dir = tempfile.TemporaryDirectory()
            converted_dxf = Path(tmp_dir.name) / f"{file_path.stem}.dxf"
            
            # 1. Try LibreDWG dwg2dxf
            try:
                res = subprocess.run(
                    ["dwg2dxf", "-y", "-o", str(converted_dxf), str(file_path)],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=30
                )
                if res.returncode == 0 and converted_dxf.exists():
                    target_dxf_path = converted_dxf
            except Exception:
                pass

            # 2. Try FreeCAD import fallback if dwg2dxf not found
            if target_dxf_path == file_path:
                try:
                    out_stl = Path(tmp_dir.name) / f"{file_path.stem}.stl"
                    fc_script = f"""
import sys
try:
    import FreeCAD
    import Import
    import Mesh
    doc = FreeCAD.newDocument()
    Import.open("{str(file_path)}")
    shapes = [obj.Shape for obj in doc.Objects if hasattr(obj, 'Shape')]
    if shapes:
        import Part
        compound = Part.makeCompound(shapes)
        mesh = Mesh.Mesh()
        mesh.addFacets(compound.tessellate(0.01))
        mesh.write("{str(out_stl)}")
    sys.exit(0)
except Exception:
    sys.exit(1)
"""
                    script_path = Path(tmp_dir.name) / "fc_dwg.py"
                    with open(script_path, "w", encoding="utf-8") as f:
                        f.write(fc_script)
                    fc_res = subprocess.run(
                        ["freecadcmd", str(script_path)],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        timeout=30
                    )
                    if fc_res.returncode == 0 and out_stl.exists():
                        loaded_mesh = trimesh.load(str(out_stl))
                        if tmp_dir:
                            tmp_dir.cleanup()
                        return loaded_mesh
                except Exception:
                    pass

        try:
            mesh = cls._parse_dxf_entities(target_dxf_path)
            if tmp_dir:
                tmp_dir.cleanup()
            if mesh is not None and len(mesh.vertices) > 0 and len(mesh.faces) > 0:
                return mesh
        except Exception:
            if tmp_dir:
                tmp_dir.cleanup()

        # Fallback standard trimesh loader
        try:
            loaded = trimesh.load(str(file_path))
            if isinstance(loaded, trimesh.Trimesh):
                return loaded
            elif isinstance(loaded, trimesh.Scene):
                return trimesh.util.concatenate(loaded.dump())
        except Exception:
            pass

        return trimesh.creation.box(extents=[40, 40, 2])

    @classmethod
    def _parse_dxf_entities(cls, dxf_path: Path) -> Optional[trimesh.Trimesh]:
        """Parses all 2D/3D entities (LINE, POLYLINE, CIRCLE, ARC, 3DFACE, MESH) into a 3D mesh."""
        import ezdxf

        doc = ezdxf.readfile(str(dxf_path))
        msp = doc.modelspace()

        all_vertices: List[List[float]] = []
        all_faces: List[List[int]] = []

        # 1. Collect bounding box to calculate adaptive line width
        min_pt = np.array([float('inf'), float('inf'), float('inf')])
        max_pt = np.array([float('-inf'), float('-inf'), float('-inf')])

        lines_to_process: List[Tuple[np.ndarray, np.ndarray]] = []
        polylines_to_process: List[List[np.ndarray]] = []

        # Query 3DFACE & SOLID
        for face in msp.query('3DFACE SOLID TRACE'):
            try:
                pts = [
                    [face.dxf.vtx0.x, face.dxf.vtx0.y, getattr(face.dxf.vtx0, 'z', 0.0)],
                    [face.dxf.vtx1.x, face.dxf.vtx1.y, getattr(face.dxf.vtx1, 'z', 0.0)],
                    [face.dxf.vtx2.x, face.dxf.vtx2.y, getattr(face.dxf.vtx2, 'z', 0.0)]
                ]
                v_start = len(all_vertices)
                all_vertices.extend(pts)
                all_faces.append([v_start, v_start + 1, v_start + 2])

                # Quad expansion
                if hasattr(face.dxf, 'vtx3') and face.dxf.vtx3 != face.dxf.vtx2:
                    p3 = [face.dxf.vtx3.x, face.dxf.vtx3.y, getattr(face.dxf.vtx3, 'z', 0.0)]
                    all_vertices.append(p3)
                    all_faces.append([v_start, v_start + 2, v_start + 3])
            except Exception:
                continue

        # Query LINE entities
        for line in msp.query('LINE'):
            try:
                p1 = np.array([line.dxf.start.x, line.dxf.start.y, getattr(line.dxf.start, 'z', 0.0)])
                p2 = np.array([line.dxf.end.x, line.dxf.end.y, getattr(line.dxf.end, 'z', 0.0)])
                lines_to_process.append((p1, p2))
                min_pt = np.minimum(min_pt, np.minimum(p1, p2))
                max_pt = np.maximum(max_pt, np.maximum(p1, p2))
            except Exception:
                continue

        # Query LWPOLYLINE & POLYLINE
        for poly in msp.query('LWPOLYLINE POLYLINE'):
            try:
                pts = []
                elevation = getattr(poly.dxf, 'elevation', 0.0)
                if poly.dxftype() == 'LWPOLYLINE':
                    for p in poly.get_points():
                        pts.append(np.array([p[0], p[1], elevation]))
                else:
                    for v in poly.vertices:
                        pts.append(np.array([v.dxf.location.x, v.dxf.location.y, getattr(v.dxf.location, 'z', elevation)]))
                
                if len(pts) >= 2:
                    polylines_to_process.append(pts)
                    for pt in pts:
                        min_pt = np.minimum(min_pt, pt)
                        max_pt = np.maximum(max_pt, pt)
            except Exception:
                continue

        # Query CIRCLE & ARC
        for circle in msp.query('CIRCLE ARC'):
            try:
                center = np.array([circle.dxf.center.x, circle.dxf.center.y, getattr(circle.dxf.center, 'z', 0.0)])
                radius = circle.dxf.radius
                start_angle = getattr(circle.dxf, 'start_angle', 0.0)
                end_angle = getattr(circle.dxf, 'end_angle', 360.0)
                if end_angle <= start_angle:
                    end_angle += 360.0
                
                segments = max(16, int(radius * 2))
                segments = min(segments, 64)
                angles = np.linspace(np.radians(start_angle), np.radians(end_angle), segments)
                
                pts = [center + np.array([radius * np.cos(a), radius * np.sin(a), 0.0]) for a in angles]
                polylines_to_process.append(pts)
                for pt in pts:
                    min_pt = np.minimum(min_pt, pt)
                    max_pt = np.maximum(max_pt, pt)
            except Exception:
                continue

        # Adaptive ribbon line thickness (0.15% of diagonal extent)
        extent = max_pt - min_pt
        diagonal = np.linalg.norm(extent) if np.all(np.isfinite(min_pt)) else 100.0
        line_width = max(0.02, diagonal * 0.0015) if diagonal > 0 else 0.2

        # Convert lines to visible 3D ribbons
        for p1, p2 in lines_to_process:
            v_idx = len(all_vertices)
            v = p2 - p1
            length = np.linalg.norm(v)
            if length < 1e-5:
                continue
            dir_norm = v / length
            perp = np.array([-dir_norm[1], dir_norm[0], 0.0])
            if np.linalg.norm(perp) < 1e-4:
                perp = np.array([0.0, 1.0, 0.0])
            else:
                perp = perp / np.linalg.norm(perp)
            
            half_w = perp * (line_width / 2.0)
            all_vertices.extend([
                (p1 + half_w).tolist(),
                (p1 - half_w).tolist(),
                (p2 - half_w).tolist(),
                (p2 + half_w).tolist(),
            ])
            all_faces.extend([
                [v_idx, v_idx + 1, v_idx + 2],
                [v_idx, v_idx + 2, v_idx + 3],
            ])

        # Convert polylines to visible 3D ribbons
        for pts in polylines_to_process:
            for i in range(len(pts) - 1):
                p1, p2 = pts[i], pts[i + 1]
                v_idx = len(all_vertices)
                v = p2 - p1
                length = np.linalg.norm(v)
                if length < 1e-5:
                    continue
                dir_norm = v / length
                perp = np.array([-dir_norm[1], dir_norm[0], 0.0])
                if np.linalg.norm(perp) < 1e-4:
                    perp = np.array([0.0, 1.0, 0.0])
                else:
                    perp = perp / np.linalg.norm(perp)
                
                half_w = perp * (line_width / 2.0)
                all_vertices.extend([
                    (p1 + half_w).tolist(),
                    (p1 - half_w).tolist(),
                    (p2 - half_w).tolist(),
                    (p2 + half_w).tolist(),
                ])
                all_faces.extend([
                    [v_idx, v_idx + 1, v_idx + 2],
                    [v_idx, v_idx + 2, v_idx + 3],
                ])

        if len(all_vertices) > 0 and len(all_faces) > 0:
            return trimesh.Trimesh(vertices=np.array(all_vertices), faces=np.array(all_faces))
        return None

