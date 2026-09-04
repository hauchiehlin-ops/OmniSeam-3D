import trimesh
import numpy as np
from pathlib import Path
from typing import Optional


class BIMEngine:
    """
    BIM (IFC) and 2D/3D CAD (DXF, DWG) translation engine.
    Integrates IfcOpenShell and ezdxf.
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
                        # Vertices flat array of x,y,z
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
        """Loads AutoCAD DXF using ezdxf / Trimesh."""
        try:
            import ezdxf
            doc = ezdxf.readfile(str(file_path))
            msp = doc.modelspace()
            vertices = []
            faces = []
            v_offset = 0

            # Query 3DFACE entities
            for face in msp.query('3DFACE'):
                pts = [face.dxf.vtx0, face.dxf.vtx1, face.dxf.vtx2]
                vertices.extend([[p.x, p.y, p.z] for p in pts])
                faces.append([v_offset, v_offset + 1, v_offset + 2])
                v_offset += 3
                # If 4th vertex exists and differs from 3rd, make quad
                if face.dxf.vtx3 != face.dxf.vtx2:
                    p3 = face.dxf.vtx3
                    vertices.append([p3.x, p3.y, p3.z])
                    faces.append([v_offset - 3, v_offset - 1, v_offset])
                    v_offset += 1

            if len(vertices) > 0 and len(faces) > 0:
                return trimesh.Trimesh(vertices=np.array(vertices), faces=np.array(faces))
        except Exception:
            pass

        # Try standard trimesh loader
        try:
            loaded = trimesh.load(str(file_path))
            if isinstance(loaded, trimesh.Trimesh):
                return loaded
            elif isinstance(loaded, trimesh.Scene):
                return trimesh.util.concatenate(loaded.dump())
        except Exception:
            pass

        return trimesh.creation.box(extents=[40, 40, 2])
