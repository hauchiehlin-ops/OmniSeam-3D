import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Settings, 
  Wrench, 
  ShieldCheck, 
  Sliders, 
  Play, 
  Activity,
  Zap,
  Cloud,
  Lock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
  Droplets,
  Search,
  Layers
} from 'lucide-react';
import { ConversionConfig, TargetFormat } from '../types';
import { EngineMode, apiClient } from '../api/client';

interface SettingsPanelProps {
  config: ConversionConfig;
  onChangeConfig: (config: ConversionConfig) => void;
  onStartConvert: () => void;
  onInspectOnly: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  engineMode: EngineMode;
  onChangeEngineMode: (mode: EngineMode) => void;
  onOpenBackendSettings: () => void;
  autoEngineNotice?: { mode: EngineMode; reason: string } | null;
}

const getFormatGroups = (t: (key: string) => string): { groupName: string; options: { value: TargetFormat; label: string; desc: string }[] }[] => [
  {
    groupName: t('settings.format_group_cad'),
    options: [
      { value: 'step', label: 'STEP (.step / .stp)', desc: t('settings.fmt_step_desc') },
      { value: 'iges', label: 'IGES (.iges / .igs)', desc: t('settings.fmt_iges_desc') },
      { value: 'brep', label: 'BREP (.brep)', desc: t('settings.fmt_brep_desc') },
      { value: 'dxf', label: 'DXF (.dxf)', desc: t('settings.fmt_dxf_desc') },
    ]
  },
  {
    groupName: t('settings.format_group_web'),
    options: [
      { value: 'glb', label: 'GLB (Binary glTF)', desc: t('settings.fmt_glb_desc') },
      { value: 'gltf', label: 'glTF (JSON + Bin)', desc: t('settings.fmt_gltf_desc') },
    ]
  },
  {
    groupName: t('settings.format_group_mesh'),
    options: [
      { value: '3mf', label: '3MF (3D Manufacturing)', desc: t('settings.fmt_3mf_desc') },
      { value: 'stl', label: 'STL (Stereolithography)', desc: t('settings.fmt_stl_desc') },
      { value: 'obj', label: 'OBJ (Wavefront)', desc: t('settings.fmt_obj_desc') },
      { value: 'ply', label: 'PLY (Polygon File)', desc: t('settings.fmt_ply_desc') },
      { value: 'off', label: 'OFF (Object File)', desc: t('settings.fmt_off_desc') },
    ]
  }
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
  onOpenBackendSettings,
  autoEngineNotice,
}) => {
  const { t } = useTranslation();
  const formatGroups = getFormatGroups(t);
  const [isExpertOpen, setIsExpertOpen] = useState(false);

  const update = <K extends keyof ConversionConfig>(key: K, value: ConversionConfig[K]) => {
    onChangeConfig({ ...config, [key]: value });
  };

  const handleCloudServerClick = () => {
    onChangeEngineMode('server');
    if (!apiClient.getStoredBackendUrl()) {
      onOpenBackendSettings();
    }
  };

  // Determine currently active strategy
  const currentStrategy: 'smart' | 'watertight' | 'passthrough' | 'custom' = (() => {
    if (
      !config.auto_fill_holes &&
      config.fix_non_manifold &&
      config.unify_normals &&
      config.remove_degenerate &&
      config.weld_vertices
    ) {
      return 'smart';
    }
    if (
      config.auto_fill_holes &&
      config.fix_non_manifold &&
      config.unify_normals &&
      config.remove_degenerate &&
      config.weld_vertices
    ) {
      return 'watertight';
    }
    if (
      !config.auto_fill_holes &&
      !config.fix_non_manifold &&
      !config.unify_normals &&
      !config.remove_degenerate &&
      !config.weld_vertices
    ) {
      return 'passthrough';
    }
    return 'custom';
  })();

  const handleStrategyApply = (strategy: 'smart' | 'watertight' | 'passthrough') => {
    if (strategy === 'smart') {
      onChangeConfig({
        ...config,
        auto_fill_holes: false,
        fix_non_manifold: true,
        unify_normals: true,
        remove_degenerate: true,
        weld_vertices: true,
        enable_sewing: true,
      });
    } else if (strategy === 'watertight') {
      onChangeConfig({
        ...config,
        auto_fill_holes: true,
        fix_non_manifold: true,
        unify_normals: true,
        remove_degenerate: true,
        weld_vertices: true,
        enable_sewing: true,
      });
    } else if (strategy === 'passthrough') {
      onChangeConfig({
        ...config,
        auto_fill_holes: false,
        fix_non_manifold: false,
        unify_normals: false,
        remove_degenerate: false,
        weld_vertices: false,
        enable_sewing: false,
      });
    }
  };

  return (
    <div className="flex flex-col gap-5 p-5 bg-dark-surface border border-dark-border rounded-2xl shadow-xl">
      {/* Header & Engine Mode */}
      <div className="flex flex-col gap-2 pb-3 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
            <Settings className="w-4 h-4 text-brand-400" />
            <span>{t('settings.title')}</span>
          </div>

          {/* Engine Mode selector */}
          <div className="flex items-center bg-dark-panel p-0.5 rounded-lg border border-dark-border text-xs">
            <button
              type="button"
              onClick={() => onChangeEngineMode('client')}
              title={t('settings.mode_client_tip')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                engineMode === 'client'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Pure Client</span>
            </button>
            <button
              type="button"
              onClick={handleCloudServerClick}
              title={t('settings.mode_server_tip')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                engineMode === 'server'
                  ? 'bg-indigo-500/20 text-indigo-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cloud className="w-3 h-3 text-indigo-400" />
              <span>Cloud Server</span>
            </button>
          </div>
        </div>

        {/* Auto Engine Notice Banner */}
        {autoEngineNotice && (
          <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-2 text-xs">
            <span className="p-1 rounded bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">💡</span>
            <div className="space-y-0.5">
              <div className="font-semibold text-indigo-200">
                {t('settings.auto_engine_title', { 
                  mode: autoEngineNotice.mode === 'server' ? t('settings.auto_engine_mode_server') : t('settings.auto_engine_mode_client') 
                })}
              </div>
              <p className="text-[11px] text-slate-400">
                {autoEngineNotice.reason}
              </p>
            </div>
          </div>
        )}

        {/* Engine mode concise hint */}
        <p className="text-[11px] text-slate-400 leading-relaxed">
          {engineMode === 'client' ? t('settings.mode_client_tip') : t('settings.mode_server_tip')}
        </p>
      </div>

      {/* Target Export Format */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>{t('settings.target_format')}</span>
          <span className="text-[10px] text-brand-400 font-medium">{t('settings.target_format_hint')}</span>
        </label>
        <select
          value={config.target_format}
          onChange={(e) => update('target_format', e.target.value as TargetFormat)}
          disabled={disabled}
          className="w-full bg-dark-panel border border-dark-border rounded-xl px-3 py-2.5 text-xs font-medium text-slate-100 focus:outline-none focus:border-brand-500 transition-all cursor-pointer shadow-inner"
        >
          {formatGroups.map((group) => (
            <optgroup key={group.groupName} label={group.groupName} className="bg-dark-panel text-slate-400 font-bold">
              {group.options.map((fmt) => (
                <option key={fmt.value} value={fmt.value} className="bg-dark-surface text-slate-100 font-normal">
                  {fmt.label} — {fmt.desc}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* 3 Unified Geometric Strategy Cards */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-brand-400 flex items-center gap-1.5 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('settings.strategy_heading')}
          </span>
          <span className="text-[10px] text-slate-400">{t('settings.strategy_hint')}</span>
        </div>

        {/* 3 Strategy Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* 1. Smart Lossless (Default · Recommended) */}
          <button
            type="button"
            onClick={() => handleStrategyApply('smart')}
            disabled={disabled}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all relative overflow-hidden group ${
              currentStrategy === 'smart'
                ? 'bg-brand-500/15 border-brand-500/60 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/40'
                : 'bg-dark-panel/80 border-dark-border hover:border-slate-500 hover:bg-dark-panel'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  <span>{t('settings.strategy_smart_title')}</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 shrink-0">
                  {t('settings.strategy_smart_badge')}
                </span>
              </div>
              <p className="text-[10px] text-slate-300/90 leading-tight">
                {t('settings.strategy_smart_desc')}
              </p>
            </div>
            <div className="pt-1.5 border-t border-dark-border/60">
              <span className="text-[9px] text-brand-300/80 font-medium block truncate">
                {t('settings.strategy_smart_apps')}
              </span>
            </div>
          </button>

          {/* 2. Watertight Solid (3D Print & Mold) */}
          <button
            type="button"
            onClick={() => handleStrategyApply('watertight')}
            disabled={disabled}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all relative overflow-hidden group ${
              currentStrategy === 'watertight'
                ? 'bg-emerald-500/15 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                : 'bg-dark-panel/80 border-dark-border hover:border-slate-500 hover:bg-dark-panel'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('settings.strategy_watertight_title')}</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  {t('settings.strategy_watertight_badge')}
                </span>
              </div>
              <p className="text-[10px] text-slate-300/90 leading-tight">
                {t('settings.strategy_watertight_desc')}
              </p>
            </div>
            <div className="pt-1.5 border-t border-dark-border/60">
              <span className="text-[9px] text-emerald-300/80 font-medium block truncate">
                {t('settings.strategy_watertight_apps')}
              </span>
            </div>
          </button>

          {/* 3. Raw Passthrough (Bit-level As-Is) */}
          <button
            type="button"
            onClick={() => handleStrategyApply('passthrough')}
            disabled={disabled}
            className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all relative overflow-hidden group ${
              currentStrategy === 'passthrough'
                ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                : 'bg-dark-panel/80 border-dark-border hover:border-slate-500 hover:bg-dark-panel'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('settings.strategy_passthrough_title')}</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  {t('settings.strategy_passthrough_badge')}
                </span>
              </div>
              <p className="text-[10px] text-slate-300/90 leading-tight">
                {t('settings.strategy_passthrough_desc')}
              </p>
            </div>
            <div className="pt-1.5 border-t border-dark-border/60">
              <span className="text-[9px] text-amber-300/80 font-medium block truncate">
                {t('settings.strategy_passthrough_apps')}
              </span>
            </div>
          </button>
        </div>

        {/* Collapsible Expert Tuning Drawer */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsExpertOpen(!isExpertOpen)}
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-dark-panel/70 hover:bg-dark-panel border border-dark-border/80 text-xs text-slate-300 font-medium transition-all shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-slate-200">{t('settings.expert_drawer_title')}</span>
              {currentStrategy === 'custom' && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {t('settings.expert_custom_badge')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[10px] text-slate-400 hidden sm:inline">{t('settings.expert_drawer_hint')}</span>
              {isExpertOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {/* Expert Options Panel */}
          {isExpertOpen && (
            <div className="mt-2.5 p-4 rounded-2xl bg-dark-panel/90 border border-dark-border space-y-4 animate-fadeIn">
              {/* Checkboxes Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* 1. Auto Fill Holes */}
                <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-dark-surface border border-dark-border hover:border-slate-600 transition-all">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.auto_fill_holes}
                      onChange={(e) => update('auto_fill_holes', e.target.checked)}
                      disabled={disabled}
                      className="rounded bg-dark-panel border-dark-border text-brand-500 focus:ring-brand-500 w-4 h-4"
                    />
                    <span className="text-slate-200 font-semibold">{t('settings.auto_fill_holes')}</span>
                  </label>
                  <p className="text-[10px] text-slate-400 leading-tight pl-6">
                    {t('settings.auto_fill_holes_tip')}
                  </p>
                </div>

                {/* 2. Fix Non-Manifold */}
                <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-dark-surface border border-dark-border hover:border-slate-600 transition-all">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.fix_non_manifold}
                      onChange={(e) => update('fix_non_manifold', e.target.checked)}
                      disabled={disabled}
                      className="rounded bg-dark-panel border-dark-border text-brand-500 focus:ring-brand-500 w-4 h-4"
                    />
                    <span className="text-slate-200 font-semibold">{t('settings.fix_non_manifold')}</span>
                  </label>
                  <p className="text-[10px] text-slate-400 leading-tight pl-6">
                    {t('settings.fix_non_manifold_tip')}
                  </p>
                </div>

                {/* 3. Unify Normals */}
                <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-dark-surface border border-dark-border hover:border-slate-600 transition-all">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.unify_normals}
                      onChange={(e) => update('unify_normals', e.target.checked)}
                      disabled={disabled}
                      className="rounded bg-dark-panel border-dark-border text-brand-500 focus:ring-brand-500 w-4 h-4"
                    />
                    <span className="text-slate-200 font-semibold">{t('settings.unify_normals')}</span>
                  </label>
                  <p className="text-[10px] text-slate-400 leading-tight pl-6">
                    {t('settings.unify_normals_tip')}
                  </p>
                </div>

                {/* 4. Remove Degenerate */}
                <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-dark-surface border border-dark-border hover:border-slate-600 transition-all">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.remove_degenerate}
                      onChange={(e) => update('remove_degenerate', e.target.checked)}
                      disabled={disabled}
                      className="rounded bg-dark-panel border-dark-border text-brand-500 focus:ring-brand-500 w-4 h-4"
                    />
                    <span className="text-slate-200 font-semibold">{t('settings.remove_degenerate')}</span>
                  </label>
                  <p className="text-[10px] text-slate-400 leading-tight pl-6">
                    {t('settings.remove_degenerate_tip')}
                  </p>
                </div>
              </div>

              {/* CAD Deflection & Sewing Tolerance Settings */}
              <div className="space-y-2 pt-1 border-t border-dark-border/60">
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Wrench className="w-3.5 h-3.5" />
                  {t('settings.cad_heading')}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex flex-col gap-1 bg-dark-surface p-2.5 rounded-xl border border-dark-border">
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
                      className="w-full h-1.5 bg-dark-panel rounded appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1 bg-dark-surface p-2.5 rounded-xl border border-dark-border">
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
                      className="w-full h-1.5 bg-dark-panel rounded appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
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
              <span>{t('settings.processing')}</span>
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
          <span>{t('settings.privacy_guarantee')}</span>
        </div>
      )}
    </div>
  );
};
