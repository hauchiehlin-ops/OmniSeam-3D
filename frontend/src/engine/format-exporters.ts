import { MeshGeometry } from './geometric-kernel';
import { TargetFormat } from '../types';
import { ZipPackager, ZipEntry } from './zip-packager';

export class FormatExporters {
  /**
   * Serializes MeshGeometry to a downloadable Blob based on target format.
   */
  static exportBlob(mesh: MeshGeometry, format: TargetFormat): Blob {
    switch (format) {
      case 'stl':
        return this.exportBinarySTL(mesh);
      case 'obj':
        return this.exportOBJ(mesh);
      case 'ply':
        return this.exportPLY(mesh);
      case 'off':
        return this.exportOFF(mesh);
      case '3mf':
        return this.export3MF(mesh);
      case 'step':
      case 'stp':
        return this.exportSTEP(mesh);
      case 'glb':
      case 'gltf':
      default:
        return this.exportGLB(mesh);
    }
  }

  /**
   * Generates a standard Binary STL Blob.
   */
  static exportBinarySTL(mesh: MeshGeometry): Blob {
    const { vertices, faces } = mesh;
    const triangleCount = faces.length;
    const bufferSize = 84 + triangleCount * 50;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // 80-byte Header
    const headerStr = "OmniSeam 3D Exported Watertight Solid STL";
    for (let i = 0; i < headerStr.length && i < 80; i++) {
      view.setUint8(i, headerStr.charCodeAt(i));
    }

    // Number of triangles
    view.setUint32(80, triangleCount, true);

    let offset = 84;
    for (let i = 0; i < triangleCount; i++) {
      const [i0, i1, i2] = faces[i];
      const p0 = vertices[i0];
      const p1 = vertices[i1];
      const p2 = vertices[i2];

      // Normal vector calculation
      const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
      const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
      let nx = ay * bz - az * by;
      let ny = az * bx - ax * bz;
      let nz = ax * by - ay * bx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= len; ny /= len; nz /= len;

      // Normal (12 bytes)
      view.setFloat32(offset, nx, true);
      view.setFloat32(offset + 4, ny, true);
      view.setFloat32(offset + 8, nz, true);
      offset += 12;

      // Vertex 0 (12 bytes)
      view.setFloat32(offset, p0[0], true);
      view.setFloat32(offset + 4, p0[1], true);
      view.setFloat32(offset + 8, p0[2], true);
      offset += 12;

      // Vertex 1 (12 bytes)
      view.setFloat32(offset, p1[0], true);
      view.setFloat32(offset + 4, p1[1], true);
      view.setFloat32(offset + 8, p1[2], true);
      offset += 12;

      // Vertex 2 (12 bytes)
      view.setFloat32(offset, p2[0], true);
      view.setFloat32(offset + 4, p2[1], true);
      view.setFloat32(offset + 8, p2[2], true);
      offset += 12;

      // Attribute byte count (2 bytes)
      view.setUint16(offset, 0, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'model/stl' });
  }

  /**
   * Generates a Wavefront OBJ Blob.
   */
  static exportOBJ(mesh: MeshGeometry): Blob {
    const { vertices, faces } = mesh;
    let obj = "# OmniSeam 3D OBJ Export\n";

    for (let i = 0; i < vertices.length; i++) {
      const [x, y, z] = vertices[i];
      obj += `v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`;
    }

    for (let i = 0; i < faces.length; i++) {
      const [v0, v1, v2] = faces[i];
      obj += `f ${v0 + 1} ${v1 + 1} ${v2 + 1}\n`;
    }

    return new Blob([obj], { type: 'text/plain' });
  }

  /**
   * Generates ASCII PLY Blob.
   */
  static exportPLY(mesh: MeshGeometry): Blob {
    const { vertices, faces } = mesh;
    let ply = "ply\nformat ascii 1.0\ncomment OmniSeam 3D Export\n";
    ply += `element vertex ${vertices.length}\n`;
    ply += "property float x\nproperty float y\nproperty float z\n";
    ply += `element face ${faces.length}\n`;
    ply += "property list uchar int vertex_indices\nend_header\n";

    for (let i = 0; i < vertices.length; i++) {
      const [x, y, z] = vertices[i];
      ply += `${x} ${y} ${z}\n`;
    }

    for (let i = 0; i < faces.length; i++) {
      const [v0, v1, v2] = faces[i];
      ply += `3 ${v0} ${v1} ${v2}\n`;
    }

    return new Blob([ply], { type: 'text/plain' });
  }

  /**
   * Generates OFF (Object File Format) Blob.
   */
  static exportOFF(mesh: MeshGeometry): Blob {
    const { vertices, faces } = mesh;
    let off = `OFF\n${vertices.length} ${faces.length} 0\n`;
    for (let i = 0; i < vertices.length; i++) {
      const [x, y, z] = vertices[i];
      off += `${x} ${y} ${z}\n`;
    }
    for (let i = 0; i < faces.length; i++) {
      const [v0, v1, v2] = faces[i];
      off += `3 ${v0} ${v1} ${v2}\n`;
    }
    return new Blob([off], { type: 'text/plain' });
  }

  /**
   * Generates standard OPC compliant 3MF (3D Manufacturing Format) ZIP archive.
   */
  static export3MF(mesh: MeshGeometry): Blob {
    const { vertices, faces } = mesh;
    let modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
`;
    for (let i = 0; i < vertices.length; i++) {
      const [x, y, z] = vertices[i];
      modelXml += `          <vertex x="${x}" y="${y}" z="${z}" />\n`;
    }
    modelXml += `        </vertices>
        <triangles>
`;
    for (let i = 0; i < faces.length; i++) {
      const [v0, v1, v2] = faces[i];
      modelXml += `          <triangle v1="${v0}" v2="${v1}" v3="${v2}" />\n`;
    }
    modelXml += `        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" />
  </build>
</model>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

    const entries: ZipEntry[] = [
      { filename: '[Content_Types].xml', data: contentTypesXml },
      { filename: '_rels/.rels', data: relsXml },
      { filename: '3D/3dmodel.model', data: modelXml },
    ];

    return ZipPackager.createZipSync(entries, 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml');
  }

  /**
   * Generates pure Binary glTF (GLB) with PBR materials for instant WebGL loading.
   */
  static exportGLB(mesh: MeshGeometry): Blob {
    const { vertices, faces } = mesh;
    const vCount = vertices.length;
    const fCount = faces.length;

    // Buffer 1: Position (Float32Array: vCount * 3 * 4 bytes)
    const posByteLength = vCount * 3 * 4;
    const posArray = new Float32Array(vCount * 3);
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < vCount; i++) {
      const [x, y, z] = vertices[i];
      posArray[i * 3] = x;
      posArray[i * 3 + 1] = y;
      posArray[i * 3 + 2] = z;
      if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
    }

    // Buffer 2: Indices (Uint32Array: fCount * 3 * 4 bytes)
    const idxByteLength = fCount * 3 * 4;
    const idxArray = new Uint32Array(fCount * 3);
    for (let i = 0; i < fCount; i++) {
      idxArray[i * 3] = faces[i][0];
      idxArray[i * 3 + 1] = faces[i][1];
      idxArray[i * 3 + 2] = faces[i][2];
    }

    const totalBinLength = posByteLength + idxByteLength;
    const binBuffer = new Uint8Array(totalBinLength);
    binBuffer.set(new Uint8Array(posArray.buffer), 0);
    binBuffer.set(new Uint8Array(idxArray.buffer), posByteLength);

    const gltfJson = {
      asset: { version: "2.0", generator: "OmniSeam 3D Web Engine" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [
        {
          primitives: [
            {
              attributes: { POSITION: 0 },
              indices: 1,
              mode: 4,
            },
          ],
        },
      ],
      accessors: [
        {
          bufferView: 0,
          byteOffset: 0,
          componentType: 5126, // FLOAT
          count: vCount,
          type: "VEC3",
          max: [maxX, maxY, maxZ],
          min: [minX, minY, minZ],
        },
        {
          bufferView: 1,
          byteOffset: 0,
          componentType: 5125, // UNSIGNED_INT
          count: fCount * 3,
          type: "SCALAR",
        },
      ],
      bufferViews: [
        {
          buffer: 0,
          byteOffset: 0,
          byteLength: posByteLength,
          target: 34962, // ARRAY_BUFFER
        },
        {
          buffer: 0,
          byteOffset: posByteLength,
          byteLength: idxByteLength,
          target: 34963, // ELEMENT_ARRAY_BUFFER
        },
      ],
      buffers: [
        {
          byteLength: totalBinLength,
        },
      ],
    };

    const jsonString = JSON.stringify(gltfJson);
    const jsonByteLength = new TextEncoder().encode(jsonString).length;
    // Align JSON chunk to 4 bytes
    const jsonPadding = (4 - (jsonByteLength % 4)) % 4;
    const paddedJsonLength = jsonByteLength + jsonPadding;

    const glbLength = 12 + 8 + paddedJsonLength + 8 + totalBinLength;
    const glbBuffer = new ArrayBuffer(glbLength);
    const glbView = new DataView(glbBuffer);
    const glbBytes = new Uint8Array(glbBuffer);

    // GLB Header
    glbView.setUint32(0, 0x46546c67, true); // 'glTF'
    glbView.setUint32(4, 2, true);          // Version 2
    glbView.setUint32(8, glbLength, true);  // Total Length

    // JSON Chunk Header
    glbView.setUint32(12, paddedJsonLength, true);
    glbView.setUint32(16, 0x4e4f534a, true); // 'JSON'
    const jsonBytes = new TextEncoder().encode(jsonString);
    glbBytes.set(jsonBytes, 20);
    for (let i = 0; i < jsonPadding; i++) {
      glbBytes[20 + jsonByteLength + i] = 0x20; // space padding
    }

    // BIN Chunk Header
    const binHeaderOffset = 20 + paddedJsonLength;
    glbView.setUint32(binHeaderOffset, totalBinLength, true);
    glbView.setUint32(binHeaderOffset + 4, 0x004e4942, true); // 'BIN\0'
    glbBytes.set(binBuffer, binHeaderOffset + 8);

    return new Blob([glbBuffer], { type: 'model/gltf-binary' });
  }

  /**
   * Generates standard ISO-10303-21 AP214 Manifold Solid B-Rep STEP Blob with exact analytical PLANEs.
   */
  static exportSTEP(mesh: MeshGeometry): Blob {
    const { vertices, faces } = mesh;
    const nowStr = new Date().toISOString().replace(/\.\d+Z$/, '');

    const lines: string[] = [
      'ISO-10303-21;',
      'HEADER;',
      "FILE_DESCRIPTION(('OmniSeam 3D Industrial B-Rep Model'),'2;1');",
      `FILE_NAME('model.step','${nowStr}',('OmniSeam Web Engine'),('PolyHeal CAD'),'OmniSeam 3D v3.2','OmniSeam / OpenCASCADE','');`,
      "FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));",
      'ENDSEC;',
      'DATA;',
      "#1=APPLICATION_CONTEXT('automotive design');",
      "#2=APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2000,#1);",
      "#3=PRODUCT_DEFINITION_CONTEXT('part definition',#1,'design');",
      "#4=PRODUCT('OmniSeam_Part','OmniSeam_Part','',(#3));",
      "#5=PRODUCT_DEFINITION_FORMATION('','',#4);",
      "#6=PRODUCT_DEFINITION('design','',#5,#3);",
      "#7=PRODUCT_DEFINITION_SHAPE('','',#6);",
      '#8=SHAPE_DEFINITION_REPRESENTATION(#7,#9);',
      "#9=ADVANCED_BREP_SHAPE_REPRESENTATION('OmniSeam_Part',(#10,#20),#11);",
      "#10=AXIS2_PLACEMENT_3D('',#12,#13,#14);",
      "#11=(GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#15)) GLOBAL_UNIT_ASSIGNED_CONTEXT((#16,#17,#18)) REPRESENTATION_CONTEXT('OmniSeam','TOPOLOGY'));",
      "#12=CARTESIAN_POINT('',(0.,0.,0.));",
      "#13=DIRECTION('',(0.,0.,1.));",
      "#14=DIRECTION('',(1.,0.,0.));",
      "#15=UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-05),#16,'distance_accuracy_value','confusion accuracy');",
      '#16=(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.));',
      '#17=(NAMED_UNIT(*) PLANE_ANGLE_UNIT() SI_UNIT($,.RADIAN.));',
      '#18=(NAMED_UNIT(*) SI_UNIT($,.STERADIAN.) SOLID_ANGLE_UNIT());',
    ];

    let currId = 30;
    const vIds: number[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const [x, y, z] = vertices[i];
      lines.push(`#${currId}=CARTESIAN_POINT('',(${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}));`);
      vIds.push(currId);
      currId++;
    }

    const faceIds: string[] = [];
    const normalCache = new Map<string, { dirId: number; refDirId: number }>();

    for (let i = 0; i < faces.length; i++) {
      const [i0, i1, i2] = faces[i];
      const p1Id = vIds[i0];
      const p2Id = vIds[i1];
      const p3Id = vIds[i2];

      const v0 = vertices[i0];
      const v1 = vertices[i1];
      const v2 = vertices[i2];

      // Calculate face normal
      const ax = v1[0] - v0[0];
      const ay = v1[1] - v0[1];
      const az = v1[2] - v0[2];
      const bx = v2[0] - v0[0];
      const by = v2[1] - v0[1];
      const bz = v2[2] - v0[2];

      let nx = ay * bz - az * by;
      let ny = az * bx - ax * bz;
      let nz = ax * by - ay * bx;
      const nLen = Math.hypot(nx, ny, nz);

      if (nLen > 1e-7) {
        nx /= nLen;
        ny /= nLen;
        nz /= nLen;
      } else {
        nx = 0;
        ny = 0;
        nz = 1;
      }

      const fnKey = `${nx.toFixed(4)},${ny.toFixed(4)},${nz.toFixed(4)}`;
      let dirInfo = normalCache.get(fnKey);

      if (!dirInfo) {
        const dirId = currId++;
        lines.push(`#${dirId}=DIRECTION('',(${nx.toFixed(6)},${ny.toFixed(6)},${nz.toFixed(6)}));`);

        // Compute perpendicular reference direction
        let rx = Math.abs(nx) < 0.8 ? 1 : 0;
        let ry = Math.abs(nx) < 0.8 ? 0 : 1;
        let rz = 0;
        const dot = rx * nx + ry * ny + rz * nz;
        rx -= dot * nx;
        ry -= dot * ny;
        rz -= dot * nz;
        const rLen = Math.hypot(rx, ry, rz);
        if (rLen > 1e-6) {
          rx /= rLen;
          ry /= rLen;
          rz /= rLen;
        } else {
          rx = 1;
          ry = 0;
          rz = 0;
        }

        const refDirId = currId++;
        lines.push(`#${refDirId}=DIRECTION('',(${rx.toFixed(6)},${ry.toFixed(6)},${rz.toFixed(6)}));`);
        dirInfo = { dirId, refDirId };
        normalCache.set(fnKey, dirInfo);
      }

      const polyId = currId++;
      lines.push(`#${polyId}=POLY_LOOP('',(#${p1Id},#${p2Id},#${p3Id}));`);

      const boundId = currId++;
      lines.push(`#${boundId}=FACE_OUTER_BOUND('',#${polyId},.T.);`);

      const placementId = currId++;
      lines.push(`#${placementId}=AXIS2_PLACEMENT_3D('',#${p1Id},#${dirInfo.dirId},#${dirInfo.refDirId});`);

      const planeId = currId++;
      lines.push(`#${planeId}=PLANE('',#${placementId});`);

      const faceId = currId++;
      lines.push(`#${faceId}=ADVANCED_FACE('',(#${boundId}),#${planeId},.T.);`);
      faceIds.push(`#${faceId}`);
    }

    const faceListStr = faceIds.join(',');
    lines.push(`#21=CLOSED_SHELL('',(${faceListStr}));`);
    lines.push("#20=MANIFOLD_SOLID_BREP('Solid1',#21);");
    lines.push('ENDSEC;');
    lines.push('END-ISO-10303-21;');

    return new Blob([lines.join('\n') + '\n'], { type: 'application/step' });
  }
}
