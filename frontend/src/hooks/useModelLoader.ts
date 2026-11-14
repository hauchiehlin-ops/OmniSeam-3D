import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient, EngineMode, PUBLIC_DEMO_MAX_SIZE_BYTES } from '../api/client';
import { InspectResponse } from '../types';
import { ProFeature, can, fileExt, isCadFile } from '../platform/entitlements';
import { IS_NATIVE, NATIVE_LOCAL_MAX_SIZE_BYTES, NATIVE_LOCAL_MAX_SIZE_MB, OPEN_FILE_EVENT } from '../platform/native';
import type { PaywallSecondaryAction } from './usePaywall';

/** Proprietary CAD / BIM formats that only a cloud node can read. */
export const PROPRIETARY_CAD_EXTS = new Set([
  'sldprt', 'sldasm', 'ipt', 'iam', 'ifc', '3dm', 'catpart', 'catproduct', 'dwg',
]);
/** Open CAD formats: cloud node when one is configured, otherwise on-device. */
const OPEN_CAD_EXTS = new Set(['step', 'stp', 'iges', 'igs', 'brep', 'dxf']);

/** Which engine should process a file, given whether a cloud node is configured. */
export function routeEngineForFile(fileName: string, hasNode: boolean): EngineMode {
  const ext = fileExt(fileName);
  if (PROPRIETARY_CAD_EXTS.has(ext)) return 'server';
  if (OPEN_CAD_EXTS.has(ext)) return hasNode ? 'server' : 'client';
  return 'client';
}

interface ModelLoaderOptions {
  setEngineMode: (mode: EngineMode) => void;
  requirePro: (feature: ProFeature, secondary?: PaywallSecondaryAction | null) => boolean;
  closePaywall: () => void;
  /** A proprietary CAD file was opened but no cloud node is configured. */
  onCadNeedsNode: (file: File) => void;
  /** The file is larger than the public demo node accepts. */
  onPublicNodeLimit: (file: File) => void;
  /** A new model was accepted: reset per-model view state (split view, measurements, …). */
  onModelChanged: () => void;
}

/**
 * Selected model file(s): size and plan checks, engine routing, automatic
 * inspection, and files opened from the iOS Files app / Share Sheet.
 */
export function useModelLoader({
  setEngineMode,
  requirePro,
  closePaywall,
  onCadNeedsNode,
  onPublicNodeLimit,
  onModelChanged,
}: ModelLoaderOptions) {
  const { t, i18n } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [inspectData, setInspectData] = useState<InspectResponse | null>(null);

  const selectFile = async (file: File) => {
    // iOS WebView memory guard: very large models crash on-device WebGL.
    if (IS_NATIVE && file.size > NATIVE_LOCAL_MAX_SIZE_BYTES) {
      window.alert(t('native.file_too_large', {
        max: NATIVE_LOCAL_MAX_SIZE_MB,
        size: (file.size / 1024 / 1024).toFixed(1),
      }));
      return;
    }
    // CAD / BIM import is a Pro feature (Plan A).
    if (isCadFile(file.name) && !requirePro('cad_import')) return;

    setSelectedFile(file);
    setSelectedFiles([file]);
    onModelChanged();

    const hasNode = Boolean(apiClient.getStoredBackendUrl());
    const mode = routeEngineForFile(file.name, hasNode);
    setEngineMode(mode);
    if (PROPRIETARY_CAD_EXTS.has(fileExt(file.name)) && !hasNode) onCadNeedsNode(file);
    if (mode === 'server' && apiClient.isPublicDemoNode() && file.size > PUBLIC_DEMO_MAX_SIZE_BYTES) {
      onPublicNodeLimit(file);
    }

    try {
      setInspectData(await apiClient.inspectModel(file, i18n.language));
    } catch (err) {
      console.warn('Auto-inspect fallback:', err);
    }
  };

  /** Several files at once (batch queue, Pro). Basic can continue with the first file. */
  const selectFiles = (files: File[]) => {
    if (!files || files.length === 0) return;
    if (files.length > 1 && !can('batch')) {
      requirePro('batch', {
        label: t('plan.secondary_first_file'),
        onClick: () => {
          closePaywall();
          selectFile(files[0]);
        },
      });
      return;
    }
    setSelectedFiles(files);
    selectFile(files[0]);
  };

  /** Re-runs the inspection of the current file. */
  const reinspect = async (): Promise<InspectResponse | null> => {
    if (!selectedFile) return null;
    const res = await apiClient.inspectModel(selectedFile, i18n.language);
    setInspectData(res);
    return res;
  };

  const clearModel = useCallback(() => {
    setSelectedFile(null);
    setSelectedFiles([]);
    setInspectData(null);
  }, []);

  // Files opened from the iOS Files app / Share Sheet ("Open in OmniSeam 3D").
  const selectFileRef = useRef(selectFile);
  selectFileRef.current = selectFile;
  useEffect(() => {
    const onOpenFile = (e: Event) => {
      const file = (e as CustomEvent<File>).detail;
      if (file) selectFileRef.current(file);
    };
    window.addEventListener(OPEN_FILE_EVENT, onOpenFile);
    return () => window.removeEventListener(OPEN_FILE_EVENT, onOpenFile);
  }, []);

  return { selectedFile, selectedFiles, inspectData, selectFile, selectFiles, reinspect, clearModel };
}
