import numpy as np
import trimesh
from typing import Dict, Any, List, Tuple
from backend.app.models.schemas import (
    GeometricMetrics,
    GeometricDefectInfo,
    BoundingBox,
    InspectResponse
)
from backend.app.i18n import get_text


class ModelAuditor:
    @staticmethod
    def compute_metrics(mesh: trimesh.Trimesh) -> GeometricMetrics:
        """Calculates precise geometric and topological metrics."""
        vertices_count = len(mesh.vertices)
        faces_count = len(mesh.faces)
        edges_count = len(mesh.edges_unique)
        
        # Safe volume calculation
        try:
            volume = float(mesh.volume) if mesh.is_watertight and mesh.is_volume else 0.0
            if np.isnan(volume) or np.isinf(volume):
                volume = 0.0
        except Exception:
            volume = 0.0

        try:
            surface_area = float(mesh.area)
            if np.isnan(surface_area) or np.isinf(surface_area):
                surface_area = 0.0
        except Exception:
            surface_area = 0.0

        bounds = mesh.bounds
        if bounds is not None and len(bounds) == 2:
            min_pt = bounds[0].tolist()
            max_pt = bounds[1].tolist()
            size = (bounds[1] - bounds[0]).tolist()
        else:
            min_pt, max_pt, size = [0.0, 0.0, 0.0], [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]

        is_watertight = bool(mesh.is_watertight)
        euler_number = int(mesh.euler_number)
        
        try:
            components = len(mesh.split(only_watertight=False))
        except Exception:
            components = 1

        return GeometricMetrics(
            vertices_count=vertices_count,
            faces_count=faces_count,
            edges_count=edges_count,
            volume=volume,
            surface_area=surface_area,
            bounding_box=BoundingBox(min=min_pt, max=max_pt, size=size),
            is_watertight=is_watertight,
            euler_number=euler_number,
            connected_components=max(1, components)
        )

    @staticmethod
    def detect_defects(mesh: trimesh.Trimesh) -> GeometricDefectInfo:
        """Analyzes open boundaries, non-manifold topology, degeneracies, and collects 3D defect coordinate points."""
        # 1. Open boundary loops (holes)
        hole_boundary_points: List[List[float]] = []
        open_loops_count = 0
        try:
            # trimesh edges on borders
            outline_edges = mesh.outline()
            if outline_edges is not None and len(outline_edges.entities) > 0:
                open_loops_count = len(outline_edges.entities)
                # Sample points on outline
                if len(outline_edges.vertices) > 0:
                    pts = outline_edges.vertices[:200]  # cap to 200 points for smooth frontend payload
                    hole_boundary_points = pts.tolist()
            elif not mesh.is_watertight:
                # Find edges with only 1 adjacent face
                unique_edges, counts = np.unique(mesh.edges_sorted, axis=0, return_counts=True)
                boundary_edges = unique_edges[counts == 1]
                if len(boundary_edges) > 0:
                    open_loops_count = max(1, len(boundary_edges) // 10)
                    boundary_v_idx = np.unique(boundary_edges)[:200]
                    hole_boundary_points = mesh.vertices[boundary_v_idx].tolist()
        except Exception:
            open_loops_count = 0 if mesh.is_watertight else 1

        # 2. Non-manifold edges (edges with > 2 adjacent faces)
        non_manifold_edges_count = 0
        non_manifold_points: List[List[float]] = []
        try:
            unique_edges, counts = np.unique(mesh.edges_sorted, axis=0, return_counts=True)
            non_manifold_edges = unique_edges[counts > 2]
            non_manifold_edges_count = int(len(non_manifold_edges))
            if non_manifold_edges_count > 0:
                nm_v_idx = np.unique(non_manifold_edges)[:200]
                non_manifold_points = mesh.vertices[nm_v_idx].tolist()
        except Exception:
            non_manifold_edges_count = 0

        # 3. Non-manifold vertices
        non_manifold_vertices_count = 0
        try:
            if not mesh.is_winding_consistent:
                non_manifold_vertices_count += 1
        except Exception:
            pass

        # 4. Degenerate faces (zero area)
        degenerate_faces_count = 0
        try:
            face_areas = mesh.area_faces
            degenerate_faces_count = int(np.sum(face_areas <= 1e-9))
        except Exception:
            pass

        # 5. Duplicate faces
        duplicate_faces_count = 0
        try:
            faces_sorted = np.sort(mesh.faces, axis=1)
            _, counts = np.unique(faces_sorted, axis=0, return_counts=True)
            duplicate_faces_count = int(np.sum(counts > 1))
        except Exception:
            pass

        # 6. Unreferenced loose vertices
        unreferenced_vertices_count = 0
        try:
            referenced = np.unique(mesh.faces)
            unreferenced_vertices_count = int(len(mesh.vertices) - len(referenced))
        except Exception:
            pass

        # 7. Inverted normals
        inverted_normals_count = 0
        try:
            if not mesh.is_winding_consistent:
                inverted_normals_count = 1
        except Exception:
            pass

        return GeometricDefectInfo(
            open_boundary_loops=open_loops_count,
            non_manifold_edges=non_manifold_edges_count,
            non_manifold_vertices=non_manifold_vertices_count,
            degenerate_faces=degenerate_faces_count,
            duplicate_faces=duplicate_faces_count,
            unreferenced_vertices=unreferenced_vertices_count,
            inverted_normals_count=inverted_normals_count,
            hole_boundary_points=hole_boundary_points,
            non_manifold_points=non_manifold_points
        )

    @classmethod
    def calculate_health_score(cls, metrics: GeometricMetrics, defects: GeometricDefectInfo) -> int:
        """Calculates an intuitive 0-100 mesh quality score."""
        score = 100
        if not metrics.is_watertight:
            score -= 30
        if defects.open_boundary_loops > 0:
            score -= min(30, defects.open_boundary_loops * 5)
        if defects.non_manifold_edges > 0:
            score -= min(25, defects.non_manifold_edges * 5)
        if defects.degenerate_faces > 0:
            score -= min(15, defects.degenerate_faces)
        if defects.duplicate_faces > 0:
            score -= min(10, defects.duplicate_faces)
        if defects.unreferenced_vertices > 0:
            score -= 5
        return max(0, min(100, score))

    @classmethod
    def generate_suggestions(cls, defects: GeometricDefectInfo, is_watertight: bool, lang: str = "en") -> List[Dict[str, str]]:
        suggestions = []
        if not is_watertight or defects.open_boundary_loops > 0:
            suggestions.append({
                "action": "fill_holes",
                "label": get_text("suggestions.fill_holes", lang)
            })
        if defects.non_manifold_edges > 0 or defects.non_manifold_vertices > 0:
            suggestions.append({
                "action": "fix_non_manifold",
                "label": get_text("suggestions.fix_non_manifold", lang)
            })
        if defects.inverted_normals_count > 0:
            suggestions.append({
                "action": "unify_normals",
                "label": get_text("suggestions.unify_normals", lang)
            })
        if defects.degenerate_faces > 0 or defects.duplicate_faces > 0:
            suggestions.append({
                "action": "remove_degenerate",
                "label": get_text("suggestions.sew_cad", lang)
            })
        return suggestions

    @classmethod
    def audit_mesh(cls, mesh: trimesh.Trimesh, filename: str = "", file_size: int = 0, lang: str = "en") -> InspectResponse:
        metrics = cls.compute_metrics(mesh)
        defects = cls.detect_defects(mesh)
        health_score = cls.calculate_health_score(metrics, defects)
        suggestions = cls.generate_suggestions(defects, metrics.is_watertight, lang)
        
        ext = filename.split(".")[-1].lower() if "." in filename else "mesh"
        return InspectResponse(
            filename=filename,
            file_format=ext,
            file_size_bytes=file_size,
            metrics=metrics,
            defects=defects,
            is_watertight=metrics.is_watertight,
            health_score=health_score,
            suggested_actions=suggestions
        )
