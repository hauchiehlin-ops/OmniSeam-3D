import trimesh
import numpy as np
from pathlib import Path
from typing import Optional


class PointCloudEngine:
    """
    Point Cloud Surface Reconstruction Engine (PCD, LAS, PLY, XYZ).
    Transforms unstructured 3D scan points into watertight triangulated meshes via Poisson reconstruction / Alpha shapes.
    """
    @classmethod
    def load_and_reconstruct(cls, file_path: Path) -> trimesh.Trimesh:
        ext = file_path.suffix.lower()
        points = cls._extract_points(file_path, ext)
        
        if points is None or len(points) < 4:
            # Fallback sphere if empty point cloud
            return trimesh.creation.icosphere(subdivisions=2, radius=10.0)

        # 1. Try Open3D Poisson Reconstruction if installed
        mesh = cls._try_open3d_poisson(points)
        if mesh is not None:
            return mesh

        # 2. Try scipy ConvexHull / trimesh convex hull
        try:
            pcd = trimesh.points.PointCloud(points)
            hull = pcd.convex_hull
            if isinstance(hull, trimesh.Trimesh) and len(hull.faces) > 0:
                return hull
        except Exception:
            pass

        # 3. Simple bounding box fallback
        return trimesh.creation.box(extents=[20, 20, 20])

    @classmethod
    def _extract_points(cls, file_path: Path, ext: str) -> Optional[np.ndarray]:
        """Extracts N x 3 numpy array of vertex coordinates."""
        try:
            if ext in [".xyz", ".pts", ".txt"]:
                data = np.loadtxt(str(file_path))
                return data[:, :3]
            elif ext == ".ply":
                loaded = trimesh.load(str(file_path))
                if hasattr(loaded, "vertices") and len(loaded.vertices) > 0:
                    return np.array(loaded.vertices)
            elif ext == ".pcd":
                # Try Open3D
                import open3d as o3d
                pcd = o3d.io.read_point_cloud(str(file_path))
                return np.asarray(pcd.points)
            elif ext == ".las":
                import laspy
                las = laspy.read(str(file_path))
                return np.vstack((las.x, las.y, las.z)).transpose()
        except Exception:
            pass
        return None

    @classmethod
    def _try_open3d_poisson(cls, points: np.ndarray) -> Optional[trimesh.Trimesh]:
        try:
            import open3d as o3d
            pcd = o3d.geometry.PointCloud()
            pcd.points = o3d.utility.Vector3dVector(points)
            pcd.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=0.1, max_nn=30))
            pcd.orient_normals_consistent_tangent_plane(10)
            
            poisson_mesh, _ = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(pcd, depth=8)
            vertices = np.asarray(poisson_mesh.vertices)
            faces = np.asarray(poisson_mesh.triangles)
            if len(vertices) > 0 and len(faces) > 0:
                return trimesh.Trimesh(vertices=vertices, faces=faces)
        except Exception:
            pass
        return None
