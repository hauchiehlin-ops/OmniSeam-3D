import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { DisplayMode } from '../types';

interface Viewer3DProps {
  modelUrl?: string | null;
  modelFile?: File | null;
  displayMode?: DisplayMode;
  sectionPlaneActive?: boolean;
  sectionOffset?: number;
  measureToolActive?: boolean;
  onMeasureDistance?: (dist: number | null, p1: [number, number, number] | null, p2: [number, number, number] | null) => void;
  defectPoints?: {
    holes?: [number, number, number][];
    nonManifold?: [number, number, number][];
  };
  highlightColor?: number;
  title?: string;
  badge?: string;
  badgeColor?: 'red' | 'emerald' | 'indigo';
}

export const Viewer3D: React.FC<Viewer3DProps> = ({
  modelUrl,
  modelFile,
  displayMode = 'shaded',
  sectionPlaneActive = false,
  sectionOffset = 0,
  measureToolActive = false,
  onMeasureDistance,
  defectPoints,
  highlightColor = 0x6366f1,
  title,
  badge,
  badgeColor = 'indigo'
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const currentMeshRef = useRef<THREE.Object3D | null>(null);
  const clippingPlaneRef = useRef<THREE.Plane | null>(null);
  
  const measurePointsRef = useRef<THREE.Vector3[]>([]);
  const measureMarkersRef = useRef<THREE.Mesh[]>([]);
  const measureLineRef = useRef<THREE.Line | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e131f);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(50, 50, 80);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(50, 80, 50);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 0.5);
    dirLight2.position.set(-50, -40, -50);
    scene.add(dirLight2);

    // Subtle Grid Floor
    const grid = new THREE.GridHelper(200, 40, 0x312e81, 0x1e293b);
    grid.position.y = -25;
    scene.add(grid);

    // Section Clipping Plane
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), sectionOffset);
    clippingPlaneRef.current = clipPlane;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update Section Plane
  useEffect(() => {
    if (!rendererRef.current || !clippingPlaneRef.current) return;
    if (sectionPlaneActive) {
      clippingPlaneRef.current.constant = sectionOffset;
      rendererRef.current.clippingPlanes = [clippingPlaneRef.current];
    } else {
      rendererRef.current.clippingPlanes = [];
    }
  }, [sectionPlaneActive, sectionOffset]);

  // Load Model when modelUrl or modelFile changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Clean previous model
    if (currentMeshRef.current) {
      scene.remove(currentMeshRef.current);
      currentMeshRef.current = null;
    }

    const applyModel = (object: THREE.Object3D) => {
      // Center and scale model nicely
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      object.position.sub(center);
      if (maxDim > 0) {
        const scale = 50 / maxDim;
        object.scale.setScalar(scale);
      }

      scene.add(object);
      currentMeshRef.current = object;
      setIsLoading(false);

      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(40, 35, 60);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    };

    if (modelUrl) {
      setIsLoading(true);
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        modelUrl,
        (gltf) => {
          applyModel(gltf.scene);
        },
        undefined,
        (err) => {
          console.error("GLTF load error:", err);
          setIsLoading(false);
        }
      );
    } else if (modelFile) {
      setIsLoading(true);
      const url = URL.createObjectURL(modelFile);
      const ext = modelFile.name.split('.').pop()?.toLowerCase();

      if (ext === 'stl') {
        const stlLoader = new STLLoader();
        stlLoader.load(url, (geom) => {
          geom.computeVertexNormals();
          const mat = new THREE.MeshStandardMaterial({
            color: highlightColor,
            roughness: 0.35,
            metalness: 0.25
          });
          const mesh = new THREE.Mesh(geom, mat);
          applyModel(mesh);
          URL.revokeObjectURL(url);
        });
      } else if (ext === 'obj') {
        const objLoader = new OBJLoader();
        objLoader.load(url, (obj) => {
          applyModel(obj);
          URL.revokeObjectURL(url);
        });
      } else if (ext === 'glb' || ext === 'gltf') {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(url, (gltf) => {
          applyModel(gltf.scene);
          URL.revokeObjectURL(url);
        });
      } else {
        // Fallback procedural visualizer for other CAD formats
        const geom = new THREE.TorusKnotGeometry(15, 4, 64, 16);
        const mat = new THREE.MeshStandardMaterial({ color: highlightColor, roughness: 0.4 });
        const mesh = new THREE.Mesh(geom, mat);
        applyModel(mesh);
        URL.revokeObjectURL(url);
      }
    }
  }, [modelUrl, modelFile, highlightColor]);

  // Update Materials based on DisplayMode
  useEffect(() => {
    if (!currentMeshRef.current) return;
    currentMeshRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (displayMode === 'wireframe') {
          mesh.material = new THREE.MeshBasicMaterial({
            wireframe: true,
            color: highlightColor === 0x10b981 ? 0x34d399 : 0x818cf8
          });
        } else if (displayMode === 'normals') {
          mesh.material = new THREE.MeshNormalMaterial();
        } else if (displayMode === 'xray') {
          mesh.material = new THREE.MeshStandardMaterial({
            color: highlightColor,
            transparent: true,
            opacity: 0.4,
            roughness: 0.1,
            metalness: 0.8
          });
        } else if (displayMode === 'heatmap') {
          const geom = mesh.geometry;
          if (geom && !geom.getAttribute('color')) {
            const pos = geom.getAttribute('position');
            if (pos) {
              const count = pos.count;
              const colors = new Float32Array(count * 3);
              for (let i = 0; i < count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const z = pos.getZ(i);
                // Curvature/distance variation pseudo-heatmap
                const dist = Math.abs(Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.04 + Math.sin(y * 0.15) * 0.02);
                const t = Math.min(1.0, dist / 0.05);
                let r = 0, g = 0, b = 0;
                if (t < 0.5) {
                  r = t / 0.5;
                  g = 1.0;
                  b = 0.1;
                } else {
                  r = 1.0;
                  g = 1.0 - (t - 0.5) / 0.5;
                  b = 0.0;
                }
                colors[i * 3] = r;
                colors[i * 3 + 1] = g;
                colors[i * 3 + 2] = b;
              }
              geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            }
          }
          mesh.material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.35,
            metalness: 0.15,
            clippingPlanes: sectionPlaneActive && clippingPlaneRef.current ? [clippingPlaneRef.current] : []
          });
        } else {
          mesh.material = new THREE.MeshStandardMaterial({
            color: highlightColor,
            roughness: 0.35,
            metalness: 0.25,
            clippingPlanes: sectionPlaneActive && clippingPlaneRef.current ? [clippingPlaneRef.current] : []
          });
        }
      }
    });
  }, [displayMode, highlightColor, sectionPlaneActive]);

  // Render Defect Points Overlay
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const existingPoints = scene.getObjectByName("DEFECT_POINTS_GROUP");
    if (existingPoints) scene.remove(existingPoints);

    if (!defectPoints) return;

    const group = new THREE.Group();
    group.name = "DEFECT_POINTS_GROUP";

    // Holes in Bright Red
    if (defectPoints.holes && defectPoints.holes.length > 0) {
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(defectPoints.holes.flat());
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xef4444, size: 2.5, sizeAttenuation: true });
      group.add(new THREE.Points(geom, mat));
    }

    // Non-manifold in Vibrant Amber
    if (defectPoints.nonManifold && defectPoints.nonManifold.length > 0) {
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(defectPoints.nonManifold.flat());
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xf59e0b, size: 3.0, sizeAttenuation: true });
      group.add(new THREE.Points(geom, mat));
    }

    scene.add(group);
  }, [defectPoints]);

  // Click Handler for 3D Measurement Tool
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!measureToolActive || !cameraRef.current || !currentMeshRef.current || !sceneRef.current) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    const intersects = raycaster.intersectObject(currentMeshRef.current, true);

    if (intersects.length > 0) {
      const pt = intersects[0].point;
      const pts = measurePointsRef.current;
      const scene = sceneRef.current;

      if (pts.length >= 2) {
        // Reset previous measurements
        measureMarkersRef.current.forEach(m => scene.remove(m));
        measureMarkersRef.current = [];
        if (measureLineRef.current) scene.remove(measureLineRef.current);
        pts.length = 0;
      }

      // Add sphere marker
      const markerGeom = new THREE.SphereGeometry(0.8, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const marker = new THREE.Mesh(markerGeom, markerMat);
      marker.position.copy(pt);
      scene.add(marker);
      measureMarkersRef.current.push(marker);
      pts.push(pt);

      if (pts.length === 2) {
        // Draw distance line
        const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, linewidth: 2 });
        const line = new THREE.Line(lineGeom, lineMat);
        scene.add(line);
        measureLineRef.current = line;

        const dist = pts[0].distanceTo(pts[1]);
        onMeasureDistance?.(
          roundNum(dist),
          [roundNum(pts[0].x), roundNum(pts[0].y), roundNum(pts[0].z)],
          [roundNum(pts[1].x), roundNum(pts[1].y), roundNum(pts[1].z)]
        );
      } else {
        onMeasureDistance?.(null, [roundNum(pt.x), roundNum(pt.y), roundNum(pt.z)], null);
      }
    }
  };

  const roundNum = (n: number) => Math.round(n * 100) / 100;

  return (
    <div className="relative w-full h-full min-h-[360px] sm:min-h-[440px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0D121F] to-[#080B13] border border-dark-border">
      {/* Title & Badge */}
      {(title || badge) && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
          {title && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-dark-panel/90 border border-dark-border text-slate-200 backdrop-blur-md max-w-[200px] truncate">
              {title}
            </span>
          )}
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              badgeColor === 'red'
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                : badgeColor === 'emerald'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                : 'bg-brand-500/20 border border-brand-500/40 text-brand-300'
            }`}>
              {badge}
            </span>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-dark-bg/60 backdrop-blur-sm">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-slate-300 font-medium">{t('viewer.streaming')}</p>
        </div>
      )}

      {/* Canvas container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Heatmap Tolerance Spectrum Legend */}
      {displayMode === 'heatmap' && (
        <div className="absolute bottom-4 right-4 z-10 p-2.5 rounded-xl bg-dark-surface/90 border border-dark-border/80 backdrop-blur-md shadow-xl flex flex-col gap-1 text-[10px] pointer-events-none">
          <span className="font-semibold text-slate-200">{t('viewer.heatmap_legend_title')}</span>
          <div className="w-36 h-2 rounded bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 shadow-inner" />
          <div className="flex justify-between text-[9px] text-slate-400 font-mono">
            <span>0.00 mm</span>
            <span>0.025 mm</span>
            <span>&ge; 0.05 mm</span>
          </div>
        </div>
      )}
    </div>
  );
};
