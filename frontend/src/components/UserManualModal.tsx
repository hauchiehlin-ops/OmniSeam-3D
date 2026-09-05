import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BookOpen, 
  X, 
  Sparkles, 
  MousePointer, 
  Cpu, 
  Terminal, 
  Printer, 
  Flame, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink,
  Layers,
  HelpCircle,
  Target,
  Wrench,
  Compass,
  ShieldCheck
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBackendSettings?: () => void;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  onOpenBackendSettings
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'quickstart' | 'fidelity' | 'viewport' | 'engine' | 'commands' | 'slicer'>('quickstart');
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const dockerCmd = `docker run -d --name omniseam-backend -p 8000:8000 --memory="16g" hauchiehlin/omniseam-3d-backend:latest`;

  const handleCopy = () => {
    navigator.clipboard.writeText(dockerCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-surface border border-dark-border rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-dark-border flex items-center justify-between bg-dark-surface/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>{t('manual.title')}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/40">
                  {t('manual.badge')}
                </span>
              </h2>
              <p className="text-xs text-slate-400">{t('manual.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-dark-panel border border-dark-border text-slate-400 hover:text-white hover:border-slate-500 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs - 6 equal columns on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-b border-dark-border bg-dark-panel/60 p-2 sm:p-3 gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTab('quickstart')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold transition-all text-center ${
              activeTab === 'quickstart'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-hover bg-dark-panel/80 border border-dark-border/40'
            }`}
            title={t('manual.tab_quickstart')}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t('manual.tab_quickstart')}</span>
          </button>

          <button
            onClick={() => setActiveTab('fidelity')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold transition-all text-center ${
              activeTab === 'fidelity'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-hover bg-dark-panel/80 border border-dark-border/40'
            }`}
            title={t('manual.tab_fidelity')}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span className="truncate">{t('manual.tab_fidelity')}</span>
          </button>

          <button
            onClick={() => setActiveTab('viewport')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold transition-all text-center ${
              activeTab === 'viewport'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-hover bg-dark-panel/80 border border-dark-border/40'
            }`}
            title={t('manual.tab_viewport')}
          >
            <MousePointer className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t('manual.tab_viewport')}</span>
          </button>

          <button
            onClick={() => setActiveTab('engine')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold transition-all text-center ${
              activeTab === 'engine'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-hover bg-dark-panel/80 border border-dark-border/40'
            }`}
            title={t('manual.tab_engine')}
          >
            <Cpu className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t('manual.tab_engine')}</span>
          </button>

          <button
            onClick={() => setActiveTab('slicer')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold transition-all text-center ${
              activeTab === 'slicer'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-hover bg-dark-panel/80 border border-dark-border/40'
            }`}
            title={t('manual.tab_slicer')}
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t('manual.tab_slicer')}</span>
          </button>

          <button
            onClick={() => setActiveTab('commands')}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold transition-all text-center ${
              activeTab === 'commands'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-hover bg-dark-panel/80 border border-dark-border/40'
            }`}
            title={t('manual.tab_commands')}
          >
            <Terminal className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t('manual.tab_commands')}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          {/* TAB 1: QUICKSTART */}
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-200">
                <h3 className="font-bold text-sm sm:text-base text-white mb-1 flex items-center gap-2">
                  <span>{t('manual.quickstart_banner_title')}</span>
                </h3>
                <p className="text-xs text-brand-300/90 leading-relaxed">
                  {t('manual.quickstart_banner_desc')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-600/30 text-brand-300 font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <h4 className="font-bold text-slate-100 text-sm">{t('manual.step1_title')}</h4>
                  <p className="text-xs text-slate-400">
                    {t('manual.step1_desc')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <h4 className="font-bold text-slate-100 text-sm">{t('manual.step2_title')}</h4>
                  <p className="text-xs text-slate-400">
                    {t('manual.step2_desc')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <h4 className="font-bold text-slate-100 text-sm">{t('manual.step3_title')}</h4>
                  <p className="text-xs text-slate-400">
                    {t('manual.step3_desc')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-2.5">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                  <span>{t('manual.presets_guide_title')}</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-brand-400 font-bold shrink-0">{t('manual.preset_game_title')}</span>
                    <span className="text-slate-300">{t('manual.preset_game_desc')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold shrink-0">{t('manual.preset_3dprint_title')}</span>
                    <span className="text-slate-300">{t('manual.preset_3dprint_desc')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold shrink-0">{t('manual.preset_asis_title')}</span>
                    <span className="text-slate-300">{t('manual.preset_asis_desc')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FIDELITY & HEALING */}
          {activeTab === 'fidelity' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 space-y-1">
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{t('manual.fidelity_title')}</span>
                </h3>
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  {t('manual.fidelity_desc')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('manual.fidelity_passthrough_title')}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('manual.fidelity_passthrough_desc')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-brand-400 font-bold text-xs">
                    <Target className="w-4 h-4 shrink-0" />
                    <span>{t('manual.fidelity_intent_title')}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('manual.fidelity_intent_desc')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('manual.fidelity_tiers_title')}</span>
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="text-slate-300 leading-relaxed">{t('manual.fidelity_tier1')}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="text-slate-300 leading-relaxed">{t('manual.fidelity_tier2')}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="text-slate-300 leading-relaxed">{t('manual.fidelity_tier3')}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-2">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('manual.fidelity_cad_title')}</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('manual.fidelity_cad_desc')}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: VIEWPORT & TOOLS */}
          {activeTab === 'viewport' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-brand-400" />
                  <span>{t('manual.viewport_title')}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="font-bold text-brand-300 block mb-1">{t('manual.control_lmb_title')}</span>
                    <span className="text-slate-400">{t('manual.control_lmb_desc')}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="font-bold text-indigo-300 block mb-1">{t('manual.control_rmb_title')}</span>
                    <span className="text-slate-400">{t('manual.control_rmb_desc')}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="font-bold text-amber-300 block mb-1">{t('manual.control_wheel_title')}</span>
                    <span className="text-slate-400">{t('manual.control_wheel_desc')}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-400" />
                  <span>{t('manual.modes_tools_title')}</span>
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li>• {t('manual.mode_shaded_bullet')}</li>
                  <li>• {t('manual.mode_wireframe_bullet')}</li>
                  <li>• {t('manual.mode_normals_bullet')}</li>
                  <li>• {t('manual.mode_xray_bullet')}</li>
                  <li>• {t('manual.mode_heatmap_bullet')}</li>
                  <li>• {t('manual.tool_measure_bullet')}</li>
                  <li>• {t('manual.tool_section_bullet')}</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: ENGINE ARCHITECTURE */}
          {activeTab === 'engine' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-brand-400" />
                  <span>{t('manual.engine_heading')}</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('manual.engine_desc')}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      {t('manual.engine_client_title')}
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>• {t('manual.engine_client_b1')}</li>
                      <li>• {t('manual.engine_client_b2')}</li>
                      <li>• {t('manual.engine_client_b3')}</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      {t('manual.engine_server_title')}
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>• {t('manual.engine_server_b1')}</li>
                      <li>• {t('manual.engine_server_b2')}</li>
                      <li>• {t('manual.engine_server_b3')}</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenBackendSettings?.();
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all"
                  >
                    <span>{t('manual.engine_settings_btn')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SLICER & PRINT */}
          {activeTab === 'slicer' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>{t('manual.slicer_heading')}</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('manual.slicer_question')}
                </p>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <b className="text-white block mb-1">{t('manual.slicer_watertight_title')}</b>
                    <span>{t('manual.slicer_watertight_desc')}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <b className="text-amber-400 block mb-1">{t('manual.slicer_overhang_title')}</b>
                    <span>{t('manual.slicer_overhang_desc')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COMMANDS & SELF-HOST */}
          {activeTab === 'commands' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-brand-400" />
                  <span>{t('manual.commands_heading')}</span>
                </h3>
                <p className="text-xs text-slate-300">
                  {t('manual.commands_desc')}
                </p>

                <div className="relative p-3 rounded-xl bg-black/70 border border-dark-border/80 font-mono text-xs text-emerald-400 overflow-x-auto">
                  <code>{dockerCmd}</code>
                  <button
                    onClick={handleCopy}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-dark-surface hover:bg-dark-hover text-slate-300 hover:text-white border border-dark-border transition-all"
                    title={t('backend_modal.copy')}
                  >
                    {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  {t('manual.commands_post_desc', { url: 'http://localhost:8000' })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border flex justify-end bg-dark-surface/95">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all"
          >
            {t('manual.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
