import { useEffect, useState } from 'react';
import { EngineMode } from '../api/client';
import { AdaptiveIntentEngine, AdaptiveIntentResult } from '../engine/adaptive-intent';
import { ConversionConfig, InspectResponse } from '../types';

export const DEFAULT_CONFIG: ConversionConfig = {
  target_format: 'glb',
  cad_linear_deflection: 0.005,
  cad_angular_deflection: 0.1,
  enable_sewing: true,
  sewing_tolerance: 0.001,
  auto_fill_holes: false,
  fix_non_manifold: true,
  unify_normals: true,
  remove_degenerate: true,
  weld_vertices: true,
  compress_gltf: true,
  rotation_x: 0,
  rotation_y: 0,
  rotation_z: 0,
};

/**
 * Conversion settings plus the "AI adaptive" recommendation: while adaptive
 * mode is on, the recommended repair strategy and engine are applied whenever
 * the model, its inspection or the target format changes. Any manual change
 * to repair options turns adaptive mode off; changing the target format turns
 * it back on.
 */
export function useConversionSettings(
  selectedFile: File | null,
  inspectData: InspectResponse | null,
  setEngineMode: (mode: EngineMode) => void
) {
  const [config, setConfig] = useState<ConversionConfig>(DEFAULT_CONFIG);
  const [adaptiveIntent, setAdaptiveIntent] = useState<AdaptiveIntentResult | null>(null);
  const [isAutoAdaptiveActive, setIsAutoAdaptiveActive] = useState(true);

  const applyAdaptive = (file: File) => {
    const intent = AdaptiveIntentEngine.analyzeIntent(file, config.target_format, config, inspectData);
    setAdaptiveIntent(intent);
    setConfig(intent.adaptedConfig);
    setEngineMode(intent.recommendedEngineMode);
  };

  useEffect(() => {
    if (!selectedFile) {
      setAdaptiveIntent(null);
      return;
    }
    if (isAutoAdaptiveActive) {
      applyAdaptive(selectedFile);
    } else {
      setAdaptiveIntent(AdaptiveIntentEngine.analyzeIntent(selectedFile, config.target_format, config, inspectData));
    }
    // Re-run only when the model, its inspection, the target format or the mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile, inspectData, config.target_format, isAutoAdaptiveActive]);

  /** User edit: a new target format re-enables adaptive mode; anything else is a manual override. */
  const changeConfig = (next: ConversionConfig) => {
    setIsAutoAdaptiveActive(next.target_format !== config.target_format);
    setConfig(next);
  };

  /** "Reset to AI recommendation" button. */
  const resetToAdaptive = () => {
    if (!selectedFile) return;
    setIsAutoAdaptiveActive(true);
    applyAdaptive(selectedFile);
  };

  /** Called when a new model is loaded or the project is closed. */
  const resetForNewModel = () => {
    setIsAutoAdaptiveActive(true);
  };

  /** Bakes the model rotation (degrees) into the conversion settings. */
  const setRotation = (rot: { x: number; y: number; z: number }) => {
    setConfig((prev) => ({ ...prev, rotation_x: rot.x, rotation_y: rot.y, rotation_z: rot.z }));
  };

  return {
    config,
    setConfig,
    adaptiveIntent,
    isAutoAdaptiveActive,
    setIsAutoAdaptiveActive,
    changeConfig,
    resetToAdaptive,
    resetForNewModel,
    setRotation,
  };
}
