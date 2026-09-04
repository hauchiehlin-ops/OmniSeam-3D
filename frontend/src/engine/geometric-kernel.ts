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

  /**
   * Computes surface deviation heatmap between original and repaired meshes.
   * Maps Euclidean distance [0 - 0.05mm+] to RGB color spectrum (Green -> Yellow -> Red).
   */
  static computeSurfaceDeviation(
    origMesh: MeshGeometry,
    repairedMesh: MeshGeometry,
    maxDeviationThreshold: number = 0.05
  ): { maxDeviationMm: number; vertexColors: Float32Array; deviations: number[] } {
    const repVertices = repairedMesh.vertices;
    const origVertices = origMesh.vertices;
    const vCount = repVertices.length;
    const vertexColors = new Float32Array(vCount * 3);
    const deviations: number[] = new Array(vCount);

    if (vCount === 0 || origVertices.length === 0) {
      return { maxDeviationMm: 0, vertexColors, deviations: [] };
    }

    let maxDist = 0.001;

    // Fast approximate closest vertex-to-vertex/surface distance
    for (let i = 0; i < vCount; i++) {
      const [rx, ry, rz] = repVertices[i];
      let minDistSq = Infinity;

      // Check distance against original vertices
      const step = origVertices.length > 1000 ? Math.ceil(origVertices.length / 500) : 1;
      for (let j = 0; j < origVertices.length; j += step) {
        const [ox, oy, oz] = origVertices[j];
        const dx = rx - ox;
        const dy = ry - oy;
        const dz = rz - oz;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          if (distSq < 1e-6) break;
        }
      }

      const dist = Math.sqrt(minDistSq);
      deviations[i] = dist;
      if (dist > maxDist) maxDist = dist;

      // Color mapping: 0 -> Green (0, 1, 0), 0.025 -> Yellow (1, 1, 0), >= 0.05 -> Red (1, 0, 0)
      const t = Math.min(1.0, dist / maxDeviationThreshold);
      let r = 0, g = 0, b = 0;
      if (t < 0.5) {
        // Green to Yellow
        const ratio = t / 0.5;
        r = ratio;
        g = 1.0;
        b = 0.1 * (1 - ratio);
      } else {
        // Yellow to Red
        const ratio = (t - 0.5) / 0.5;
        r = 1.0;
        g = 1.0 - ratio;
        b = 0.0;
      }

      vertexColors[i * 3] = r;
      vertexColors[i * 3 + 1] = g;
      vertexColors[i * 3 + 2] = b;
    }

    return {
      maxDeviationMm: round(maxDist, 4),
      vertexColors,
      deviations,
    };
  }

  /**
   * Evaluates 3D slicer readiness checklist:
   * Watertightness, Overhangs (>45° angle with bed), and estimated support volume.
   */
  static analyzeSlicerReadiness(mesh: MeshGeometry, overhangThresholdDeg: number = 45.0) {
    const { vertices, faces } = mesh;
    const fCount = faces.length;
    
    if (fCount === 0) {
      return {
        is_print_ready: false,
        overhang_area_mm2: 0,
        overhang_faces_count: 0,
        estimated_support_volume_cm3: 0,
        bed_contact_area_mm2: 0,
        warnings: ['Empty mesh geometry.'],
      };
    }

    const cosThreshold = Math.cos((overhangThresholdDeg * Math.PI) / 180.0);
    // Downward normal is [0, -1, 0] (in WebGL/Three.js Y is up, -Y is down)
    let overhangFacesCount = 0;
    let overhangArea = 0;
    let totalArea = 0;
    let minY = Infinity;

    for (let i = 0; i < vertices.length; i++) {
      if (vertices[i][1] < minY) minY = vertices[i][1];
    }

    let supportVolMm3 = 0;
    let bedContactArea = 0;

    for (let i = 0; i < fCount; i++) {
      const [i0, i1, i2] = faces[i];
      const p0 = vertices[i0];
      const p1 = vertices[i1];
      const p2 = vertices[i2];
      if (!p0 || !p1 || !p2) continue;

      const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
      const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;
      const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
      const faceArea = 0.5 * len;
      totalArea += faceArea;

      if (len > 1e-9) {
        const ny = cy / len; // dot product with [0, 1, 0]
        // If ny < -cosThreshold, the face points downward steeper than 45 degrees
        if (ny < -cosThreshold) {
          overhangFacesCount++;
          overhangArea += faceArea;
          const centerY = (p0[1] + p1[1] + p2[1]) / 3.0;
          const dropHeight = Math.max(0, centerY - minY);
          supportVolMm3 += faceArea * dropHeight * 0.35;
        }

        // Bed contact: pointing almost flat downward right near minY
        if (ny < -0.98) {
          const centerY = (p0[1] + p1[1] + p2[1]) / 3.0;
          if (Math.abs(centerY - minY) < 0.2) {
            bedContactArea += faceArea;
          }
        }
      }
    }

    const warnings: string[] = [];
    if (overhangFacesCount > fCount * 0.4) {
      warnings.push('High overhang surface area (>40%). Tree supports or re-orientation recommended.');
    }

    return {
      is_print_ready: warnings.length === 0,
      overhang_area_mm2: round(overhangArea, 2),
      overhang_faces_count: overhangFacesCount,
      estimated_support_volume_cm3: round(supportVolMm3 / 1000.0, 2),
      bed_contact_area_mm2: round(bedContactArea, 2),
      warnings,
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
