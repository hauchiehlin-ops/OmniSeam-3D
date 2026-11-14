import * as THREE from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { IS_IOS_APP, presentUsdzQuickLook } from '../platform/native';

export class ArManager {
  /**
   * Which native AR viewer is available: AR Quick Look in the iOS app,
   * Google Scene Viewer on Android, none elsewhere (e.g. the desktop dev server).
   */
  static getArPlatform(): 'ios' | 'android' | 'desktop' {
    // The iPad WebView reports a desktop user agent, so check the app shell first.
    if (IS_IOS_APP) return 'ios';
    if (/android/i.test(navigator.userAgent || '')) return 'android';
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

    // USDZExporter only exports meshes with MeshStandardMaterial. Loaders (e.g.
    // OBJLoader -> MeshPhongMaterial) and viewer display modes (wireframe,
    // normals) use other materials, which would produce an empty AR scene.
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const first = materials[0] as THREE.Material & { color?: THREE.Color };
      if (!Array.isArray(mesh.material) && (first as THREE.MeshStandardMaterial)?.isMeshStandardMaterial && !first.transparent) {
        return;
      }
      mesh.material = new THREE.MeshStandardMaterial({
        color: first?.color ? first.color.clone() : new THREE.Color(0x9ca3af),
        roughness: 0.4,
        metalness: 0.2,
        vertexColors: !!mesh.geometry?.getAttribute?.('color'),
      });
    });

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
   * Opens the model in Apple AR Quick Look through the native
   * QLPreviewController plugin (WKWebView ignores `<a rel="ar">`).
   */
  static async launchIosAr(sceneOrMesh: THREE.Object3D): Promise<boolean> {
    try {
      const usdzBlob = await this.exportUsdz(sceneOrMesh);
      await presentUsdzQuickLook(usdzBlob, 'OmniSeam_AR.usdz');
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
