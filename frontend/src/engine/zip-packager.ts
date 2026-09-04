/**
 * Lightweight, zero-dependency in-browser PKZIP 2.0 file archive packager.
 * Formats standard local file headers, data descriptors, and central directory records.
 */

export interface ZipEntry {
  filename: string;
  data: Uint8Array | ArrayBuffer | string;
}

export class ZipPackager {
  // Precomputed CRC32 lookup table
  private static crcTable: Uint32Array = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    return table;
  })();

  static crc32(data: Uint8Array): number {
    let crc = 0 ^ (-1);
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ this.crcTable[(crc ^ data[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  /**
   * Bundles an array of files into a standard downloadable .zip Blob synchronously.
   */
  static createZipSync(entries: ZipEntry[], mimeType: string = 'application/zip'): Blob {
    const localHeaders: Uint8Array[] = [];
    const centralHeaders: Uint8Array[] = [];
    let offset = 0;

    const encoder = new TextEncoder();

    for (const entry of entries) {
      const fileNameBytes = encoder.encode(entry.filename);
      let fileData: Uint8Array;

      if (typeof entry.data === 'string') {
        fileData = encoder.encode(entry.data);
      } else if (entry.data instanceof ArrayBuffer) {
        fileData = new Uint8Array(entry.data);
      } else {
        fileData = entry.data;
      }

      const crc = this.crc32(fileData);
      const size = fileData.length;

      // Current DOS Date & Time (2026-09-04 16:30)
      const dosTime = (16 << 11) | (30 << 5) | (0 >> 1);
      const dosDate = ((2026 - 1980) << 9) | (9 << 5) | 4;

      // Local File Header (30 bytes + filename + data)
      const localHeader = new Uint8Array(30 + fileNameBytes.length);
      const lv = new DataView(localHeader.buffer);

      lv.setUint32(0, 0x04034b50, true); // Local header signature
      lv.setUint16(4, 20, true);         // Version needed: 2.0
      lv.setUint16(6, 0, true);          // General purpose bit flag
      lv.setUint16(8, 0, true);          // Compression method: 0 (Stored/None)
      lv.setUint16(10, dosTime, true);   // DOS time
      lv.setUint16(12, dosDate, true);   // DOS date
      lv.setUint32(14, crc, true);       // CRC-32
      lv.setUint32(18, size, true);      // Compressed size
      lv.setUint32(22, size, true);      // Uncompressed size
      lv.setUint16(26, fileNameBytes.length, true); // File name length
      lv.setUint16(28, 0, true);         // Extra field length
      localHeader.set(fileNameBytes, 30);

      localHeaders.push(localHeader);
      localHeaders.push(fileData);

      // Central Directory Header (46 bytes + filename)
      const centralHeader = new Uint8Array(46 + fileNameBytes.length);
      const cv = new DataView(centralHeader.buffer);

      cv.setUint32(0, 0x02014b50, true); // Central directory signature
      cv.setUint16(4, 20, true);         // Version made by
      cv.setUint16(6, 20, true);         // Version needed: 2.0
      cv.setUint16(8, 0, true);          // Bit flag
      cv.setUint16(10, 0, true);         // Compression: 0
      cv.setUint16(12, dosTime, true);   // DOS time
      cv.setUint16(14, dosDate, true);   // DOS date
      cv.setUint32(16, crc, true);       // CRC32
      cv.setUint32(20, size, true);      // Compressed size
      cv.setUint32(24, size, true);      // Uncompressed size
      cv.setUint16(28, fileNameBytes.length, true); // File name length
      cv.setUint16(30, 0, true);         // Extra field length
      cv.setUint16(32, 0, true);         // File comment length
      cv.setUint16(34, 0, true);         // Disk number start
      cv.setUint16(36, 0, true);         // Internal file attributes
      cv.setUint32(38, 0, true);         // External file attributes
      cv.setUint32(42, offset, true);    // Relative offset of local header
      centralHeader.set(fileNameBytes, 46);

      centralHeaders.push(centralHeader);

      offset += localHeader.length + fileData.length;
    }

    const centralDirOffset = offset;
    let centralDirSize = 0;
    for (const ch of centralHeaders) {
      centralDirSize += ch.length;
    }

    // End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);  // EOCD signature
    ev.setUint16(4, 0, true);           // Number of this disk
    ev.setUint16(6, 0, true);           // Disk with start of central directory
    ev.setUint16(8, entries.length, true);  // Total entries on this disk
    ev.setUint16(10, entries.length, true); // Total entries
    ev.setUint32(12, centralDirSize, true); // Size of central directory
    ev.setUint32(16, centralDirOffset, true); // Offset of central directory
    ev.setUint16(20, 0, true);          // Comment length

    const parts = [...localHeaders, ...centralHeaders, eocd];
    return new Blob(parts as unknown as BlobPart[], { type: mimeType });
  }

  /**
   * Bundles an array of files into a standard downloadable .zip Blob.
   */
  static async createZip(entries: ZipEntry[], mimeType: string = 'application/zip'): Promise<Blob> {
    return this.createZipSync(entries, mimeType);
  }
}
