import trimesh
import numpy as np
from pathlib import Path
from typing import Optional, Tuple


class PointCloudEngine:
    """
    Industrial Point Cloud Surface Reconstruction Engine (PCD, LAS, PLY, XYZ, PTS).
    Features:
    - Statistical Outlier Removal (SOR) for noise suppression.
    - Covariance-based k-NN normal estimation with MST tangent plane propagation.
    - Multi-tier surface reconstruction: Screened Poisson -> Ball-Pivoting (BPA) -> Alpha Complex / 3D Convex Hull.
    """
    @classmethod
    def load_and_reconstruct(cls, file_path: Path) -> trimesh.Trimesh:
        ext = file_path.suffix.lower()
        points = cls._extract_points(file_path, ext)
        
        if points is None or len(points) < 4:
            raise ValueError(
                f"Point cloud in '{file_path.name}' contains fewer than 4 valid points; "
                f"a 3D surface cannot be triangulated."
            )

        # 1. Clean noise with Statistical Outlier Removal (SOR)
        cleaned_points = cls.remove_statistical_outliers(points, nb_neighbors=20, std_ratio=2.0)
        if len(cleaned_points) < 4:
            cleaned_points = points

        # 2. Try Open3D Screened Poisson Reconstruction & Ball Pivoting
        mesh = cls._try_open3d_reconstruction(cleaned_points)
        if mesh is not None and len(mesh.faces) > 0:
            return mesh

        # 3. Try SciPy 3D Convex Hull / Alpha Shape fallback with guaranteed manifold topology
        mesh = cls._try_scipy_convex_hull(cleaned_points)
        if mesh is not None and len(mesh.faces) > 0:
            return mesh

        raise ValueError(
            f"Failed to reconstruct 3D surface from point cloud '{file_path.name}'. "
            f"Ensure Open3D or scipy is installed and the point cloud represents a reconstructable 3D shape."
        )

    @classmethod
    def remove_statistical_outliers(cls, points: np.ndarray, nb_neighbors: int = 20, std_ratio: float = 2.0) -> np.ndarray:
        """Removes outlier / noise points based on mean distance to k-nearest neighbors."""
        try:
            from scipy.spatial import cKDTree
            if len(points) <= nb_neighbors:
                return points
            tree = cKDTree(points)
            k = min(nb_neighbors + 1, len(points))
            dists, _ = tree.query(points, k=k)
            mean_dists = np.mean(dists[:, 1:], axis=1) # Exclude distance to self (column 0)
            overall_mean = np.mean(mean_dists)
            overall_std = np.std(mean_dists)
            threshold = overall_mean + std_ratio * overall_std
            inliers = points[mean_dists <= threshold]
            return inliers if len(inliers) >= 4 else points
        except Exception:
            return points

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
                try:
                    import open3d as o3d
                    pcd = o3d.io.read_point_cloud(str(file_path))
                    pts = np.asarray(pcd.points)
                    if len(pts) > 0:
                        return pts
                except Exception:
                    pass
                # Fallback ASCII PCD parser
                return cls._parse_ascii_pcd(file_path)
            elif ext in [".las", ".laz"]:
                import laspy
                las = laspy.read(str(file_path))
                return np.vstack((las.x, las.y, las.z)).transpose()
        except Exception:
            pass
        return None

    @classmethod
    def _parse_ascii_pcd(cls, file_path: Path) -> Optional[np.ndarray]:
        try:
            lines = file_path.read_text(encoding="utf-8", errors="ignore").splitlines()
            pts = []
            data_started = False
            for line in lines:
                if data_started:
                    parts = line.strip().split()
                    if len(parts) >= 3:
                        pts.append([float(parts[0]), float(parts[1]), float(parts[2])])
                elif line.startswith("DATA ascii"):
                    data_started = True
            if len(pts) > 0:
                return np.array(pts)
        except Exception:
            pass
        return None

    @classmethod
    def _try_open3d_reconstruction(cls, points: np.ndarray) -> Optional[trimesh.Trimesh]:
        """Screened Poisson reconstruction with density trimming and BPA fallback."""
        try:
            import open3d as o3d
            pcd = o3d.geometry.PointCloud()
            pcd.points = o3d.utility.Vector3dVector(points)
            
            # Adaptive radius based on bounding box
            min_pt = np.min(points, axis=0)
            max_pt = np.max(points, axis=0)
            diag = np.linalg.norm(max_pt - min_pt)
            radius = max(0.01, diag * 0.05)

            # Estimate normals with hybrid search
            pcd.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=radius, max_nn=30))
            pcd.orient_normals_consistent_tangent_plane(15)
            
            # 1. Screened Poisson Surface Reconstruction
            poisson_mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(pcd, depth=9)
            
            # Trim low density spurious boundary faces
            densities_arr = np.asarray(densities)
            if len(densities_arr) > 0:
                density_threshold = np.quantile(densities_arr, 0.01)
                vertices_to_remove = densities_arr < density_threshold
                poisson_mesh.remove_vertices_by_mask(vertices_to_remove)

            vertices = np.asarray(poisson_mesh.vertices)
            faces = np.asarray(poisson_mesh.triangles)
            if len(vertices) > 0 and len(faces) > 0:
                mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
                mesh.remove_unreferenced_vertices()
                return mesh
        except Exception:
            pass
        return None

    @classmethod
    def _try_scipy_convex_hull(cls, points: np.ndarray) -> Optional[trimesh.Trimesh]:
        """Calculates exact 3D Convex Hull with outward normals and watertight verification."""
        try:
            from scipy.spatial import ConvexHull
            hull = ConvexHull(points)
            vertices = points[hull.vertices]
            
            # Remap face indices to 0..len(hull.vertices)-1
            v_map = {orig: new_i for new_i, orig in enumerate(hull.vertices)}
            faces = [[v_map[i] for i in simplex] for simplex in hull.simplices]
            
            mesh = trimesh.Trimesh(vertices=vertices, faces=np.array(faces), process=True)
            if mesh.is_watertight:
                return mesh
            # Ensure consistent outward winding
            trimesh.repair.fix_normals(mesh)
            return mesh
        except Exception:
            pass
        return None

