import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import * as THREE from 'three';

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
import { WindTunnelModal } from './components/WindTunnelModal';
import { Footer } from './components/Footer';
import { PaywallModal } from './components/PaywallModal';
import { UploadConsentModal } from './components/UploadConsentModal';
import { LicensesModal } from './components/LicensesModal';

import { DisplayMode, TaskResponse } from './types';
import { apiClient } from './api/client';
import { saveOrShareUrl } from './platform/native';
import { loadRemoteConfig } from './platform/remote-config';
import { ArManager } from './engine/ar-manager';
import { CoordinateSystemSelection, CoordinateSystemType } from './engine/coordinate-system-manager';
import { usePaywall } from './hooks/usePaywall';
import { useEngineMode } from './hooks/useEngineMode';
import { useModelLoader } from './hooks/useModelLoader';
import { useConversionSettings } from './hooks/useConversionSettings';
import { useConversion } from './hooks/useConversion';
import { useNodeErrorReporter } from './hooks/useNodeErrorReporter';

type Vec3 = { x: number; y: number; z: number };
const ZERO_ROTATION: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * App shell: wires the feature hooks (plan, model loading, settings,
 * conversion) to the layout and owns the 3D viewport / modal UI state.
 */
export const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const reportNodeError = useNodeErrorReporter();

  // ── Modals ────────────────────────────────────────────────────────────────
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
  const [showAuditModal, setShowAuditModal] = useState(false);

  // ── 3D viewport state ─────────────────────────────────────────────────────
  const [isSplitView, setIsSplitView] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('shaded');
  const [sectionPlaneActive, setSectionPlaneActive] = useState(false);
  const [sectionOffset, setSectionOffset] = useState(0);
  const [measureToolActive, setMeasureToolActive] = useState(false);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
  const [measureP1, setMeasureP1] = useState<[number, number, number] | null>(null);
  const [measureP2, setMeasureP2] = useState<[number, number, number] | null>(null);
  const [rotation, setRotation] = useState<Vec3>(ZERO_ROTATION);
  const [transformToolActive, setTransformToolActive] = useState(false);
  const [showRotationGizmo, setShowRotationGizmo] = useState(false);
  const [coordSystemMode, setCoordSystemMode] = useState<CoordinateSystemSelection>('auto');
  const [detectedCoordSystem, setDetectedCoordSystem] = useState<CoordinateSystemType | null>(null);
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null);
  const [currentModelMesh, setCurrentModelMesh] = useState<THREE.Object3D | null>(null);

  /** Clears per-model view state (measurements, rotation, coordinate system). */
  const resetViewForNewModel = () => {
    setIsSplitView(false);
    setMeasuredDistance(null);
    setMeasureP1(null);
    setMeasureP2(null);
    setRotation(ZERO_ROTATION);
    setCoordSystemMode('auto');
    setDetectedCoordSystem(null);
  };

  const openCadUnlock = (file: File) => {
    setLockedCadFile(file);
    setShowCadUnlockModal(true);
  };
  const openPublicLimit = (file: File) => {
    setPublicLimitFile(file);
    setShowPublicLimitModal(true);
  };

  // ── Feature hooks ─────────────────────────────────────────────────────────
  const { entitlements, paywall, requirePro, openPlan, closePaywall, showScreenshotPaywall } = usePaywall();
  const [engineMode, setEngineMode] = useEngineMode();

  // Late-bound so the loader can reset settings/tasks that are declared after it.
  const onModelChangedRef = useRef<() => void>(() => {});
  const {
    selectedFile,
    selectedFiles,
    inspectData,
    selectFile: handleFileSelect,
    selectFiles: handleFilesSelect,
    reinspect,
    clearModel,
  } = useModelLoader({
    setEngineMode,
    requirePro,
    closePaywall,
    onCadNeedsNode: openCadUnlock,
    onPublicNodeLimit: openPublicLimit,
    onModelChanged: () => onModelChangedRef.current(),
  });

  const settings = useConversionSettings(selectedFile, inspectData, setEngineMode);
  const { config, adaptiveIntent, isAutoAdaptiveActive } = settings;

  const conversion = useConversion({
    selectedFile,
    selectedFiles,
    config,
    engineMode,
    requirePro,
    closePaywall,
    onCadNeedsNode: openCadUnlock,
    onPublicNodeLimit: openPublicLimit,
    onFinished: ({ showReport }) => {
      setIsSplitView(true);
      if (showReport) setShowAuditModal(true);
    },
  });
  const { tasks, activeTask, isProcessing, isDownloadingZip } = conversion;

  onModelChangedRef.current = () => {
    settings.resetForNewModel();
    conversion.setActiveTask(null);
    resetViewForNewModel();
  };

  // ── Startup ───────────────────────────────────────────────────────────────
  // Remote config: public node URL, minimum node version, optional notice.
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

  // Keep <html lang> in sync for VoiceOver pronunciation.
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRotationChange = (rot: Vec3) => {
    setRotation(rot);
    settings.setRotation(rot);
  };
  const handleResetRotation = () => handleRotationChange(ZERO_ROTATION);

  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const handleNewProject = () => projectFileInputRef.current?.click();

  const handleCloseProject = () => {
    if (!selectedFile && selectedFiles.length === 0 && tasks.length === 0) return;
    if (!window.confirm(t('project.close_confirm'))) return;
    clearModel();
    conversion.clearTasks();
    settings.resetForNewModel();
    resetViewForNewModel();
    setTransformToolActive(false);
    setShowRotationGizmo(false);
  };

  const handleExportSnapshot = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    try {
      const baseName = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'model';
      saveOrShareUrl(canvas.toDataURL('image/png'), `OmniSeam_Snapshot_${baseName}_${Date.now()}.png`).catch((err) =>
        console.error('Snapshot save failed:', err)
      );
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    } catch (err) {
      console.error('Snapshot error:', err);
    }
  };

  const handleStartConvert = conversion.startConvert;
  const handleDownloadAllZip = conversion.downloadAllZip;

  const handleInspectOnly = async () => {
    try {
      if (await reinspect()) setShowAuditModal(true);
    } catch (err) {
      console.error('Inspect error:', err);
      reportNodeError(err);
    }
  };

  /** Opens the model in AR Quick Look (iOS) or Scene Viewer (Android). */
  const handleLaunchDirectAr = async () => {
    const previewUrl = activeTask?.status === 'completed'
      ? activeTask.preview_url || apiClient.getPreviewUrl(activeTask.task_id)
      : undefined;
    const object = currentModelMesh ?? (() => {
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x6366f1 })));
      return scene;
    })();
    await ArManager.launchAr(object, previewUrl, selectedFile?.name);
  };

  const handleSelectPreviewTask = (task: TaskResponse) => {
    conversion.setActiveTask(task);
    setIsSplitView(true);
  };

  const handleDeleteTask = (taskId: string) => {
    if (conversion.deleteTask(taskId)) setIsSplitView(false);
  };

  const handleClearAllTasks = () => {
    if (!window.confirm(t('tasks.clear_all_confirm'))) return;
    conversion.clearTasks();
    setIsSplitView(false);
  };

  // App Store screenshot automation: only compiled in with VITE_SCREENSHOT_MODE=1
  // (scripts/app-store-screenshots.sh). Production builds drop this block.
  const screenshotApiRef = useRef<() => import('./platform/screenshot-mode').ScreenshotApi>();
  screenshotApiRef.current = () => ({
    changeLanguage: (lang: string) => i18n.changeLanguage(lang),
    loadFile: (file: File) => handleFileSelect(file),
    setConfig: (update) => settings.setConfig(update),
    disableAutoAdaptive: () => settings.setIsAutoAdaptiveActive(false),
    startConvert: () => handleStartConvert(),
    closeAuditModal: () => setShowAuditModal(false),
    openArModal: () => setShowArModal(true),
    launchAr: () => handleLaunchDirectAr(),
    setDisplayMode: (mode) => setDisplayMode(mode),
    isModelLoaded: () => currentModelMesh !== null,
    showPaywall: showScreenshotPaywall,
  });
  useEffect(() => {
    if (import.meta.env.VITE_SCREENSHOT_MODE === '1') {
      import('./platform/screenshot-mode').then((m) =>
        m.runScreenshotScene(() => screenshotApiRef.current!())
      );
    }
  }, []);

  // ── Derived view data ─────────────────────────────────────────────────────
  const defectPoints = inspectData ? {
    holes: inspectData.defects.hole_boundary_points,
    nonManifold: inspectData.defects.non_manifold_points,
  } : undefined;

  const repairedPreviewUrl = customPreviewUrl || (activeTask?.status === 'completed'
    ? activeTask.preview_url || apiClient.getPreviewUrl(activeTask.task_id)
    : null);

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
        onOpenPlan={openPlan}
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
              onChangeTargetFormat={(fmt) => settings.changeConfig({ ...config, target_format: fmt })}
              disabled={isProcessing}
            />

            <SettingsPanel
              config={config}
              onChangeConfig={settings.changeConfig}
              onStartConvert={() => handleStartConvert()}
              onInspectOnly={handleInspectOnly}
              disabled={!selectedFile && selectedFiles.length === 0}
              isProcessing={isProcessing}
              engineMode={engineMode}
              adaptiveIntent={adaptiveIntent}
              isAutoAdaptiveActive={isAutoAdaptiveActive}
              onResetToAdaptive={settings.resetToAdaptive}
              selectedFile={selectedFile}
              onChangeEngineMode={(m) => {
                settings.setIsAutoAdaptiveActive(false);
                setEngineMode(m);
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
        onLaunchDirectAr={handleLaunchDirectAr}
        isArSupported={ArManager.getArPlatform() !== 'desktop'}
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
        onBackendConnected={() => setEngineMode('server')}
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
        onClose={closePaywall}
      />
    </div>
  );
};
