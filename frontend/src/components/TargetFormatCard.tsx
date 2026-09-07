import React from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { TargetFormat } from '../types';

interface TargetFormatCardProps {
  targetFormat: TargetFormat;
  onChangeTargetFormat: (format: TargetFormat) => void;
  disabled?: boolean;
}

export const TargetFormatCard: React.FC<TargetFormatCardProps> = ({
  targetFormat,
  onChangeTargetFormat,
  disabled = false,
}) => {
  const { t } = useTranslation();

  const formatGroups: {
    groupName: string;
    options: { value: TargetFormat; label: string; desc: string; popular?: boolean }[];
  }[] = [
    {
      groupName: t('settings.format_group_cad'),
      options: [
        { value: 'step', label: 'STEP (.step / .stp)', desc: t('settings.fmt_step_desc'), popular: true },
        { value: 'iges', label: 'IGES (.iges / .igs)', desc: t('settings.fmt_iges_desc') },
        { value: 'brep', label: 'BREP (.brep)', desc: t('settings.fmt_brep_desc') },
        { value: 'dxf', label: 'DXF (.dxf)', desc: t('settings.fmt_dxf_desc') },
      ]
    },
    {
      groupName: t('settings.format_group_web'),
      options: [
        { value: 'glb', label: 'GLB (Binary glTF)', desc: t('settings.fmt_glb_desc'), popular: true },
        { value: 'gltf', label: 'glTF (JSON + Bin)', desc: t('settings.fmt_gltf_desc') },
      ]
    },
    {
      groupName: t('settings.format_group_mesh'),
      options: [
        { value: '3mf', label: '3MF (3D Manufacturing)', desc: t('settings.fmt_3mf_desc'), popular: true },
        { value: 'stl', label: 'STL (Stereolithography)', desc: t('settings.fmt_stl_desc'), popular: true },
        { value: 'obj', label: 'OBJ (Wavefront)', desc: t('settings.fmt_obj_desc') },
        { value: 'ply', label: 'PLY (Polygon File)', desc: t('settings.fmt_ply_desc') },
        { value: 'off', label: 'OFF (Object File)', desc: t('settings.fmt_off_desc') },
      ]
    }
  ];

  // Quick shortcuts for most popular formats
  const quickFormats: { value: TargetFormat; label: string; badge: string }[] = [
    { value: 'stl', label: 'STL', badge: t('settings.quick_badge_3dprint', '3D 列印') },
    { value: 'step', label: 'STEP', badge: t('settings.quick_badge_cad', '工業 CAD') },
    { value: '3mf', label: '3MF', badge: t('settings.quick_badge_color_struct', '彩色/結構') },
    { value: 'glb', label: 'GLB', badge: t('settings.quick_badge_web_ar', '網頁/AR') },
    { value: 'obj', label: 'OBJ', badge: t('settings.quick_badge_mesh', '通用網格') },
  ];

  // Find currently selected option description
  let activeDesc = '';
  let activeLabel = '';
  for (const group of formatGroups) {
    const found = group.options.find((opt) => opt.value === targetFormat);
    if (found) {
      activeDesc = found.desc;
      activeLabel = found.label;
      break;
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-950/40 via-dark-surface to-slate-900 border-2 border-brand-500/60 p-4 sm:p-5 shadow-xl shadow-brand-500/10 transition-all hover:border-brand-500/80">
      {/* Decorative ambient background blur */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-brand-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-3.5">
        {/* Header with highlight badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 border border-brand-400/40 flex items-center justify-center shadow-inner">
              <Target className="w-4 h-4 text-brand-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {t('settings.target_format')}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-500/20 text-brand-300 border border-brand-400/30">
                  HIGHLIGHT
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('settings.target_format_hint')}
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-brand-300 bg-brand-900/30 border border-brand-500/30 rounded-lg">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{t('settings.all_formats_interchangeable', '全格式互轉')}</span>
          </span>
        </div>

        {/* Quick Format Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium mr-1">{t('settings.quick_switch', '快捷切換：')}</span>
          {quickFormats.map((qf) => {
            const isSelected = targetFormat === qf.value;
            return (
              <button
                key={qf.value}
                type="button"
                disabled={disabled}
                onClick={() => onChangeTargetFormat(qf.value)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-brand-500 text-dark-bg shadow-md shadow-brand-500/30 ring-2 ring-brand-300 scale-105'
                    : 'bg-dark-panel/80 hover:bg-dark-panel text-slate-300 hover:text-white border border-dark-border hover:border-slate-500'
                }`}
              >
                <span>{qf.label}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded ${
                  isSelected ? 'bg-black/20 text-white font-normal' : 'text-slate-400 font-normal'
                }`}>
                  {qf.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Full Format Dropdown */}
        <div className="relative">
          <select
            value={targetFormat}
            onChange={(e) => onChangeTargetFormat(e.target.value as TargetFormat)}
            disabled={disabled}
            className="w-full bg-dark-panel/90 border-2 border-brand-500/40 focus:border-brand-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all cursor-pointer shadow-inner appearance-none"
          >
            {formatGroups.map((group) => (
              <optgroup
                key={group.groupName}
                label={group.groupName}
                className="bg-dark-panel text-brand-300 font-bold"
              >
                {group.options.map((fmt) => (
                  <option
                    key={fmt.value}
                    value={fmt.value}
                    className="bg-dark-surface text-slate-100 font-normal"
                  >
                    {fmt.label} — {fmt.desc}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-brand-400">
            <ChevronRight className="w-4 h-4 rotate-90" />
          </div>
        </div>

        {/* Currently Selected Format Status Pill */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-500/10 border border-brand-500/25 text-xs text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-brand-200 uppercase">{targetFormat}:</span>
            <span className="text-slate-300">{activeDesc || activeLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
