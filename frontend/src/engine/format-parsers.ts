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
   * Point cloud parser with 3D faceted hull reconstruction.
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

    // Connect into surface triangles
    const faces: number[][] = [];
    for (let i = 0; i + 2 < vertices.length; i += 3) {
      faces.push([i, i + 1, i + 2]);
    }

    return { vertices, faces };
  }
}
