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

interface FormatOption {
  value: TargetFormat;
  label: string;
  descKey: string;
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

  const update = <K extends keyof ConversionConfig>(key: K, value: ConversionConfig[K]) => {
    onChangeConfig({ ...config, [key]: value });
  };

  const handleCloudServerClick = () => {
    onChangeEngineMode('server');
    if (!apiClient.getStoredBackendUrl()) {
      onOpenBackendSettings();
    }
  };

  const handlePresetApply = (preset: '3dprint' | 'game' | 'asis') => {
    if (preset === '3dprint') {
      onChangeConfig({
        ...config,
        auto_fill_holes: true,
        fix_non_manifold: true,
        unify_normals: true,
        remove_degenerate: true,
        weld_vertices: true,
      });
    } else if (preset === 'game') {
      onChangeConfig({
        ...config,
        auto_fill_holes: false,
        fix_non_manifold: true,
        unify_normals: true,
        remove_degenerate: true,
        weld_vertices: true,
      });
    } else if (preset === 'asis') {
      onChangeConfig({
        ...config,
        auto_fill_holes: false,
        fix_non_manifold: false,
        unify_normals: false,
        remove_degenerate: false,
        weld_vertices: false,
      });
    }
  };

  return (
    <div className="flex flex-col gap-5 p-5 bg-dark-surface border border-dark-border rounded-2xl">
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
          className="w-full bg-dark-panel border border-dark-border rounded-xl px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
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


      {/* Smart Presets & Auto-Healing */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('settings.repair_heading')}
          </span>
          <span className="text-[10px] text-slate-400">{t('settings.preset_hint')}</span>
        </div>

        {/* 3 Smart Preset Buttons */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handlePresetApply('3dprint')}
            disabled={disabled}
            className={`px-2 py-1.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
              config.auto_fill_holes && config.fix_non_manifold && config.unify_normals && config.remove_degenerate
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                : 'bg-dark-panel border-dark-border text-slate-300 hover:border-slate-500'
            }`}
            title={t('settings.preset_3dprint_desc')}
          >
            <span className="text-[11px] font-bold truncate">{t('settings.preset_3dprint_btn_title')}</span>
            <span className="text-[9px] text-slate-400 truncate">{t('settings.preset_3dprint_btn_sub')}</span>
          </button>

          <button
            type="button"
            onClick={() => handlePresetApply('game')}
            disabled={disabled}
            className={`px-2 py-1.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
              !config.auto_fill_holes && config.fix_non_manifold && config.unify_normals && config.remove_degenerate
                ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300'
                : 'bg-dark-panel border-dark-border text-slate-300 hover:border-slate-500'
            }`}
            title={t('settings.preset_game_desc')}
          >
            <span className="text-[11px] font-bold truncate">{t('settings.preset_game_btn_title')}</span>
            <span className="text-[9px] text-slate-400 truncate">{t('settings.preset_game_btn_sub')}</span>
          </button>

          <button
            type="button"
            onClick={() => handlePresetApply('asis')}
            disabled={disabled}
            className={`px-2 py-1.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
              !config.auto_fill_holes && !config.fix_non_manifold && !config.unify_normals && !config.remove_degenerate
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                : 'bg-dark-panel border-dark-border text-slate-300 hover:border-slate-500'
            }`}
            title={t('settings.preset_asis_desc')}
          >
            <span className="text-[11px] font-bold truncate">{t('settings.preset_asis_btn_title')}</span>
            <span className="text-[9px] text-slate-400 truncate">{t('settings.preset_asis_btn_sub')}</span>
          </button>
        </div>

        {/* Checkbox Details with Contextual Hints */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* 1. Auto Fill Holes */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-dark-panel border border-dark-border hover:border-slate-600 transition-all">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.auto_fill_holes}
                onChange={(e) => update('auto_fill_holes', e.target.checked)}
                disabled={disabled}
                className="rounded bg-dark-surface border-dark-border text-brand-500 focus:ring-brand-500 w-4 h-4"
              />
              <span className="text-slate-200 font-semibold">{t('settings.auto_fill_holes')}</span>
            </label>
            <p className="text-[10px] text-slate-400 leading-tight pl-6">
              {t('settings.auto_fill_holes_tip')}
            </p>
          </div>

          {/* 2. Fix Non-Manifold */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-dark-panel border border-dark-border hover:border-slate-600 transition-all">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.fix_non_manifold}
                onChange={(e) => update('fix_non_manifold', e.target.checked)}
                disabled={disabled}
                className="rounded bg-dark-surface border-dark-border text-brand-500 focus:ring-brand-500 w-4 h-4"
              />
              <span className="text-slate-200 font-semibold">{t('settings.fix_non_manifold')}</span>
            </label>
            <p className="text-[10px] text-slate-400 leading-tight pl-6">
              {t('settings.fix_non_manifold_tip')}
            </p>
          </div>

          {/* 3. Unify Normals */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-dark-panel border border-dark-border hover:border-slate-600 transition-all">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.unify_normals}
                onChange={(e) => update('unify_normals', e.target.checked)}
                disabled={disabled}
                className="rounded bg-dark-surface border-dark-border text-brand-500 focus:ring-brand-500 w-4 h-4"
              />
              <span className="text-slate-200 font-semibold">{t('settings.unify_normals')}</span>
            </label>
            <p className="text-[10px] text-slate-400 leading-tight pl-6">
              {t('settings.unify_normals_tip')}
            </p>
          </div>

          {/* 4. Remove Degenerate */}
          <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-dark-panel border border-dark-border hover:border-slate-600 transition-all">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.remove_degenerate}
                onChange={(e) => update('remove_degenerate', e.target.checked)}
                disabled={disabled}
                className="rounded bg-dark-surface border-dark-border text-brand-500 focus:ring-brand-500 w-4 h-4"
              />
              <span className="text-slate-200 font-semibold">{t('settings.remove_degenerate')}</span>
            </label>
            <p className="text-[10px] text-slate-400 leading-tight pl-6">
              {t('settings.remove_degenerate_tip')}
            </p>
          </div>
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
