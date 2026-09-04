import * as THREE from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';

export class ArManager {
  /**
   * Detects client operating system / browser capabilities for AR.
   */
  static getArPlatform(): 'ios' | 'android' | 'desktop' {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      return 'ios';
    }
    if (/android/i.test(userAgent)) {
      return 'android';
    }
    return 'desktop';
  }

  /**
   * Generates a USDZ Blob for Apple AR Quick Look.
   */
  static async exportUsdz(sceneOrMesh: THREE.Object3D): Promise<Blob> {
    const exporter = new USDZExporter();
    const arrayBuffer = await exporter.parseAsync(sceneOrMesh);
    return new Blob([arrayBuffer as unknown as BlobPart], { type: 'model/vnd.usdz+zip' });
  }

  /**
   * Triggers native AR preview based on device OS.
   */
  static async launchAr(sceneOrMesh: THREE.Object3D, previewGlbUrl?: string): Promise<{ success: boolean; platform: string }> {
    const platform = this.getArPlatform();

    if (platform === 'ios') {
      try {
        const usdzBlob = await this.exportUsdz(sceneOrMesh);
        const usdzUrl = URL.createObjectURL(usdzBlob);

        const anchor = document.createElement('a');
        anchor.setAttribute('rel', 'ar');
        anchor.setAttribute('href', usdzUrl);
        anchor.style.display = 'none';
        document.body.appendChild(anchor);

        // Append temporary image child required by iOS QuickLook
        const img = document.createElement('img');
        anchor.appendChild(img);

        anchor.click();
        setTimeout(() => {
          document.body.removeChild(anchor);
          URL.revokeObjectURL(usdzUrl);
        }, 3000);
        return { success: true, platform: 'ios' };
      } catch (err) {
        console.error("iOS AR Launch Error:", err);
      }
    } else if (platform === 'android' && previewGlbUrl) {
      // Android Google Scene Viewer Intent
      const intentUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(
        previewGlbUrl
      )}&mode=ar_only#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;end;`;
      window.location.href = intentUrl;
      return { success: true, platform: 'android' };
    }

    return { success: false, platform };
  }
}
