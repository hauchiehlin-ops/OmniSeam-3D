import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Columns, 
  Square, 
  Eye, 
  Grid, 
  Compass, 
  Scissors, 
  Ruler, 
  Maximize2, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { DisplayMode } from '../types';

interface ToolbarProps {
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
  hasRepairedModel: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
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
  hasRepairedModel
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-dark-surface/90 border border-dark-border rounded-xl backdrop-blur-md">
      {/* Left controls: View mode toggles */}
      <div className="flex items-center gap-1.5 bg-dark-panel p-1 rounded-lg border border-dark-border">
        <button
          type="button"
          onClick={onToggleSplitView}
          disabled={!hasRepairedModel}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            isSplitView
              ? 'bg-brand-600 text-white shadow-sm'
              : hasRepairedModel
              ? 'text-slate-300 hover:text-white hover:bg-dark-hover'
              : 'text-slate-500 cursor-not-allowed opacity-50'
          }`}
          title={hasRepairedModel ? t('viewer.split_view') : "Complete conversion to enable split comparison"}
        >
          <Columns className="w-3.5 h-3.5" />
          <span>{isSplitView ? t('viewer.split_view') : t('viewer.single_view')}</span>
        </button>

        <div className="h-4 w-px bg-dark-border mx-1" />

        <button
          type="button"
          onClick={() => onChangeDisplayMode('shaded')}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            displayMode === 'shaded' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:text-white hover:bg-dark-hover'
          }`}
          title={t('viewer.mode_shaded')}
        >
          {t('viewer.mode_shaded')}
        </button>
        <button
          type="button"
          onClick={() => onChangeDisplayMode('wireframe')}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            displayMode === 'wireframe' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:text-white hover:bg-dark-hover'
          }`}
          title={t('viewer.mode_wireframe')}
        >
          {t('viewer.mode_wireframe')}
        </button>
        <button
          type="button"
          onClick={() => onChangeDisplayMode('normals')}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            displayMode === 'normals' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:text-white hover:bg-dark-hover'
          }`}
          title={t('viewer.mode_normals')}
        >
          {t('viewer.mode_normals')}
        </button>
      </div>

      {/* Middle controls: Engineering tools */}
      <div className="flex items-center gap-3">
        {/* Section plane toggle & slider */}
        <div className="flex items-center gap-2 bg-dark-panel px-2.5 py-1 rounded-lg border border-dark-border">
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
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            measureToolActive
              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm'
              : 'bg-dark-panel border-dark-border text-slate-300 hover:text-white hover:border-dark-hover'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('viewer.measure_tool')}</span>
        </button>

        {/* Reset Camera */}
        <button
          type="button"
          onClick={onResetCamera}
          className="p-1.5 rounded-lg bg-dark-panel border border-dark-border text-slate-300 hover:text-white hover:border-dark-hover transition-all"
          title={t('viewer.reset_camera')}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
