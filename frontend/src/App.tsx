import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';

import { Navbar } from './components/Navbar';
import { Dropzone } from './components/Dropzone';
import { Toolbar } from './components/Toolbar';
import { Viewer3D } from './components/Viewer3D';
import { SplitViewer3D } from './components/SplitViewer3D';
import { SettingsPanel } from './components/SettingsPanel';
import { TargetFormatCard } from './components/TargetFormatCard';
import { ModelTransformToolbar } from './components/ModelTransformToolbar';
import { AuditReport } from './components/AuditReport';
import { TaskHistory } from './components/TaskHistory';
import { MeasureTool } from './components/MeasureTool';
import { BackendSettingsModal } from './components/BackendSettingsModal';
import { CadUnlockModal } from './components/CadUnlockModal';
import { PublicLimitModal } from './components/PublicLimitModal';
import { UserManualModal } from './components/UserManualModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { ArPreviewModal } from './components/ArPreviewModal';
import { MobileArView } from './components/MobileArView';
import { WindTunnelModal } from './components/WindTunnelModal';
import { Footer } from './components/Footer';
import { PaywallModal } from './components/PaywallModal';
import {
  PAYWALL_ENABLED,
  ProFeature,
  can,
  initEntitlements,
  isCadFile,
  requiredFeatureForConvert,
  toBasicConfig,
  useEntitlements,
} from './platform/entitlements';
import { IS_NATIVE, NATIVE_LOCAL_MAX_SIZE_BYTES, NATIVE_LOCAL_MAX_SIZE_MB, OPEN_FILE_EVENT, recordSuccessfulConversion, saveOrShareFile, saveOrShareUrl } from './platform/native';


import * as THREE from 'three';
import { 
  ConversionConfig, 
  DisplayMode, 
  InspectResponse, 
  TaskResponse 
} from './types';
import { apiClient, EngineMode, PUBLIC_DEMO_MAX_SIZE_BYTES, describeNodeError, UploadDeclinedError } from './api/client';
import { UploadConsentModal } from './components/UploadConsentModal';
import { APP_VERSION } from './version';
import { LicensesModal } from './components/LicensesModal';
import { loadRemoteConfig } from './platform/remote-config';
import { ArManager } from './engine/ar-manager';
import { ZipPackager, ZipEntry } from './engine/zip-packager';
import { AdaptiveIntentEngine, AdaptiveIntentResult } from './engine/adaptive-intent';
import { CoordinateSystemSelection, CoordinateSystemType } from './engine/coordinate-system-manager';


const DEFAULT_CONFIG: ConversionConfig = {
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

const PROPRIETARY_CAD_EXTS = new Set([
  'sldprt', 'sldasm', 'ipt', 'iam', 'ifc', '3dm', 'catpart', 'catproduct', 'dwg'
]);

export const App: React.FC = () => {
  const { t, i18n } = useTranslation();

  // Engine Mode: 'client' (100% In-Browser) or 'server' (FastAPI Backend)
  const [engineMode, setEngineMode] = useState<EngineMode>(
    apiClient.getStoredBackendUrl() ? 'server' : 'client'
  );

  // Modals
  const [showBackendModal, setShowBackendModal] = useState(false);
  const [showCadUnlockModal, setShowCadUnlockModal] = useState(false);
  const [lockedCadFile, setLockedCadFile] = useState<File | null>(null);
  const [showPublicLimitModal, setShowPublicLimitModal] = useState(false);
  const [publicLimitFile, setPublicLimitFile] = useState<File | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showLicensesModal, setShowLicensesModal] = useState(false);
  const [showArModal, setShowArModal] = useState(false);
  const [showWindTunnelModal, setShowWindTunnelModal] = useState(false);
  const [autoEngineNotice, setAutoEngineNotice] = useState<{ mode: EngineMode; reason: string } | null>(null);

  // Basic / Pro plan (iOS In-App Purchase)
  const entitlements = useEntitlements();
  const [paywall, setPaywall] = useState<{
    feature: ProFeature | null;
    welcome?: boolean;
    secondary?: { label: string; onClick: () => void } | null;
  } | null>(null);

  /** Returns true when the feature is available; otherwise opens the paywall. */
  const requirePro = (
    feature: ProFeature,
    secondary?: { label: string; onClick: () => void } | null
  ): boolean => {
    if (can(feature)) return true;
    setPaywall({ feature, secondary: secondary ?? null });
    return false;
  };

  // File and Configuration State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [config, setConfig] = useState<ConversionConfig>(DEFAULT_CONFIG);
  const baseConfig = config;
  const [adaptiveIntent, setAdaptiveIntent] = useState<AdaptiveIntentResult | null>(null);
  const [isAutoAdaptiveActive, setIsAutoAdaptiveActive] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [rotation, setRotation] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [transformToolActive, setTransformToolActive] = useState<boolean>(false);
  const [showRotationGizmo, setShowRotationGizmo] = useState<boolean>(false);
  const [coordSystemMode, setCoordSystemMode] = useState<CoordinateSystemSelection>('auto');
  const [detectedCoordSystem, setDetectedCoordSystem] = useState<CoordinateSystemType | null>(null);

  const handleRotationChange = (newRot: { x: number; y: number; z: number }) => {
    setRotation(newRot);
    setConfig((prev) => ({
      ...prev,
      rotation_x: newRot.x,
      rotation_y: newRot.y,
      rotation_z: newRot.z,
    }));
  };

  const handleResetRotation = () => {
    const zero = { x: 0, y: 0, z: 0 };
    setRotation(zero);
    setConfig((prev) => ({
      ...prev,
      rotation_x: 0,
      rotation_y: 0,
      rotation_z: 0,
    }));
  };

  // Conversion Tasks & Inspection
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [activeTask, setActiveTask] = useState<TaskResponse | null>(null);
  const [inspectData, setInspectData] = useState<InspectResponse | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null);
  const [currentModelMesh, setCurrentModelMesh] = useState<THREE.Object3D | null>(null);
  const [activeArSessionId, setActiveArSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('ar_session');
    }
    return null;
  });
  const [activeArTaskId, setActiveArTaskId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('ar_task');
    }
    return null;
  });


  // 3D Viewport Controls
  const [isSplitView, setIsSplitView] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('shaded');
  const [sectionPlaneActive, setSectionPlaneActive] = useState(false);
  const [sectionOffset, setSectionOffset] = useState(0);
  const [measureToolActive, setMeasureToolActive] = useState(false);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
  const [measureP1, setMeasureP1] = useState<[number, number, number] | null>(null);
  const [measureP2, setMeasureP2] = useState<[number, number, number] | null>(null);
  const [explodedOffset, setExplodedOffset] = useState(0);

  const activePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Shows a readable message for a failed cloud request (silent if the user declined the upload). */
  const reportNodeError = (err: unknown) => {
    if (err instanceof UploadDeclinedError) return;
    const { key, params } = describeNodeError(err);
    if (key) window.alert(t(key, params));
  };

  // Remote config (public node URL, min node version, optional notice)
  useEffect(() => {
    loadRemoteConfig().then((cfg) => {
      const lang = i18n.language;
      const text = cfg.notice?.[lang] || cfg.notice?.[lang.split('-')[0]] || cfg.notice?.en;
      if (!text) return;
      try {
        if (localStorage.getItem('omniseam_notice_seen') === text) return;
        localStorage.setItem('omniseam_notice_seen', text);
      } catch {
        /* ignore */
      }
      window.alert(`${t('node.notice_title')}\n\n${text}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load StoreKit entitlements; show the plan chooser once on first launch (iOS).
  useEffect(() => {
    if (!PAYWALL_ENABLED) return;
    initEntitlements().then(() => {
      if (import.meta.env.VITE_SCREENSHOT_MODE === '1') return;
      try {
        if (localStorage.getItem('omniseam_plan_intro_seen')) return;
        localStorage.setItem('omniseam_plan_intro_seen', '1');
      } catch {
        return;
      }
      if (!can('auto_repair')) setPaywall({ feature: null, welcome: true });
    });
  }, []);

  // Sync initial engine mode
  useEffect(() => {
    apiClient.setEngineMode(engineMode);
  }, [engineMode]);

  // Dynamic SEO & Title Synchronization
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.title = `${t('app_title', 'OmniSeam 3D')} | ${t('app_subtitle', 'Universal 3D Model Converter')}`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', t('tagline'));
    }
  }, [i18n.language, t]);

  // AI Smart Adaptive Intent Synthesis
  useEffect(() => {
    if (!selectedFile) {
      setAdaptiveIntent(null);
      return;
    }

    const intentResult = AdaptiveIntentEngine.analyzeIntent(
      selectedFile,
      config.target_format,
      config,
      inspectData
    );
    setAdaptiveIntent(intentResult);

    if (isAutoAdaptiveActive) {
      setConfig(intentResult.adaptedConfig);
      setEngineMode(intentResult.recommendedEngineMode);
      apiClient.setEngineMode(intentResult.recommendedEngineMode);
    }
  }, [selectedFile, inspectData, config.target_format, isAutoAdaptiveActive]);

  const handleConfigChange = (newConfig: ConversionConfig) => {
    if (newConfig.target_format !== config.target_format) {
      // User changed target format -> re-enable adaptive mode and adopt new format
      setIsAutoAdaptiveActive(true);
      setConfig(newConfig);
    } else {
      // User manually toggled expert checkboxes or strategies
      setIsAutoAdaptiveActive(false);
      setConfig(newConfig);
    }
  };

  const handleResetToAdaptive = () => {
    if (!selectedFile) return;
    setIsAutoAdaptiveActive(true);
    const intentResult = AdaptiveIntentEngine.analyzeIntent(
      selectedFile,
      config.target_format,
      config,
      inspectData
    );
    setAdaptiveIntent(intentResult);
    setConfig(intentResult.adaptedConfig);
    setEngineMode(intentResult.recommendedEngineMode);
    apiClient.setEngineMode(intentResult.recommendedEngineMode);
  };

  const projectFileInputRef = useRef<HTMLInputElement>(null);

  // Handle File Selection: Auto Engine Routing & Auto-Inspect
  const handleFileSelect = async (file: File) => {
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
    setIsAutoAdaptiveActive(true);
    setIsSplitView(false);
    setActiveTask(null);
    setMeasuredDistance(null);
    setMeasureP1(null);
    setMeasureP2(null);
    setRotation({ x: 0, y: 0, z: 0 });
    setCoordSystemMode('auto');
    setDetectedCoordSystem(null);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // Smart Auto Engine Mode Decision
    if (PROPRIETARY_CAD_EXTS.has(ext)) {
      setEngineMode('server');
      apiClient.setEngineMode('server');
      setAutoEngineNotice({
        mode: 'server',
        reason: t('settings.auto_engine_cad_prop_reason', { ext })
      });
      if (!apiClient.getStoredBackendUrl()) {
        setLockedCadFile(file);
        setShowCadUnlockModal(true);
      }
    } else if (['step', 'stp', 'iges', 'igs', 'brep', 'dxf'].includes(ext)) {
      if (apiClient.getStoredBackendUrl()) {
        setEngineMode('server');
        apiClient.setEngineMode('server');
        setAutoEngineNotice({
          mode: 'server',
          reason: t('settings.auto_engine_cad_std_server_reason', { ext })
        });
      } else {
        setEngineMode('client');
        apiClient.setEngineMode('client');
        setAutoEngineNotice({
          mode: 'client',
          reason: t('settings.auto_engine_cad_std_client_reason', { ext })
        });
      }
    } else {
      // Standard Mesh (STL, OBJ, 3MF, PLY, OFF, GLB) -> Pure Client
      setEngineMode('client');
      apiClient.setEngineMode('client');
      setAutoEngineNotice({
        mode: 'client',
        reason: t('settings.auto_engine_mesh_reason', { ext })
      });
    }

    // Public demo node large file guardrail check
    if (engineMode === 'server' && apiClient.isPublicDemoNode() && file.size > PUBLIC_DEMO_MAX_SIZE_BYTES) {
      setPublicLimitFile(file);
      setShowPublicLimitModal(true);
    }

    try {
      const inspect = await apiClient.inspectModel(file, i18n.language);
      setInspectData(inspect);
    } catch (err) {
      console.warn("Auto-inspect fallback:", err);
    }
  };

  // Handle Multi-File Selection
  const handleFilesSelect = async (files: File[]) => {
    if (!files || files.length === 0) return;
    if (files.length > 1 && !can('batch')) {
      requirePro('batch', {
        label: t('plan.secondary_first_file'),
        onClick: () => {
          setPaywall(null);
          handleFileSelect(files[0]);
        },
      });
      return;
    }
    setSelectedFiles(files);
    handleFileSelect(files[0]);
  };

  // Project Lifecycle Handlers
  const handleNewProject = () => {
    projectFileInputRef.current?.click();
  };

  const handleCloseProject = () => {
    if (selectedFile || selectedFiles.length > 0 || tasks.length > 0) {
      if (window.confirm(t('project.close_confirm'))) {
        setSelectedFile(null);
        setSelectedFiles([]);
        setTasks([]);
        setActiveTask(null);
        setInspectData(null);
        setAdaptiveIntent(null);
        setIsAutoAdaptiveActive(true);
        setIsSplitView(false);
        setMeasuredDistance(null);
        setMeasureP1(null);
        setMeasureP2(null);
        setAutoEngineNotice(null);
        setRotation({ x: 0, y: 0, z: 0 });
        setTransformToolActive(false);
        setShowRotationGizmo(false);
        setCoordSystemMode('auto');
        setDetectedCoordSystem(null);
      }
    }
  };

  const handleExportSnapshot = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const baseName = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'model';
      saveOrShareUrl(dataUrl, `OmniSeam_Snapshot_${baseName}_${Date.now()}.png`).catch((err) =>
        console.error('Snapshot save failed:', err)
      );
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (err) {
      console.error("Snapshot error:", err);
    }
  };

  // Start Conversion Pipeline (Supports Single & Multi-File Batch Queue)
  const handleStartConvert = async (configOverride?: ConversionConfig) => {
    const filesToConvert = selectedFiles.length > 0 ? selectedFiles : (selectedFile ? [selectedFile] : []);
    if (filesToConvert.length === 0) return;
    const config = configOverride ?? baseConfig;

    // Plan gate: Basic converts mesh formats as-is; repair, CAD, cloud and batch need Pro.
    const needed = requiredFeatureForConvert(filesToConvert, config, engineMode);
    if (needed && !can(needed)) {
      const freeFallback = needed === 'auto_repair' || needed === 'draco';
      requirePro(needed, freeFallback ? {
        label: t('plan.secondary_convert_as_is'),
        onClick: () => {
          setPaywall(null);
          handleStartConvert(toBasicConfig(config));
        },
      } : null);
      return;
    }

    for (const file of filesToConvert) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (PROPRIETARY_CAD_EXTS.has(ext) && engineMode === 'client' && !apiClient.getStoredBackendUrl()) {
        setLockedCadFile(file);
        setShowCadUnlockModal(true);
        return;
      }
      if (engineMode === 'server' && apiClient.isPublicDemoNode() && file.size > PUBLIC_DEMO_MAX_SIZE_BYTES) {
        setPublicLimitFile(file);
        setShowPublicLimitModal(true);
        return;
      }
    }

    setIsProcessing(true);

    if (filesToConvert.length > 1) {
      // Multi-file batch queue processing
      try {
        for (const file of filesToConvert) {
          if (engineMode === 'client') {
            const res = await apiClient.convertModel(
              file,
              config,
              i18n.language,
              (pTask) => {
                setTasks((prev) => {
                  const idx = prev.findIndex((t) => t.task_id === pTask.task_id);
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = pTask;
                    return next;
                  }
                  return [pTask, ...prev];
                });
              }
            );
            setActiveTask(res);
          } else {
            const initialTask = await apiClient.convertModel(file, config, i18n.language);
            setTasks((prev) => [initialTask, ...prev]);
            setActiveTask(initialTask);

            let isDone = false;
            while (!isDone) {
              await new Promise((r) => setTimeout(r, 800));
              const updated = await apiClient.getTaskStatus(initialTask.task_id);
              setTasks((prev) => prev.map((t) => (t.task_id === updated.task_id ? updated : t)));
              if (updated.status === 'completed' || updated.status === 'failed') {
                isDone = true;
                if (updated.status === 'completed') {
                  setActiveTask(updated);
                }
              }
            }
          }
        }
        setIsProcessing(false);
        setIsSplitView(true);
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (err) {
        console.error("Batch conversion error:", err);
        setIsProcessing(false);
        reportNodeError(err);
      }
      return;
    }

    // Single File processing
    const singleFile = filesToConvert[0];
    try {
      if (engineMode === 'client') {
        const resultTask = await apiClient.convertModel(
          singleFile,
          config,
          i18n.language,
          (progressTask) => {
            setActiveTask(progressTask);
            setTasks((prev) => {
              const existingIdx = prev.findIndex((t) => t.task_id === progressTask.task_id);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = progressTask;
                return next;
              }
              return [progressTask, ...prev];
            });
          }
        );

        setActiveTask(resultTask);
        setIsProcessing(false);
        setIsSplitView(true);
        setShowAuditModal(true);
        if (resultTask.status === 'completed') recordSuccessfulConversion(APP_VERSION);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        const initialTask = await apiClient.convertModel(singleFile, config, i18n.language);
        setTasks((prev) => [initialTask, ...prev]);
        setActiveTask(initialTask);

        if (activePollingRef.current) clearInterval(activePollingRef.current);
        const pollInterval = setInterval(async () => {
          try {
            const updated = await apiClient.getTaskStatus(initialTask.task_id);
            setActiveTask(updated);
            setTasks((prev) => prev.map((t) => (t.task_id === updated.task_id ? updated : t)));

            if (updated.status === 'completed' || updated.status === 'failed') {
              clearInterval(pollInterval);
              setIsProcessing(false);

              if (updated.status === 'failed' && updated.error?.message) {
                window.alert(t('node.failed', { message: updated.error.message }));
              }
              if (updated.status === 'completed') {
                setIsSplitView(true);
                setShowAuditModal(true);
                recordSuccessfulConversion(APP_VERSION);
                confetti({
                  particleCount: 80,
                  spread: 70,
                  origin: { y: 0.6 },
                });
              }
            }
          } catch (pollErr) {
            console.error("Polling error:", pollErr);
            clearInterval(pollInterval);
            setIsProcessing(false);
            reportNodeError(pollErr);
          }
        }, 1000);
        activePollingRef.current = pollInterval;
      }
    } catch (err) {
      console.error("Conversion failed:", err);
      setIsProcessing(false);
      reportNodeError(err);
    }
  };

  // Batch Download All Converted Files as a ZIP Archive
  const handleDownloadAllZip = async () => {
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    if (completedTasks.length === 0) return;
    if (!requirePro('batch')) return;

    setIsDownloadingZip(true);
    try {
      const entries: ZipEntry[] = [];
      for (const task of completedTasks) {
        const baseName = task.filename.substring(0, task.filename.lastIndexOf('.')) || task.filename;
        const entryFilename = `${baseName}_omniseam.${task.target_format}`;
        const downloadUrl = apiClient.getDownloadUrl(task);

        const resp = await fetch(downloadUrl);
        const blob = await resp.blob();
        const arrayBuffer = await blob.arrayBuffer();

        entries.push({
          filename: entryFilename,
          data: arrayBuffer,
        });
      }

      const zipBlob = await ZipPackager.createZip(entries);
      await saveOrShareFile(zipBlob, `OmniSeam3D_Batch_Export_${Date.now()}.zip`);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (err) {
      console.error("ZIP packaging error:", err);
      reportNodeError(err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Launch Mobile AR Quick Look / Google Scene Viewer
  const handleLaunchDirectAr = async () => {
    const previewUrl = activeTask?.status === 'completed'
      ? (activeTask.preview_url || apiClient.getPreviewUrl(activeTask.task_id))
      : undefined;

    if (currentModelMesh) {
      await ArManager.launchAr(currentModelMesh, previewUrl, selectedFile?.name);
    } else {
      const scene = new THREE.Scene();
      const geom = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ color: 0x6366f1 });
      scene.add(new THREE.Mesh(geom, mat));
      await ArManager.launchAr(scene, previewUrl, selectedFile?.name);
    }
  };

  // Inspect Only
  const handleInspectOnly = async () => {
    if (!selectedFile) return;
    try {
      const res = await apiClient.inspectModel(selectedFile, i18n.language);
      setInspectData(res);
      setShowAuditModal(true);
    } catch (err) {
      console.error("Inspect error:", err);
      reportNodeError(err);
    }
  };

  const handleSelectPreviewTask = (task: TaskResponse) => {
    setActiveTask(task);
    setIsSplitView(true);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
    if (activeTask?.task_id === taskId) {
      setActiveTask(null);
      setIsSplitView(false);
    }
  };

  const handleClearAllTasks = () => {
    if (window.confirm(t('tasks.clear_all_confirm'))) {
      setTasks([]);
      setActiveTask(null);
      setIsSplitView(false);
    }
  };

  useEffect(() => {
    return () => {
      if (activePollingRef.current) clearInterval(activePollingRef.current);
    };
  }, []);

  // App Store screenshot automation: only compiled in with VITE_SCREENSHOT_MODE=1
  // (scripts/app-store-screenshots.sh). Production builds drop this block.
  const screenshotApiRef = useRef<() => import('./platform/screenshot-mode').ScreenshotApi>();
  screenshotApiRef.current = () => ({
    changeLanguage: (lang: string) => i18n.changeLanguage(lang),
    loadFile: (file: File) => handleFileSelect(file),
    setConfig: (update) => setConfig(update),
    disableAutoAdaptive: () => setIsAutoAdaptiveActive(false),
    startConvert: () => handleStartConvert(),
    closeAuditModal: () => setShowAuditModal(false),
    openArModal: () => setShowArModal(true),
    launchAr: () => handleLaunchDirectAr(),
    setDisplayMode: (mode) => setDisplayMode(mode),
    isModelLoaded: () => currentModelMesh !== null,
  });
  useEffect(() => {
    if (import.meta.env.VITE_SCREENSHOT_MODE === '1') {
      import('./platform/screenshot-mode').then((m) =>
        m.runScreenshotScene(() => screenshotApiRef.current!())
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Files opened from the iOS Files app / Share Sheet ("Open in OmniSeam 3D")
  const handleFileSelectRef = useRef(handleFileSelect);
  handleFileSelectRef.current = handleFileSelect;
  useEffect(() => {
    const onOpenFile = (e: Event) => {
      const file = (e as CustomEvent<File>).detail;
      if (file) handleFileSelectRef.current(file);
    };
    window.addEventListener(OPEN_FILE_EVENT, onOpenFile);
    return () => window.removeEventListener(OPEN_FILE_EVENT, onOpenFile);
  }, []);

  const defectPoints = inspectData ? {
    holes: inspectData.defects.hole_boundary_points,
    nonManifold: inspectData.defects.non_manifold_points,
  } : undefined;

  const repairedPreviewUrl = customPreviewUrl || (activeTask?.status === 'completed'
    ? activeTask.preview_url || apiClient.getPreviewUrl(activeTask.task_id)
    : null);


  if (activeArSessionId || activeArTaskId) {
    return (
      <MobileArView
        sessionId={activeArSessionId}
        taskId={activeArTaskId}
        onExit={() => {
          setActiveArSessionId(null);
          setActiveArTaskId(null);
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-slate-100 selection:bg-brand-500 selection:text-white">
      {/* Hidden file input for Project actions */}
      <input
        ref={projectFileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />

      <Navbar 
        engineMode={engineMode}
        onOpenBackendSettings={() => setShowBackendModal(true)}
        onOpenManual={() => setShowManualModal(true)}
        onOpenPrivacy={() => setShowPrivacyModal(true)}
        onOpenPlan={PAYWALL_ENABLED ? () => setPaywall({ feature: null }) : undefined}
        planTier={entitlements.tier}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Top Hero / Tagline */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
              <span className="whitespace-nowrap">{t('app_title')}</span>
              <span className="text-brand-400 text-sm font-normal"><span className="hidden sm:inline">| </span>{t('app_subtitle')}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('tagline')}
            </p>
          </div>
        </div>

        {/* Main Grid: Viewport & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: 3D Viewport & Toolbar (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <Toolbar
              onNewProject={handleNewProject}
              onCloseProject={handleCloseProject}
              onExportSnapshot={handleExportSnapshot}
              selectedFileName={selectedFile?.name}
              fileSizeBytes={selectedFile?.size}
              vertexCount={inspectData?.metrics.vertices_count}
              faceCount={inspectData?.metrics.faces_count}
              isWatertight={inspectData?.is_watertight}

              isSplitView={isSplitView}
              onToggleSplitView={() => setIsSplitView(!isSplitView)}
              displayMode={displayMode}
              onChangeDisplayMode={setDisplayMode}
              sectionPlaneActive={sectionPlaneActive}
              onToggleSectionPlane={() => setSectionPlaneActive(!sectionPlaneActive)}
              sectionOffset={sectionOffset}
              onChangeSectionOffset={setSectionOffset}
              measureToolActive={measureToolActive}
              onToggleMeasureTool={() => setMeasureToolActive(!measureToolActive)}
              explodedOffset={explodedOffset}
              onChangeExplodedOffset={setExplodedOffset}
              onResetCamera={() => {}}
              onOpenArPreview={() => setShowArModal(true)}
              onOpenWindTunnel={() => requirePro('wind_tunnel') && setShowWindTunnelModal(true)}
              hasRepairedModel={Boolean(repairedPreviewUrl)}
              transformToolActive={transformToolActive}
              onToggleTransformTool={() => setTransformToolActive(prev => !prev)}
              hasRotation={rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0}
              coordSystemMode={coordSystemMode}
              onChangeCoordSystemMode={setCoordSystemMode}
              detectedCoordSystemLabel={detectedCoordSystem ? t(`coord.${detectedCoordSystem}_short`) : undefined}
            />

            {/* Non-Overlapping Horizontal Model Transform Toolbar */}
            {transformToolActive && selectedFile && (
              <ModelTransformToolbar
                rotation={rotation}
                onChangeRotation={handleRotationChange}
                showRotationGizmo={showRotationGizmo}
                onToggleRotationGizmo={() => setShowRotationGizmo((prev) => !prev)}
                onResetRotation={handleResetRotation}
                onClose={() => setTransformToolActive(false)}
              />
            )}

            {/* 3D Canvas Area */}
            <div data-shot="viewer" className="w-full min-h-[380px] sm:min-h-[460px] lg:h-[520px] relative">
              {isSplitView && repairedPreviewUrl ? (
                <SplitViewer3D
                  originalFile={selectedFile}
                  repairedUrl={repairedPreviewUrl}
                  displayMode={displayMode}
                  sectionPlaneActive={sectionPlaneActive}
                  sectionOffset={sectionOffset}
                  measureToolActive={measureToolActive}
                  onMeasureDistance={(dist, p1, p2) => {
                    setMeasuredDistance(dist);
                    setMeasureP1(p1);
                    setMeasureP2(p2);
                  }}
                  defectPoints={defectPoints}
                  onModelLoaded={(mesh) => setCurrentModelMesh(mesh)}
                  rotation={rotation}
                  onChangeRotation={handleRotationChange}
                  showRotationGizmo={showRotationGizmo}
                  coordSystemMode={coordSystemMode}
                  onDetectedCoordSystem={setDetectedCoordSystem}
                />
              ) : (
                <Viewer3D
                  modelFile={selectedFile}
                  modelUrl={repairedPreviewUrl}
                  displayMode={displayMode}
                  sectionPlaneActive={sectionPlaneActive}
                  sectionOffset={sectionOffset}
                  measureToolActive={measureToolActive}
                  onMeasureDistance={(dist, p1, p2) => {
                    setMeasuredDistance(dist);
                    setMeasureP1(p1);
                    setMeasureP2(p2);
                  }}
                  defectPoints={defectPoints}
                  title={selectedFile ? selectedFile.name : undefined}
                  onModelLoaded={(mesh) => setCurrentModelMesh(mesh)}
                  rotation={rotation}
                  onChangeRotation={handleRotationChange}
                  showRotationGizmo={showRotationGizmo}
                  coordSystemMode={coordSystemMode}
                  onDetectedCoordSystem={setDetectedCoordSystem}
                />
              )}
            </div>

            {/* Measure Tool Readout */}
            {measureToolActive && (
              <MeasureTool
                distance={measuredDistance}
                point1={measureP1}
                point2={measureP2}
                boundingBox={inspectData?.metrics.bounding_box}
              />
            )}
          </div>

          {/* Right Column: Upload, Settings, Tasks (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <Dropzone
              onFileSelected={handleFileSelect}
              onFilesSelected={handleFilesSelect}
              selectedFile={selectedFile}
              batchFilesCount={selectedFiles.length}
              isLoading={isProcessing}
            />

            <TargetFormatCard
              targetFormat={config.target_format}
              onChangeTargetFormat={(fmt) => handleConfigChange({ ...config, target_format: fmt })}
              disabled={isProcessing}
            />

            <SettingsPanel
              config={config}
              onChangeConfig={handleConfigChange}
              onStartConvert={() => handleStartConvert()}
              onInspectOnly={handleInspectOnly}
              disabled={!selectedFile && selectedFiles.length === 0}
              isProcessing={isProcessing}
              engineMode={engineMode}
              autoEngineNotice={autoEngineNotice}
              adaptiveIntent={adaptiveIntent}
              isAutoAdaptiveActive={isAutoAdaptiveActive}
              onResetToAdaptive={handleResetToAdaptive}
              selectedFile={selectedFile}
              onChangeEngineMode={(m) => {
                setIsAutoAdaptiveActive(false);
                setEngineMode(m);
                apiClient.setEngineMode(m);
              }}
              onOpenBackendSettings={() => setShowBackendModal(true)}
              onRequirePro={(f) => requirePro(f)}
            />


            <TaskHistory
              tasks={tasks}
              onSelectPreview={handleSelectPreviewTask}
              onDeleteTask={handleDeleteTask}
              onClearAll={handleClearAllTasks}
              onDownloadAllZip={handleDownloadAllZip}
              isDownloadingZip={isDownloadingZip}
              activeTaskId={activeTask?.task_id}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer 
        onOpenManual={() => setShowManualModal(true)}
        onOpenPrivacy={() => setShowPrivacyModal(true)}
        onOpenBackendSettings={() => setShowBackendModal(true)}
        onOpenLicenses={() => setShowLicensesModal(true)}
      />

      {/* User Manual Modal */}
      <UserManualModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onOpenBackendSettings={() => setShowBackendModal(true)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      {/* AR Preview Modal */}
      <ArPreviewModal
        isOpen={showArModal}
        onClose={() => setShowArModal(false)}
        modelName={selectedFile?.name}
        currentModelMesh={currentModelMesh}
        modelFile={selectedFile}
        previewUrl={repairedPreviewUrl}
        activeTaskId={activeTask?.task_id}
        onLaunchDirectAr={handleLaunchDirectAr}
        isMobileDevice={ArManager.getArPlatform() !== 'desktop'}
      />

      {/* Wind Tunnel Fluid Domain Modal */}
      <WindTunnelModal
        isOpen={showWindTunnelModal}
        file={selectedFile}
        selectedFileName={selectedFile?.name}
        onClose={() => setShowWindTunnelModal(false)}
        onLoadPreviewUrl={(url) => setCustomPreviewUrl(url)}
      />



      {/* Backend Settings Modal */}
      <BackendSettingsModal
        isOpen={showBackendModal}
        onClose={() => setShowBackendModal(false)}
        onBackendConnected={(url) => {
          setEngineMode('server');
          apiClient.setEngineMode('server');
        }}
      />

      {/* Native CAD Unlock Modal */}
      <CadUnlockModal
        isOpen={showCadUnlockModal}
        fileName={lockedCadFile?.name}
        onClose={() => setShowCadUnlockModal(false)}
        onOpenBackendSettings={() => setShowBackendModal(true)}
      />

      {/* Public Demo Node File Limit Guardrail Modal */}
      <UploadConsentModal />
      <LicensesModal isOpen={showLicensesModal} onClose={() => setShowLicensesModal(false)} />

      <PublicLimitModal
        isOpen={showPublicLimitModal}
        fileSizeMb={publicLimitFile ? publicLimitFile.size / (1024 * 1024) : 0}
        fileName={publicLimitFile?.name}
        onClose={() => setShowPublicLimitModal(false)}
        onOpenSettings={() => setShowBackendModal(true)}
      />

      {/* Audit Modal */}
      {showAuditModal && (
        <AuditReport
          report={activeTask?.report}
          inspectData={inspectData}
          onClose={() => setShowAuditModal(false)}
          onRequirePro={() => requirePro('report_export')}
        />
      )}

      {/* Basic / Pro plan chooser & paywall */}
      <PaywallModal
        isOpen={paywall !== null}
        feature={paywall?.feature ?? null}
        welcome={paywall?.welcome}
        secondaryAction={paywall?.secondary}
        onClose={() => setPaywall(null)}
      />
    </div>
  );
};

