import * as THREE from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

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
   * Clones and normalizes 3D object for 1:1 tabletop or floor AR placement.
   * Centers X/Z, aligns lowest point to Y=0, and normalizes scale if needed.
   */
  static prepareObjectForAr(object: THREE.Object3D): THREE.Group {
    const group = new THREE.Group();
    const clone = object.clone(true);
    group.add(clone);

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Center horizontally and set bottom to ground (Y = 0)
    clone.position.x -= center.x;
    clone.position.z -= center.z;
    clone.position.y -= box.min.y;

    // If model has extreme dimensions, scale to comfortable AR size (approx 30cm ~ 50cm)
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 5) {
      const targetDim = 0.5; // 50cm
      const scaleFactor = targetDim / maxDim;
      group.scale.setScalar(scaleFactor);
    } else if (maxDim < 0.02 && maxDim > 0) {
      const targetDim = 0.2; // 20cm
      const scaleFactor = targetDim / maxDim;
      group.scale.setScalar(scaleFactor);
    }

    return group;
  }

  /**
   * Generates a USDZ Blob for Apple AR Quick Look.
   */
  static async exportUsdz(sceneOrMesh: THREE.Object3D): Promise<Blob> {
    const prepared = this.prepareObjectForAr(sceneOrMesh);
    const exporter = new USDZExporter();
    const arrayBuffer = await exporter.parseAsync(prepared);
    return new Blob([arrayBuffer as unknown as BlobPart], { type: 'model/vnd.usdz+zip' });
  }

  /**
   * Generates a binary GLB Blob from Three.js Object3D.
   */
  static async exportGlb(sceneOrMesh: THREE.Object3D): Promise<Blob> {
    const prepared = this.prepareObjectForAr(sceneOrMesh);
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();
      exporter.parse(
        prepared,
        (gltf) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          resolve(blob);
        },
        (err) => reject(err),
        { binary: true }
      );
    });
  }

  /**
   * Directly triggers Apple AR Quick Look natively.
   */
  static async launchIosAr(sceneOrMesh: THREE.Object3D): Promise<boolean> {
    try {
      const usdzBlob = await this.exportUsdz(sceneOrMesh);
      const usdzUrl = URL.createObjectURL(usdzBlob);

      const anchor = document.createElement('a');
      anchor.setAttribute('rel', 'ar');
      anchor.setAttribute('href', usdzUrl);
      anchor.style.display = 'none';

      // Temporary image required by iOS QuickLook to trigger native preview
      const img = document.createElement('img');
      anchor.appendChild(img);
      document.body.appendChild(anchor);

      anchor.click();
      setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(usdzUrl);
      }, 5000);
      return true;
    } catch (err) {
      console.error("Failed to launch iOS AR Quick Look:", err);
      return false;
    }
  }

  /**
   * Triggers Android Google Scene Viewer via Android Intent.
   */
  static launchAndroidAr(glbUrl: string, title?: string): boolean {
    if (!glbUrl) return false;
    // Resolve absolute URL
    const absoluteGlb = glbUrl.startsWith('http') 
      ? glbUrl 
      : `${window.location.origin}${glbUrl.startsWith('/') ? '' : '/'}${glbUrl}`;

    const titleParam = title ? `&title=${encodeURIComponent(title)}` : '';
    const intentUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(
      absoluteGlb
    )}&mode=ar_only${titleParam}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;end;`;
    
    window.location.href = intentUrl;
    return true;
  }

  /**
   * Triggers native AR preview based on device OS.
   */
  static async launchAr(
    sceneOrMesh: THREE.Object3D, 
    previewGlbUrl?: string, 
    title?: string
  ): Promise<{ success: boolean; platform: string }> {
    const platform = this.getArPlatform();

    if (platform === 'ios') {
      const ok = await this.launchIosAr(sceneOrMesh);
      return { success: ok, platform: 'ios' };
    } else if (platform === 'android') {
      if (previewGlbUrl) {
        const ok = this.launchAndroidAr(previewGlbUrl, title);
        return { success: ok, platform: 'android' };
      }
    }

    return { success: false, platform };
  }
}
