import trimesh
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict, Any
from backend.app.models.schemas import AssemblyNode, AssemblyTree


class AssemblyTreeBuilder:
    """
    Extracts, builds, and preserves assembly hierarchies, part naming, transform matrices,
    and material/color semantics from CAD (STEP/IGES/FreeCAD) and mesh scenes (GLTF/3MF/OBJ).
    """

    @classmethod
    def build_from_mesh_or_scene(cls, loaded_obj: Any, root_name: str = "Assembly_Root") -> AssemblyTree:
        if isinstance(loaded_obj, trimesh.Scene):
            root_node = AssemblyNode(
                id="root",
                name=root_name,
                visible=True,
                part_count=len(loaded_obj.geometry)
            )
            
            # Walk the scene graph
            for node_name, geom_name in loaded_obj.graph.nodes_geometry:
                geom = loaded_obj.geometry.get(geom_name)
                matrix = None
                try:
                    mat, _ = loaded_obj.graph.get(node_name)
                    if mat is not None:
                        matrix = mat.flatten().tolist()
                except Exception:
                    pass

                color = None
                if geom is not None and hasattr(geom, 'visual'):
                    if hasattr(geom.visual, 'main_color'):
                        c = geom.visual.main_color
                        color = [float(c[0])/255.0, float(c[1])/255.0, float(c[2])/255.0, float(c[3])/255.0 if len(c) > 3 else 1.0]

                child = AssemblyNode(
                    id=f"node_{node_name}",
                    name=str(node_name) if node_name else str(geom_name),
                    color=color,
                    matrix=matrix,
                    visible=True,
                    part_count=1
                )
                root_node.children.append(child)

            if len(root_node.children) == 0:
                # Single part scene fallback
                root_node.children.append(
                    AssemblyNode(id="part_0", name=root_name, visible=True, part_count=1)
                )

            return AssemblyTree(root=root_node, total_parts=max(1, len(root_node.children)))

        elif isinstance(loaded_obj, trimesh.Trimesh):
            # Check if mesh has disconnected bodies
            try:
                bodies = loaded_obj.split(only_watertight=False)
            except Exception:
                bodies = [loaded_obj]
                
            if len(bodies) > 1:
                root_node = AssemblyNode(
                    id="root",
                    name=root_name,
                    visible=True,
                    part_count=len(bodies)
                )
                for idx, body in enumerate(bodies):
                    root_node.children.append(
                        AssemblyNode(
                            id=f"body_{idx+1}",
                            name=f"{root_name}_Part_{idx+1}",
                            visible=True,
                            part_count=1
                        )
                    )
                return AssemblyTree(root=root_node, total_parts=len(bodies))
            else:
                root_node = AssemblyNode(
                    id="root",
                    name=root_name,
                    visible=True,
                    part_count=1,
                    children=[
                        AssemblyNode(id="part_1", name=root_name, visible=True, part_count=1)
                    ]
                )
                return AssemblyTree(root=root_node, total_parts=1)

        # Fallback default tree
        return AssemblyTree(
            root=AssemblyNode(id="root", name=root_name, visible=True, part_count=1, children=[
                AssemblyNode(id="part_1", name=root_name, visible=True, part_count=1)
            ]),
            total_parts=1
        )
