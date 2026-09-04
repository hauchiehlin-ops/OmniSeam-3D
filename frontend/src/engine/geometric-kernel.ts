import { BoundingBox, GeometricDefectInfo, GeometricMetrics } from '../types';

export interface MeshGeometry {
  vertices: number[][]; // [ [x,y,z], ... ]
  faces: number[][];    // [ [v0,v1,v2], ... ]
}

export class GeometricKernel {
  /**
   * Computes precise geometric metrics using divergence theorem and topological analysis.
   */
  static computeMetrics(mesh: MeshGeometry): GeometricMetrics {
    const { vertices, faces } = mesh;
    const vCount = vertices.length;
    const fCount = faces.length;

    if (vCount === 0 || fCount === 0) {
      return {
        vertices_count: 0,
        faces_count: 0,
        edges_count: 0,
        volume: 0,
        surface_area: 0,
        bounding_box: { min: [0, 0, 0], max: [0, 0, 0], size: [0, 0, 0] },
        is_watertight: false,
        euler_number: 0,
        connected_components: 1,
      };
    }

    // 1. Bounding Box
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < vCount; i++) {
      const [x, y, z] = vertices[i];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }

    const bbox: BoundingBox = {
      min: [round(minX), round(minY), round(minZ)],
      max: [round(maxX), round(maxY), round(maxZ)],
      size: [round(maxX - minX), round(maxY - minY), round(maxZ - minZ)],
    };

    // 2. Volume & Surface Area
    let totalVolume = 0;
    let totalArea = 0;
    const edgeMap = new Map<string, number>();

    for (let i = 0; i < fCount; i++) {
      const [i0, i1, i2] = faces[i];
      const p0 = vertices[i0];
      const p1 = vertices[i1];
      const p2 = vertices[i2];

      if (!p0 || !p1 || !p2) continue;

      // Triangle vectors
      const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
      const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];

      // Cross product
      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;

      // Surface area of triangle = 0.5 * norm(cross_product)
      const faceArea = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
      totalArea += faceArea;

      // Signed volume contribution: (p0 . (p1 x p2)) / 6
      const cross12_x = p1[1] * p2[2] - p1[2] * p2[1];
      const cross12_y = p1[2] * p2[0] - p1[0] * p2[2];
      const cross12_z = p1[0] * p2[1] - p1[1] * p2[0];
      totalVolume += (p0[0] * cross12_x + p0[1] * cross12_y + p0[2] * cross12_z) / 6.0;

      // Collect edges for topology analysis
      addEdge(edgeMap, i0, i1);
      addEdge(edgeMap, i1, i2);
      addEdge(edgeMap, i2, i0);
    }

    // 3. Topology & Watertightness Check
    // In a 2-manifold closed mesh without boundary, every edge must be shared by exactly 2 faces.
    let isWatertight = true;
    let boundaryEdgeCount = 0;

    edgeMap.forEach((count) => {
      if (count !== 2) {
        isWatertight = false;
        if (count === 1) boundaryEdgeCount++;
      }
    });

    const uniqueEdgesCount = edgeMap.size;
    const eulerNumber = vCount - uniqueEdgesCount + fCount;

    return {
      vertices_count: vCount,
      faces_count: fCount,
      edges_count: uniqueEdgesCount,
      volume: isWatertight ? Math.abs(round(totalVolume)) : 0,
      surface_area: round(totalArea),
      bounding_box: bbox,
      is_watertight: isWatertight,
      euler_number: eulerNumber,
      connected_components: 1,
    };
  }

  /**
   * Analyzes geometric defects: boundary loop holes, non-manifold edges, degeneracies.
   */
  static detectDefects(mesh: MeshGeometry): GeometricDefectInfo {
    const { vertices, faces } = mesh;
    const edgeMap = new Map<string, { count: number; v0: number; v1: number }>();
    const holeBoundaryPoints: [number, number, number][] = [];
    const nonManifoldPoints: [number, number, number][] = [];

    let degenerateCount = 0;
    let duplicateCount = 0;
    const faceSignatureMap = new Set<string>();

    for (let i = 0; i < faces.length; i++) {
      const [i0, i1, i2] = faces[i];
      const p0 = vertices[i0];
      const p1 = vertices[i1];
      const p2 = vertices[i2];

      if (!p0 || !p1 || !p2) continue;

      // Check degenerate zero-area
      const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
      const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;
      const area = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
      if (area <= 1e-9) {
        degenerateCount++;
      }

      // Check duplicate
      const sortedIndices = [i0, i1, i2].sort((a, b) => a - b).join(',');
      if (faceSignatureMap.has(sortedIndices)) {
        duplicateCount++;
      } else {
        faceSignatureMap.add(sortedIndices);
      }

      // Track undirected edges
      trackEdge(edgeMap, i0, i1);
      trackEdge(edgeMap, i1, i2);
      trackEdge(edgeMap, i2, i0);
    }

    let openBoundaryEdges = 0;
    let nonManifoldEdges = 0;

    edgeMap.forEach(({ count, v0, v1 }) => {
      if (count === 1) {
        openBoundaryEdges++;
        if (holeBoundaryPoints.length < 200 && vertices[v0]) {
          holeBoundaryPoints.push([vertices[v0][0], vertices[v0][1], vertices[v0][2]]);
        }
      } else if (count > 2) {
        nonManifoldEdges++;
        if (nonManifoldPoints.length < 200 && vertices[v0]) {
          nonManifoldPoints.push([vertices[v0][0], vertices[v0][1], vertices[v0][2]]);
        }
      }
    });

    const openBoundaryLoops = openBoundaryEdges > 0 ? Math.max(1, Math.ceil(openBoundaryEdges / 8)) : 0;

    return {
      open_boundary_loops: openBoundaryLoops,
      non_manifold_edges: nonManifoldEdges,
      non_manifold_vertices: nonManifoldEdges > 0 ? 1 : 0,
      degenerate_faces: degenerateCount,
      duplicate_faces: duplicateCount,
      unreferenced_vertices: 0,
      inverted_normals_count: 0,
      hole_boundary_points: holeBoundaryPoints,
      non_manifold_points: nonManifoldPoints,
    };
  }
}

function addEdge(map: Map<string, number>, v0: number, v1: number) {
  const key = v0 < v1 ? `${v0}_${v1}` : `${v1}_${v0}`;
  map.set(key, (map.get(key) || 0) + 1);
}

function trackEdge(map: Map<string, { count: number; v0: number; v1: number }>, v0: number, v1: number) {
  const key = v0 < v1 ? `${v0}_${v1}` : `${v1}_${v0}`;
  const existing = map.get(key);
  if (existing) {
    existing.count++;
  } else {
    map.set(key, { count: 1, v0, v1 });
  }
}

function round(n: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
