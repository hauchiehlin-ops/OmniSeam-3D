import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Settings, 
  Wrench, 
  ShieldCheck, 
  Layers, 
  FileCheck, 
  Sliders, 
  Play, 
  Activity,
  Zap,
  Cloud,
  Lock
} from 'lucide-react';
import { ConversionConfig, TargetFormat } from '../types';
import { EngineMode } from '../api/client';

interface SettingsPanelProps {
  config: ConversionConfig;
  onChangeConfig: (config: ConversionConfig) => void;
  onStartConvert: () => void;
  onInspectOnly: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  engineMode: EngineMode;
  onChangeEngineMode: (mode: EngineMode) => void;
}

const FORMAT_OPTIONS: { value: TargetFormat; label: string; desc: string }[] = [
  { value: 'glb', label: 'GLB (Binary glTF)', desc: 'Optimized for WebGL & 3D Web apps' },
  { value: 'gltf', label: 'glTF (JSON + Bin)', desc: 'Standard Khronos 3D asset' },
  { value: 'stl', label: 'STL (Stereolithography)', desc: '3D Printing & additive manufacturing' },
  { value: 'obj', label: 'OBJ (Wavefront)', desc: 'Universal mesh & DCC format' },
  { value: '3mf', label: '3MF (3D Manufacturing)', desc: 'Modern high-precision 3D print format' },
  { value: 'ply', label: 'PLY (Polygon File)', desc: 'Scanned mesh & point data' },
  { value: 'off', label: 'OFF (Object File Format)', desc: 'Computational geometry format' },
  { value: 'dxf', label: 'DXF (AutoCAD)', desc: '2D/3D CAD interchange' },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  onChangeConfig,
  onStartConvert,
  onInspectOnly,
  disabled,
  isProcessing,
  engineMode,
  onChangeEngineMode,
}) => {
  const { t } = useTranslation();

  const update = <K extends keyof ConversionConfig>(key: K, value: ConversionConfig[K]) => {
    onChangeConfig({ ...config, [key]: value });
  };

  return (
    <div className="flex flex-col gap-5 p-5 bg-dark-surface border border-dark-border rounded-2xl">
      <div className="flex items-center justify-between pb-3 border-b border-dark-border">
        <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
          <Settings className="w-4 h-4 text-brand-400" />
          <span>{t('settings.title')}</span>
        </div>

        {/* Engine Mode selector */}
        <div className="flex items-center bg-dark-panel p-0.5 rounded-lg border border-dark-border text-xs">
          <button
            type="button"
            onClick={() => onChangeEngineMode('client')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              engineMode === 'client'
                ? 'bg-amber-500/20 text-amber-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Pure Client</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeEngineMode('server')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              engineMode === 'server'
                ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3 h-3 text-indigo-400" />
            <span>Cloud Server</span>
          </button>
        </div>
      </div>

      {/* Target Export Format */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-300">
          {t('settings.target_format')}
        </label>
        <select
          value={config.target_format}
          onChange={(e) => update('target_format', e.target.value as TargetFormat)}
          disabled={disabled}
          className="w-full bg-dark-panel border border-dark-border rounded-xl px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
        >
          {FORMAT_OPTIONS.map((fmt) => (
            <option key={fmt.value} value={fmt.value} className="bg-dark-panel text-slate-100">
              {fmt.label} - {fmt.desc}
            </option>
          ))}
        </select>
      </div>

      {/* Auto-Healing & Mesh Quality */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          {t('settings.repair_heading')}
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-dark-panel border border-dark-border hover:border-dark-hover cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={config.auto_fill_holes}
              onChange={(e) => update('auto_fill_holes', e.target.checked)}
              disabled={disabled}
              className="rounded bg-dark-surface border-dark-border text-brand-500 focus:ring-brand-500 w-4 h-4"
            />
            <span className="text-slate-200 font-medium">{t('settings.auto_fill_holes')}</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-dark-panel border border-dark-border hover:border-dark-hover cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={config.fix_non_manifold}
              onChange={(e) => update('fix_non_manifold', e.target.checked)}
              disabled={disabled}
              className="rounded bg-dark-surface border-dark-border text-brand-500 focus:ring-brand-500 w-4 h-4"
            />
            <span className="text-slate-200 font-medium">{t('settings.fix_non_manifold')}</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-dark-panel border border-dark-border hover:border-dark-hover cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={config.unify_normals}
              onChange={(e) => update('unify_normals', e.target.checked)}
              disabled={disabled}
              className="rounded bg-dark-surface border-dark-border text-brand-500 focus:ring-brand-500 w-4 h-4"
            />
            <span className="text-slate-200 font-medium">{t('settings.unify_normals')}</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-dark-panel border border-dark-border hover:border-dark-hover cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={config.remove_degenerate}
              onChange={(e) => update('remove_degenerate', e.target.checked)}
              disabled={disabled}
              className="rounded bg-dark-surface border-dark-border text-brand-500 focus:ring-brand-500 w-4 h-4"
            />
            <span className="text-slate-200 font-medium">{t('settings.remove_degenerate')}</span>
          </label>
        </div>
      </div>

      {/* CAD Deflection Settings */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
          <Wrench className="w-3.5 h-3.5" />
          {t('settings.cad_heading')}
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col gap-1 bg-dark-panel p-2.5 rounded-xl border border-dark-border">
            <div className="flex justify-between text-slate-300">
              <span>{t('settings.linear_deflection')}</span>
              <span className="font-mono text-brand-400">{config.cad_linear_deflection} mm</span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.05"
              step="0.001"
              value={config.cad_linear_deflection}
              onChange={(e) => update('cad_linear_deflection', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-1.5 bg-dark-surface rounded appearance-none cursor-pointer accent-brand-500"
            />
          </div>

          <div className="flex flex-col gap-1 bg-dark-panel p-2.5 rounded-xl border border-dark-border">
            <div className="flex justify-between text-slate-300">
              <span>{t('settings.sewing_tolerance')}</span>
              <span className="font-mono text-brand-400">{config.sewing_tolerance} mm</span>
            </div>
            <input
              type="range"
              min="0.0001"
              max="0.01"
              step="0.0005"
              value={config.sewing_tolerance}
              onChange={(e) => update('sewing_tolerance', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-1.5 bg-dark-surface rounded appearance-none cursor-pointer accent-brand-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onStartConvert}
          disabled={disabled || isProcessing}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-xs text-white shadow-lg transition-all duration-200 ${
            disabled || isProcessing
              ? 'bg-slate-700 opacity-60 cursor-not-allowed'
              : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-brand-500/25 active:scale-[0.99]'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>{t('settings.start_process')}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onInspectOnly}
          disabled={disabled || isProcessing}
          className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl font-medium text-xs text-slate-200 bg-dark-panel border border-dark-border hover:bg-dark-hover hover:border-slate-500 transition-all"
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>{t('settings.inspect_only')}</span>
        </button>
      </div>

      {/* Privacy note */}
      {engineMode === 'client' && (
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-400/80 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
          <Lock className="w-3 h-3" />
          <span>100% Client-Side Mode: Your 3D models never leave your computer.</span>
        </div>
      )}
    </div>
  );
};
