import React from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw, RotateCcw, Compass, RefreshCw, X, Sliders, CheckCircle2 } from 'lucide-react';

interface ModelTransformToolbarProps {
  rotation: { x: number; y: number; z: number };
  onChangeRotation: (rot: { x: number; y: number; z: number }) => void;
  showRotationGizmo: boolean;
  onToggleRotationGizmo: () => void;
  onResetRotation: () => void;
  onClose?: () => void;
  disabled?: boolean;
}

export const ModelTransformToolbar: React.FC<ModelTransformToolbarProps> = ({
  rotation,
  onChangeRotation,
  showRotationGizmo,
  onToggleRotationGizmo,
  onResetRotation,
  onClose,
  disabled = false,
}) => {
  const { t } = useTranslation();

  const handleAxisStep = (axis: 'x' | 'y' | 'z', deltaDeg: number) => {
    const nextVal = (rotation[axis] + deltaDeg) % 360;
    // Normalize to [-180, 180] or [0, 360)
    const normalized = Math.round(nextVal * 10) / 10;
    onChangeRotation({
      ...rotation,
      [axis]: normalized,
    });
  };

  const handleInputChange = (axis: 'x' | 'y' | 'z', valueStr: string) => {
    const val = parseFloat(valueStr);
    if (isNaN(val)) return;
    onChangeRotation({
      ...rotation,
      [axis]: Math.round(val * 10) / 10,
    });
  };

  const hasRotation = rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0;

  return (
    <div className="absolute top-3 left-3 z-30 flex flex-col gap-2.5 p-3.5 rounded-2xl bg-dark-surface/95 border border-brand-500/40 shadow-2xl backdrop-blur-md max-w-sm w-[340px] text-xs transition-all animate-in fade-in slide-in-from-top-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-dark-border">
        <div className="flex items-center gap-2 font-bold text-slate-100">
          <div className="w-6 h-6 rounded-lg bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-300">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span>{t('transform.title', '模型空間旋轉 (Transform)')}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Gizmo toggle button (Scheme B) */}
          <button
            type="button"
            onClick={onToggleRotationGizmo}
            title={showRotationGizmo ? t('transform.hide_gizmo', '隱藏 3D 旋轉環') : t('transform.show_gizmo', '顯示 3D 旋轉環')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
              showRotationGizmo
                ? 'bg-brand-500/20 border-brand-400 text-brand-300 shadow-sm shadow-brand-500/30 ring-1 ring-brand-400/40'
                : 'bg-dark-panel border-dark-border text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🎛️</span>
            <span>{t('transform.gizmo_btn', '3D 旋轉環')}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-dark-panel text-slate-400 hover:text-slate-200 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Axis Controls (Scheme A) */}
      <div className="flex flex-col gap-2">
        {/* X Axis */}
        <div className="flex items-center justify-between bg-dark-panel/60 p-1.5 px-2 rounded-xl border border-rose-500/20">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px] flex items-center justify-center border border-rose-500/30">
              X
            </span>
            <div className="flex items-center">
              <input
                type="number"
                disabled={disabled}
                value={rotation.x}
                onChange={(e) => handleInputChange('x', e.target.value)}
                step="15"
                className="w-14 bg-dark-surface border border-dark-border rounded px-1.5 py-0.5 text-center text-xs font-mono text-slate-100 focus:outline-none focus:border-rose-400"
              />
              <span className="ml-1 text-[11px] text-slate-400">°</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleAxisStep('x', -90)}
              className="px-1.5 py-0.5 rounded bg-dark-surface hover:bg-rose-500/20 border border-dark-border hover:border-rose-500/40 text-[10px] text-slate-300 hover:text-rose-200 transition-all"
            >
              -90°
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleAxisStep('x', 90)}
              className="px-1.5 py-0.5 rounded bg-dark-surface hover:bg-rose-500/20 border border-dark-border hover:border-rose-500/40 text-[10px] text-slate-300 hover:text-rose-200 transition-all"
            >
              +90°
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleAxisStep('x', 180)}
              className="px-1.5 py-0.5 rounded bg-dark-surface hover:bg-rose-500/20 border border-dark-border hover:border-rose-500/40 text-[10px] text-slate-300 hover:text-rose-200 transition-all"
            >
              180°
            </button>
          </div>
        </div>

        {/* Y Axis */}
        <div className="flex items-center justify-between bg-dark-panel/60 p-1.5 px-2 rounded-xl border border-emerald-500/20">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center justify-center border border-emerald-500/30">
              Y
            </span>
            <div className="flex items-center">
              <input
                type="number"
                disabled={disabled}
                value={rotation.y}
                onChange={(e) => handleInputChange('y', e.target.value)}
                step="15"
                className="w-14 bg-dark-surface border border-dark-border rounded px-1.5 py-0.5 text-center text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-400"
              />
              <span className="ml-1 text-[11px] text-slate-400">°</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleAxisStep('y', -90)}
              className="px-1.5 py-0.5 rounded bg-dark-surface hover:bg-emerald-500/20 border border-dark-border hover:border-emerald-500/40 text-[10px] text-slate-300 hover:text-emerald-200 transition-all"
            >
              -90°
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleAxisStep('y', 90)}
              className="px-1.5 py-0.5 rounded bg-dark-surface hover:bg-emerald-500/20 border border-dark-border hover:border-emerald-500/40 text-[10px] text-slate-300 hover:text-emerald-200 transition-all"
            >
              +90°
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleAxisStep('y', 180)}
              className="px-1.5 py-0.5 rounded bg-dark-surface hover:bg-emerald-500/20 border border-dark-border hover:border-emerald-500/40 text-[10px] text-slate-300 hover:text-emerald-200 transition-all"
            >
              180°
            </button>
          </div>
        </div>

        {/* Z Axis */}
        <div className="flex items-center justify-between bg-dark-panel/60 p-1.5 px-2 rounded-xl border border-sky-500/20">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px] flex items-center justify-center border border-sky-500/30">
              Z
            </span>
            <div className="flex items-center">
              <input
                type="number"
                disabled={disabled}
                value={rotation.z}
                onChange={(e) => handleInputChange('z', e.target.value)}
                step="15"
                className="w-14 bg-dark-surface border border-dark-border rounded px-1.5 py-0.5 text-center text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-400"
              />
              <span className="ml-1 text-[11px] text-slate-400">°</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleAxisStep('z', -90)}
              className="px-1.5 py-0.5 rounded bg-dark-surface hover:bg-sky-500/20 border border-dark-border hover:border-sky-500/40 text-[10px] text-slate-300 hover:text-sky-200 transition-all"
            >
              -90°
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleAxisStep('z', 90)}
              className="px-1.5 py-0.5 rounded bg-dark-surface hover:bg-sky-500/20 border border-dark-border hover:border-sky-500/40 text-[10px] text-slate-300 hover:text-sky-200 transition-all"
            >
              +90°
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleAxisStep('z', 180)}
              className="px-1.5 py-0.5 rounded bg-dark-surface hover:bg-sky-500/20 border border-dark-border hover:border-sky-500/40 text-[10px] text-slate-300 hover:text-sky-200 transition-all"
            >
              180°
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info & Reset */}
      <div className="flex items-center justify-between pt-2 border-t border-dark-border/60">
        <div className="flex items-center gap-1 text-[10px] text-amber-300/90">
          <CheckCircle2 className="w-3 h-3 text-amber-400" />
          <span>{t('transform.bake_hint', '匯出時將自動烘焙此姿態至檔案實體幾何')}</span>
        </div>

        <button
          type="button"
          disabled={disabled || !hasRotation}
          onClick={onResetRotation}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-dark-panel hover:bg-dark-panel/80 border border-dark-border hover:border-slate-500 text-[10px] text-slate-400 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-2.5 h-2.5" />
          <span>{t('transform.reset', '重設 (0°)')}</span>
        </button>
      </div>
    </div>
  );
};
