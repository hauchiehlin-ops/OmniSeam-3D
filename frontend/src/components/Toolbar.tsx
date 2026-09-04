import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Columns, 
  Scissors, 
  Ruler, 
  RotateCcw,
  PlusCircle,
  FolderX,
  Camera,
  Layers,
  Box,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { DisplayMode } from '../types';

interface ToolbarProps {
  // Project actions
  onNewProject: () => void;
  onCloseProject: () => void;
  onExportSnapshot: () => void;
  selectedFileName?: string | null;
  fileSizeBytes?: number;
  vertexCount?: number;
  faceCount?: number;
  isWatertight?: boolean | null;

  // Viewport & Mode controls
  isSplitView: boolean;
  onToggleSplitView: () => void;
  displayMode: DisplayMode;
  onChangeDisplayMode: (mode: DisplayMode) => void;
  sectionPlaneActive: boolean;
  onToggleSectionPlane: () => void;
  sectionOffset: number;
  onChangeSectionOffset: (val: number) => void;
  measureToolActive: boolean;
  onToggleMeasureTool: () => void;
  explodedOffset: number;
  onChangeExplodedOffset: (val: number) => void;
  onResetCamera: () => void;
  onOpenArPreview?: () => void;
  hasRepairedModel: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onNewProject,
  onCloseProject,
  onExportSnapshot,
  selectedFileName,
  fileSizeBytes = 0,
  vertexCount,
  faceCount,
  isWatertight,

  isSplitView,
  onToggleSplitView,
  displayMode,
  onChangeDisplayMode,
  sectionPlaneActive,
  onToggleSectionPlane,
  sectionOffset,
  onChangeSectionOffset,
  measureToolActive,
  onToggleMeasureTool,
  explodedOffset,
  onChangeExplodedOffset,
  onResetCamera,
  onOpenArPreview,
  hasRepairedModel
}) => {
  const { t } = useTranslation();

  const hasLoadedModel = Boolean(selectedFileName);

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-dark-surface/95 border border-dark-border rounded-2xl backdrop-blur-md shadow-lg">
      {/* Top Row: Project Lifecycle & Live Model Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-dark-border/60">
        {/* Project Lifecycle Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onNewProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/20 border border-brand-500/40 text-brand-300 hover:bg-brand-600/30 hover:text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
            title={t('project.new_project')}
          >
            <PlusCircle className="w-3.5 h-3.5 text-brand-400" />
            <span>{t('project.new_project')}</span>
          </button>

          <button
            type="button"
            onClick={onCloseProject}
            disabled={!hasLoadedModel}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              hasLoadedModel
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 active:scale-95'
                : 'bg-dark-panel border-dark-border text-slate-500 opacity-50 cursor-not-allowed'
            }`}
            title={t('project.close_project')}
          >
            <FolderX className="w-3.5 h-3.5 text-rose-400" />
            <span>{t('project.close_project')}</span>
          </button>

          <button
            type="button"
            onClick={onExportSnapshot}
            disabled={!hasLoadedModel}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              hasLoadedModel
                ? 'bg-dark-panel border-dark-border text-slate-300 hover:text-white hover:border-slate-500 active:scale-95'
                : 'bg-dark-panel border-dark-border text-slate-500 opacity-50 cursor-not-allowed'
            }`}
            title={t('project.export_snapshot')}
          >
            <Camera className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">{t('project.export_snapshot')}</span>
          </button>
        </div>

        {/* Live Geometry Quick Stats Badge */}
        <div className="flex items-center gap-2 text-xs">
          {hasLoadedModel ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-dark-panel border border-dark-border text-[11px] text-slate-300">
              <Box className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span className="font-semibold text-white truncate max-w-[120px] sm:max-w-[180px]">
                {selectedFileName}
              </span>
              {fileSizeBytes > 0 && (
                <span className="text-slate-400">
                  ({(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)
                </span>
              )}
              {vertexCount !== undefined && (
                <span className="hidden md:inline font-mono text-slate-300">
                  • {vertexCount.toLocaleString()} {t('project.vertices_short')}
                </span>
              )}
              {faceCount !== undefined && (
                <span className="hidden md:inline font-mono text-slate-300">
                  • {faceCount.toLocaleString()} {t('project.faces_short')}
                </span>
              )}
              {isWatertight !== null && isWatertight !== undefined && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold flex items-center gap-1 ${
                  isWatertight
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                }`}>
                  {isWatertight ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                  <span>{isWatertight ? t('project.status_watertight_badge') : t('project.status_open_badge')}</span>
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              {t('project.no_project_loaded')}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Row: Viewport Display Modes & Engineering Tools */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
        {/* Left: View Mode & Shading Switchers */}
        <div className="flex items-center gap-1 bg-dark-panel p-1 rounded-xl border border-dark-border">
          <button
            type="button"
            onClick={onToggleSplitView}
            disabled={!hasRepairedModel}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isSplitView
                ? 'bg-brand-600 text-white shadow-sm'
                : hasRepairedModel
                ? 'text-slate-300 hover:text-white hover:bg-dark-hover'
                : 'text-slate-500 cursor-not-allowed opacity-50'
            }`}
            title={hasRepairedModel ? t('viewer.split_view') : t('viewer.split_tooltip_disabled')}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{isSplitView ? t('viewer.split_view') : t('viewer.single_view')}</span>
          </button>

          <div className="h-4 w-px bg-dark-border mx-1" />

          <button
            type="button"
            onClick={() => onChangeDisplayMode('shaded')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              displayMode === 'shaded' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:text-white hover:bg-dark-hover'
            }`}
            title={t('viewer.mode_shaded')}
          >
            {t('viewer.mode_shaded')}
          </button>
          <button
            type="button"
            onClick={() => onChangeDisplayMode('wireframe')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              displayMode === 'wireframe' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:text-white hover:bg-dark-hover'
            }`}
            title={t('viewer.mode_wireframe')}
          >
            {t('viewer.mode_wireframe')}
          </button>
          <button
            type="button"
            onClick={() => onChangeDisplayMode('normals')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              displayMode === 'normals' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:text-white hover:bg-dark-hover'
            }`}
            title={t('viewer.mode_normals')}
          >
            {t('viewer.mode_normals')}
          </button>
          <button
            type="button"
            onClick={() => onChangeDisplayMode('xray')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              displayMode === 'xray' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:text-white hover:bg-dark-hover'
            }`}
            title={t('viewer.mode_xray')}
          >
            {t('viewer.mode_xray')}
          </button>
          <button
            type="button"
            onClick={() => onChangeDisplayMode('heatmap')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              displayMode === 'heatmap' ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm' : 'text-amber-300/90 hover:text-amber-200 hover:bg-dark-hover'
            }`}
            title={t('viewer.mode_heatmap')}
          >
            <span>🔥</span>
            <span>{t('viewer.mode_heatmap')}</span>
          </button>
        </div>

        {/* Right: Section Plane, Measure Tool, Camera Reset */}
        <div className="flex items-center gap-2">
          {/* Section plane toggle & slider */}
          <div className="flex items-center gap-2 bg-dark-panel px-2.5 py-1 rounded-xl border border-dark-border">
            <button
              type="button"
              onClick={onToggleSectionPlane}
              className={`flex items-center gap-1.5 text-xs font-medium ${
                sectionPlaneActive ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('viewer.section_plane')}</span>
            </button>
            {sectionPlaneActive && (
              <input
                type="range"
                min="-50"
                max="50"
                value={sectionOffset}
                onChange={(e) => onChangeSectionOffset(parseFloat(e.target.value))}
                className="w-20 h-1.5 bg-dark-surface rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            )}
          </div>

          {/* Measure tool toggle */}
          <button
            type="button"
            onClick={onToggleMeasureTool}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              measureToolActive
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm'
                : 'bg-dark-panel border-dark-border text-slate-300 hover:text-white hover:border-slate-500'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('viewer.measure_tool')}</span>
          </button>

          {/* AR Quick Look Button */}
          {onOpenArPreview && (
            <button
              type="button"
              onClick={onOpenArPreview}
              disabled={!hasLoadedModel}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                hasLoadedModel
                  ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-200 hover:text-white hover:border-purple-400 active:scale-95 shadow-sm'
                  : 'bg-dark-panel border-dark-border text-slate-500 opacity-50 cursor-not-allowed'
              }`}
              title={t('ar.nav_btn')}
            >
              <span>📱</span>
              <span className="hidden md:inline">{t('ar.nav_btn')}</span>
            </button>
          )}

          {/* Reset Camera */}
          <button
            type="button"
            onClick={onResetCamera}
            className="p-2 rounded-xl bg-dark-panel border border-dark-border text-slate-300 hover:text-white hover:border-slate-500 transition-all"
            title={t('viewer.reset_camera')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
