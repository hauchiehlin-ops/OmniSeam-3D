import { MeshGeometry } from './geometric-kernel';

export class FormatParsers {
  /**
   * Main entry point to parse any 3D file into MeshGeometry directly in the browser.
   */
  static async parseFile(file: File): Promise<MeshGeometry> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const buffer = await file.arrayBuffer();

    switch (ext) {
      case 'stl':
        return this.parseSTL(buffer);
      case 'obj':
        return this.parseOBJ(new TextDecoder().decode(buffer));
      case 'ply':
        return this.parsePLY(buffer);
      case 'xyz':
      case 'pcd':
      case 'pts':
        return this.parsePointCloud(new TextDecoder().decode(buffer));
      default:
        // Try STL first, then OBJ fallback
        try {
          return this.parseSTL(buffer);
        } catch {
          return this.parseOBJ(new TextDecoder().decode(buffer));
        }
    }
  }

  /**
   * High-speed binary & ASCII STL parser.
   */
  static parseSTL(buffer: ArrayBuffer): MeshGeometry {
    const dataView = new DataView(buffer);
    
    // Check if ASCII or Binary
    const isBinary = buffer.byteLength > 84 && dataView.getUint32(80, true) * 50 + 84 === buffer.byteLength;

    if (isBinary) {
      const triangleCount = dataView.getUint32(80, true);
      const vertices: number[][] = [];
      const faces: number[][] = [];

      let offset = 84;
      for (let i = 0; i < triangleCount; i++) {
        // Skip normal (12 bytes)
        offset += 12;

        // 3 Vertices (36 bytes)
        const v0 = [dataView.getFloat32(offset, true), dataView.getFloat32(offset + 4, true), dataView.getFloat32(offset + 8, true)];
        offset += 12;
        const v1 = [dataView.getFloat32(offset, true), dataView.getFloat32(offset + 4, true), dataView.getFloat32(offset + 8, true)];
        offset += 12;
        const v2 = [dataView.getFloat32(offset, true), dataView.getFloat32(offset + 4, true), dataView.getFloat32(offset + 8, true)];
        offset += 12;

        // Skip attribute byte count (2 bytes)
        offset += 2;

        const baseIdx = vertices.length;
        vertices.push(v0, v1, v2);
        faces.push([baseIdx, baseIdx + 1, baseIdx + 2]);
      }
      return { vertices, faces };
    } else {
      // ASCII STL
      const text = new TextDecoder().decode(buffer);
      const vertices: number[][] = [];
      const faces: number[][] = [];
      const vertexRegex = /vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/g;

      let match;
      let currentTri: number[] = [];
      while ((match = vertexRegex.exec(text)) !== null) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        const z = parseFloat(match[3]);
        const idx = vertices.length;
        vertices.push([x, y, z]);
        currentTri.push(idx);

        if (currentTri.length === 3) {
          faces.push([...currentTri]);
          currentTri = [];
        }
      }
      return { vertices, faces };
    }
  }

  /**
   * Fast Wavefront OBJ parser.
   */
  static parseOBJ(text: string): MeshGeometry {
    const lines = text.split('\n');
    const vertices: number[][] = [];
    const faces: number[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('v ')) {
        const parts = line.split(/\s+/).slice(1).map(Number);
        if (parts.length >= 3 && !isNaN(parts[0])) {
          vertices.push([parts[0], parts[1], parts[2]]);
        }
      } else if (line.startsWith('f ')) {
        const parts = line.split(/\s+/).slice(1);
        const faceIndices: number[] = [];
        for (const part of parts) {
          const vIdx = parseInt(part.split('/')[0], 10);
          if (!isNaN(vIdx)) {
            // 1-indexed to 0-indexed (supports negative relative indices)
            faceIndices.push(vIdx > 0 ? vIdx - 1 : vertices.length + vIdx);
          }
        }
        if (faceIndices.length === 3) {
          faces.push(faceIndices);
        } else if (faceIndices.length === 4) {
          // Quad -> 2 Triangles
          faces.push([faceIndices[0], faceIndices[1], faceIndices[2]]);
          faces.push([faceIndices[0], faceIndices[2], faceIndices[3]]);
        }
      }
    }
    return { vertices, faces };
  }

  /**
   * PLY (Polygon File Format) parser.
   */
  static parsePLY(buffer: ArrayBuffer): MeshGeometry {
    const text = new TextDecoder().decode(buffer.slice(0, 1000));
    const lines = text.split('\n');

    let vertexCount = 0;
    let faceCount = 0;
    let headerEndOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('element vertex')) {
        vertexCount = parseInt(line.split(/\s+/)[2], 10);
      } else if (line.startsWith('element face')) {
        faceCount = parseInt(line.split(/\s+/)[2], 10);
      } else if (line === 'end_header') {
        headerEndOffset = new TextEncoder().encode(lines.slice(0, i + 1).join('\n') + '\n').length;
        break;
      }
    }

    if (vertexCount === 0) return { vertices: [], faces: [] };

    // Parse ASCII PLY
    const fullText = new TextDecoder().decode(buffer);
    const contentLines = fullText.slice(fullText.indexOf('end_header') + 10).trim().split('\n');

    const vertices: number[][] = [];
    const faces: number[][] = [];

    for (let i = 0; i < vertexCount && i < contentLines.length; i++) {
      const parts = contentLines[i].trim().split(/\s+/).map(Number);
      if (parts.length >= 3) {
        vertices.push([parts[0], parts[1], parts[2]]);
      }
    }

    for (let i = vertexCount; i < vertexCount + faceCount && i < contentLines.length; i++) {
      const parts = contentLines[i].trim().split(/\s+/).map(Number);
      if (parts[0] === 3) {
        faces.push([parts[1], parts[2], parts[3]]);
      }
    }

    return { vertices, faces };
  }

  /**
   * Point cloud parser with true 3D convex hull surface reconstruction.
   */
  static parsePointCloud(text: string): MeshGeometry {
    const lines = text.split('\n');
    const vertices: number[][] = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/).map(Number);
      if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        vertices.push([parts[0], parts[1], parts[2]]);
      }
    }

    if (vertices.length < 4) {
      return { vertices, faces: [] };
    }

    const faces = this.computeConvexHull3D(vertices);
    return { vertices, faces };
  }

  /**
   * Computes a 3D Convex Hull triangulated surface for an arbitrary set of 3D points.
   */
  private static computeConvexHull3D(pts: number[][]): number[][] {
    const n = pts.length;
    if (n < 4) return [];

    // Find 4 non-coplanar points to form an initial tetrahedron
    let p0 = 0;
    // Find point with max distance from p0
    let p1 = 1;
    let maxDist = 0;
    for (let i = 1; i < n; i++) {
      const d = distSq(pts[p0], pts[i]);
      if (d > maxDist) { maxDist = d; p1 = i; }
    }
    if (maxDist < 1e-8) return [];

    // Find p2 maximizing triangle area with p0, p1
    let p2 = -1;
    let maxArea = 0;
    for (let i = 0; i < n; i++) {
      if (i === p0 || i === p1) continue;
      const c = cross(sub(pts[p1], pts[p0]), sub(pts[i], pts[p0]));
      const a = normSq(c);
      if (a > maxArea) { maxArea = a; p2 = i; }
    }
    if (p2 === -1 || maxArea < 1e-8) return [];

    // Find p3 maximizing volume of tetrahedron
    const normal = cross(sub(pts[p1], pts[p0]), sub(pts[p2], pts[p0]));
    let p3 = -1;
    let maxVol = 0;
    for (let i = 0; i < n; i++) {
      if (i === p0 || i === p1 || i === p2) continue;
      const v = Math.abs(dot(normal, sub(pts[i], pts[p0])));
      if (v > maxVol) { maxVol = v; p3 = i; }
    }
    if (p3 === -1 || maxVol < 1e-8) return [];

    // Orient initial 4 faces
    type Face = [number, number, number];
    let faces: Face[] = [];
    const addInitialFace = (a: number, b: number, c: number, oppositePt: number[]) => {
      const fn = cross(sub(pts[b], pts[a]), sub(pts[c], pts[a]));
      if (dot(fn, sub(oppositePt, pts[a])) > 0) {
        faces.push([a, c, b]); // flip normal
      } else {
        faces.push([a, b, c]);
      }
    };

    addInitialFace(p0, p1, p2, pts[p3]);
    addInitialFace(p0, p1, p3, pts[p2]);
    addInitialFace(p0, p2, p3, pts[p1]);
    addInitialFace(p1, p2, p3, pts[p0]);

    // Incremental hull: add remaining points
    for (let i = 0; i < n; i++) {
      if (i === p0 || i === p1 || i === p2 || i === p3) continue;
      const pt = pts[i];

      const visible: boolean[] = [];
      let anyVisible = false;
      for (let f = 0; f < faces.length; f++) {
        const [a, b, c] = faces[f];
        const fn = cross(sub(pts[b], pts[a]), sub(pts[c], pts[a]));
        const isVis = dot(fn, sub(pt, pts[a])) > 1e-7;
        visible.push(isVis);
        if (isVis) anyVisible = true;
      }

      if (!anyVisible) continue; // Inside hull

      // Find horizon edges
      const edgeCount = new Map<string, { u: number; v: number; count: number }>();
      for (let f = 0; f < faces.length; f++) {
        if (!visible[f]) continue;
        const [a, b, c] = faces[f];
        const edges = [[a, b], [b, c], [c, a]];
        for (const [u, v] of edges) {
          const key = u < v ? `${u}_${v}` : `${v}_${u}`;
          const cur = edgeCount.get(key);
          if (cur) {
            cur.count++;
          } else {
            edgeCount.set(key, { u, v, count: 1 });
          }
        }
      }

      // Retain only non-visible faces
      faces = faces.filter((_, idx) => !visible[idx]);

      // Connect horizon edges to new point i
      for (const edge of edgeCount.values()) {
        if (edge.count === 1) {
          // Find orientation matching the deleted visible face
          faces.push([edge.u, edge.v, i]);
        }
      }
    }

    return faces;
  }
}

function sub(a: number[], b: number[]): number[] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function dot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: number[], b: number[]): number[] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function normSq(a: number[]): number {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
}
function distSq(a: number[], b: number[]): number {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}
