import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';

import { Navbar } from './components/Navbar';
import { Dropzone } from './components/Dropzone';
import { Toolbar } from './components/Toolbar';
import { Viewer3D } from './components/Viewer3D';
import { SplitViewer3D } from './components/SplitViewer3D';
import { SettingsPanel } from './components/SettingsPanel';
import { AuditReport } from './components/AuditReport';
import { TaskHistory } from './components/TaskHistory';
import { MeasureTool } from './components/MeasureTool';
import { BackendSettingsModal } from './components/BackendSettingsModal';
import { CadUnlockModal } from './components/CadUnlockModal';
import { PublicLimitModal } from './components/PublicLimitModal';

import { 
  ConversionConfig, 
  DisplayMode, 
  InspectResponse, 
  TaskResponse 
} from './types';
import { apiClient, EngineMode, PUBLIC_DEMO_MAX_SIZE_BYTES } from './api/client';


const DEFAULT_CONFIG: ConversionConfig = {
  target_format: 'glb',
  cad_linear_deflection: 0.005,
  cad_angular_deflection: 0.1,
  enable_sewing: true,
  sewing_tolerance: 0.001,
  auto_fill_holes: true,
  fix_non_manifold: true,
  unify_normals: true,
  remove_degenerate: true,
  weld_vertices: true,
  compress_gltf: true,
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
  const [autoEngineNotice, setAutoEngineNotice] = useState<{ mode: EngineMode; reason: string } | null>(null);

  // File and Configuration State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [config, setConfig] = useState<ConversionConfig>(DEFAULT_CONFIG);
  const [isProcessing, setIsProcessing] = useState(false);

  // Conversion Tasks & Inspection
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [activeTask, setActiveTask] = useState<TaskResponse | null>(null);
  const [inspectData, setInspectData] = useState<InspectResponse | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

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

  // Sync initial engine mode
  useEffect(() => {
    apiClient.setEngineMode(engineMode);
  }, [engineMode]);

  // Handle File Selection: Auto Engine Routing & Auto-Inspect
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsSplitView(false);
    setActiveTask(null);
    setMeasuredDistance(null);
    setMeasureP1(null);
    setMeasureP2(null);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // Smart Auto Engine Mode Decision
    if (PROPRIETARY_CAD_EXTS.has(ext)) {
      setEngineMode('server');
      apiClient.setEngineMode('server');
      setAutoEngineNotice({
        mode: 'server',
        reason: `檢測到原廠專有 CAD / BIM 格式 (.${ext})，已自動為您配置【雲端算力節點】進行精確 B-Rep 幾何拓撲縫合。`
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
          reason: `檢測到工業 CAD 格式 (.${ext})，已自動配置【雲端專屬節點】以確保最高幾何精度與曲面離散化。`
        });
      } else {
        setEngineMode('client');
        apiClient.setEngineMode('client');
        setAutoEngineNotice({
          mode: 'client',
          reason: `檢測到 CAD 格式 (.${ext})，已配置【純前端離線模式】於瀏覽器內部極速運算。`
        });
      }
    } else {
      // Standard Mesh (STL, OBJ, 3MF, PLY, OFF, GLB) -> Pure Client
      setEngineMode('client');
      apiClient.setEngineMode('client');
      setAutoEngineNotice({
        mode: 'client',
        reason: `檢測為通用網格格式 (.${ext})，已自動套用【純前端離線模式】，100% 本機極速運算，隱私零洩漏且零伺服器等待。`
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

  // Start Conversion Pipeline
  const handleStartConvert = async () => {
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    if (PROPRIETARY_CAD_EXTS.has(ext) && engineMode === 'client' && !apiClient.getStoredBackendUrl()) {
      setLockedCadFile(selectedFile);
      setShowCadUnlockModal(true);
      return;
    }

    // Fair usage public demo node guardrail check
    if (engineMode === 'server' && apiClient.isPublicDemoNode() && selectedFile.size > PUBLIC_DEMO_MAX_SIZE_BYTES) {
      setPublicLimitFile(selectedFile);
      setShowPublicLimitModal(true);
      return;
    }


    setIsProcessing(true);

    try {
      if (engineMode === 'client') {
        // Pure Client-Side Execution (Local in-browser)
        const resultTask = await apiClient.convertModel(
          selectedFile,
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
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        // Cloud Server Execution (FastAPI Background Task)
        const initialTask = await apiClient.convertModel(selectedFile, config, i18n.language);
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

              if (updated.status === 'completed') {
                setIsSplitView(true);
                setShowAuditModal(true);
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
          }
        }, 1000);
        activePollingRef.current = pollInterval;
      }
    } catch (err) {
      console.error("Conversion failed:", err);
      setIsProcessing(false);
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
    if (window.confirm(t('tasks.clear_all_confirm', '確定要清除所有歷史任務紀錄嗎？'))) {
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

  const defectPoints = inspectData ? {
    holes: inspectData.defects.hole_boundary_points,
    nonManifold: inspectData.defects.non_manifold_points,
  } : undefined;

  const repairedPreviewUrl = activeTask?.status === 'completed'
    ? activeTask.preview_url || apiClient.getPreviewUrl(activeTask.task_id)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-slate-100 selection:bg-brand-500 selection:text-white">
      <Navbar 
        onOpenAudit={() => setShowAuditModal(true)} 
        hasAudit={Boolean(activeTask?.report || inspectData)}
        engineMode={engineMode}
        onOpenBackendSettings={() => setShowBackendModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Top Hero / Tagline */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{t('app_title')}</span>
              <span className="text-brand-400 text-sm font-normal">| {t('app_subtitle')}</span>
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
              hasRepairedModel={Boolean(repairedPreviewUrl)}
            />

            {/* 3D Canvas Area */}
            <div className="w-full h-[520px]">
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
              selectedFile={selectedFile}
              isLoading={isProcessing}
            />

            <SettingsPanel
              config={config}
              onChangeConfig={setConfig}
              onStartConvert={handleStartConvert}
              onInspectOnly={handleInspectOnly}
              disabled={!selectedFile}
              isProcessing={isProcessing}
              engineMode={engineMode}
              autoEngineNotice={autoEngineNotice}
              onChangeEngineMode={(m) => {
                setEngineMode(m);
                apiClient.setEngineMode(m);
              }}
              onOpenBackendSettings={() => setShowBackendModal(true)}
            />


            <TaskHistory
              tasks={tasks}
              onSelectPreview={handleSelectPreviewTask}
              onDeleteTask={handleDeleteTask}
              onClearAll={handleClearAllTasks}
              activeTaskId={activeTask?.task_id}
            />
          </div>
        </div>
      </main>

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
        />
      )}
    </div>
  );
};

