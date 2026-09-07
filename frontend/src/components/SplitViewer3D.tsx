import React from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { Viewer3D } from './Viewer3D';
import { DisplayMode } from '../types';
import { CoordinateSystemSelection, CoordinateSystemType } from '../engine/coordinate-system-manager';

interface SplitViewer3DProps {
  originalFile?: File | null;
  repairedUrl?: string | null;
  displayMode?: DisplayMode;
  sectionPlaneActive?: boolean;
  sectionOffset?: number;
  measureToolActive?: boolean;
  onMeasureDistance?: (dist: number | null, p1: [number, number, number] | null, p2: [number, number, number] | null) => void;
  defectPoints?: {
    holes?: [number, number, number][];
    nonManifold?: [number, number, number][];
  };
  onModelLoaded?: (object: THREE.Object3D) => void;
  rotation?: { x: number; y: number; z: number };
  onChangeRotation?: (rot: { x: number; y: number; z: number }) => void;
  showRotationGizmo?: boolean;
  coordSystemMode?: CoordinateSystemSelection;
  onDetectedCoordSystem?: (type: CoordinateSystemType) => void;
}

export const SplitViewer3D: React.FC<SplitViewer3DProps> = ({
  originalFile,
  repairedUrl,
  displayMode = 'shaded',
  sectionPlaneActive = false,
  sectionOffset = 0,
  measureToolActive = false,
  onMeasureDistance,
  defectPoints,
  onModelLoaded,
  rotation,
  onChangeRotation,
  showRotationGizmo,
  coordSystemMode = 'auto',
  onDetectedCoordSystem,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full min-h-[640px] lg:h-[520px]">
      {/* Left: Original / Defect Viewport */}
      <div className="relative h-full flex flex-col">
        <Viewer3D
          modelFile={originalFile}
          displayMode={displayMode}
          sectionPlaneActive={sectionPlaneActive}
          sectionOffset={sectionOffset}
          measureToolActive={measureToolActive}
          onMeasureDistance={onMeasureDistance}
          defectPoints={defectPoints}
          highlightColor={0xf43f5e}
          title={t('viewer.original_label')}
          badge="Defective"
          badgeColor="red"
          rotation={rotation}
          onChangeRotation={onChangeRotation}
          showRotationGizmo={showRotationGizmo}
          coordSystemMode={coordSystemMode}
          onDetectedCoordSystem={onDetectedCoordSystem}
        />
      </div>

      {/* Right: Healed / Watertight Solid Viewport */}
      <div className="relative h-full flex flex-col">
        <Viewer3D
          modelUrl={repairedUrl}
          displayMode={displayMode}
          sectionPlaneActive={sectionPlaneActive}
          sectionOffset={sectionOffset}
          measureToolActive={measureToolActive}
          onMeasureDistance={onMeasureDistance}
          highlightColor={0x10b981}
          title={t('viewer.repaired_label')}
          badge="Watertight"
          badgeColor="emerald"
          onModelLoaded={onModelLoaded}
          coordSystemMode={coordSystemMode}
        />
      </div>
    </div>
  );
};
