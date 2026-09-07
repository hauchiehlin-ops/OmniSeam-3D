import React from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw, RotateCcw, Compass, RefreshCw, X, CheckCircle2 } from 'lucide-react';

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

  const renderAxisControl = (
    axis: 'x' | 'y' | 'z',
    colorClasses: { badge: string; border: string; text: string }
  ) => {
    const val = rotation[axis];
    return (
      <div className={`flex flex-col gap-1.5 p-2 rounded-xl bg-dark-panel/80 border ${colorClasses.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`w-5 h-5 rounded-md ${colorClasses.badge} font-bold text-[11px] flex items-center justify-center border shadow-xs`}>
              {axis.toUpperCase()}
            </span>
            <div className="flex items-center">
              <input
                type="number"
                disabled={disabled}
                value={val}
                onChange={(e) => handleInputChange(axis, e.target.value)}
                step="5"
                className="w-16 bg-dark-surface px-1.5 py-0.5 rounded border border-dark-border text-slate-100 font-mono text-center text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-slate-400 ml-1 text-xs">°</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleAxisStep(axis, -15)}
              className="p-1 rounded bg-dark-surface hover:bg-dark-border text-slate-400 hover:text-slate-200 text-[10px] font-mono transition-all"
              title="-15°"
            >
              -15°
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleAxisStep(axis, 15)}
              className="p-1 rounded bg-dark-surface hover:bg-dark-border text-slate-400 hover:text-slate-200 text-[10px] font-mono transition-all"
              title="+15°"
            >
              +15°
            </button>
          </div>
        </div>

        {/* Quick Flips */}
        <div className="grid grid-cols-3 gap-1 pt-1 border-t border-dark-border/40">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleAxisStep(axis, -90)}
            className="flex items-center justify-center gap-0.5 py-0.5 rounded bg-dark-surface/90 hover:bg-dark-surface text-slate-300 hover:text-white text-[10px] font-medium border border-dark-border/50 hover:border-slate-600 transition-all"
            title={`將 ${axis.toUpperCase()} 軸逆時針翻轉 90°`}
          >
            <RotateCcw className="w-2.5 h-2.5 text-slate-400" />
            <span>-90°</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleAxisStep(axis, 90)}
            className="flex items-center justify-center gap-0.5 py-0.5 rounded bg-dark-surface/90 hover:bg-dark-surface text-slate-300 hover:text-white text-[10px] font-medium border border-dark-border/50 hover:border-slate-600 transition-all"
            title={`將 ${axis.toUpperCase()} 軸順時針翻轉 90°`}
          >
            <RotateCw className="w-2.5 h-2.5 text-slate-400" />
            <span>+90°</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleAxisStep(axis, 180)}
            className="flex items-center justify-center gap-0.5 py-0.5 rounded bg-dark-surface/90 hover:bg-dark-surface text-slate-300 hover:text-white text-[10px] font-medium border border-dark-border/50 hover:border-slate-600 transition-all"
            title={`將 ${axis.toUpperCase()} 軸翻轉 180°`}
          >
            <span>180°</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-dark-surface/95 border border-brand-500/40 rounded-2xl p-3 shadow-xl backdrop-blur-md text-xs transition-all animate-in fade-in slide-in-from-top-2">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-dark-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-300">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-100 text-xs">
            {t('transform.title', '模型空間姿態與旋轉控制')}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>{t('transform.bake_hint', '旋轉角度將於匯出時自動烘焙至幾何頂點')}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Scheme B: Gizmo toggle */}
          <button
            type="button"
            onClick={onToggleRotationGizmo}
            title={showRotationGizmo ? t('transform.hide_gizmo', '隱藏 3D 旋轉環') : t('transform.show_gizmo', '顯示 3D 旋轉環')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
              showRotationGizmo
                ? 'bg-brand-500/20 border-brand-400 text-brand-300 shadow-sm shadow-brand-500/30 ring-1 ring-brand-400/40'
                : 'bg-dark-panel border-dark-border text-slate-300 hover:text-white'
            }`}
          >
            <span>🎛️</span>
            <span>{t('transform.gizmo_btn', '3D 旋轉環')}</span>
          </button>

          {/* Reset button */}
          <button
            type="button"
            disabled={disabled || !hasRotation}
            onClick={onResetRotation}
            title={t('transform.reset', '重置為 0°')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-all ${
              hasRotation
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-dark-panel/40 border-dark-border/40 text-slate-500 cursor-not-allowed'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${hasRotation ? 'text-amber-400' : ''}`} />
            <span className="hidden sm:inline">{t('transform.reset', '重置')}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-dark-panel text-slate-400 hover:text-slate-200 transition-all ml-1"
              title="關閉旋轉面板"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3 Horizontal Axis Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {renderAxisControl('x', {
          badge: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
          border: 'border-rose-500/20',
          text: 'text-rose-400',
        })}
        {renderAxisControl('y', {
          badge: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
          border: 'border-emerald-500/20',
          text: 'text-emerald-400',
        })}
        {renderAxisControl('z', {
          badge: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
          border: 'border-sky-500/20',
          text: 'text-sky-400',
        })}
      </div>
    </div>
  );
};
