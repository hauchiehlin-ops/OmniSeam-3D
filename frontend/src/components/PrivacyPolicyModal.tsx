import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, 
  X, 
  Lock, 
  ServerOff, 
  EyeOff, 
  FileCode, 
  CheckCircle2, 
  HeartHandshake,
  Database
} from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-surface border border-dark-border rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-dark-border flex items-center justify-between bg-dark-surface/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>{t('privacy.title')}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {t('privacy.guard_badge')}
                </span>
              </h2>
              <p className="text-xs text-slate-400">{t('privacy.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-dark-panel border border-dark-border text-slate-400 hover:text-white hover:border-slate-500 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-slate-300 text-xs sm:text-sm leading-relaxed">
          {/* Main Statement Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-1">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-emerald-400" />
              <span>{t('privacy.banner_title')}</span>
            </h3>
            <p className="text-xs text-emerald-300/90 leading-relaxed">
              {t('privacy.banner_desc')}
            </p>
          </div>

          {/* 4 Pillars of Security */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
              <div className="flex items-center gap-2 text-brand-400 font-bold text-xs">
                <ServerOff className="w-4 h-4 shrink-0" />
                <span>{t('privacy.pillar1_title')}</span>
              </div>
              <p className="text-xs text-slate-400">
                {t('privacy.pillar1_desc')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <EyeOff className="w-4 h-4 shrink-0" />
                <span>{t('privacy.pillar2_title')}</span>
              </div>
              <p className="text-xs text-slate-400">
                {t('privacy.pillar2_desc')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                <Lock className="w-4 h-4 shrink-0" />
                <span>{t('privacy.pillar3_title')}</span>
              </div>
              <p className="text-xs text-slate-400">
                {t('privacy.pillar3_desc')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <FileCode className="w-4 h-4 shrink-0" />
                <span>{t('privacy.pillar4_title')}</span>
              </div>
              <p className="text-xs text-slate-400">
                {t('privacy.pillar4_desc')}
              </p>
            </div>
          </div>

          {/* Data Lifecycle Table */}
          <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-brand-400" />
              <span>{t('privacy.lifecycle_title')}</span>
            </h4>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-dark-surface/60 text-slate-400 border-b border-dark-border">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('privacy.table_stage')}</th>
                    <th className="px-3 py-2 font-medium">{t('privacy.table_client_mode')}</th>
                    <th className="px-3 py-2 font-medium">{t('privacy.table_dedicated_node')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border text-slate-300">
                  <tr>
                    <td className="px-3 py-2 text-white font-medium">{t('privacy.stage_upload')}</td>
                    <td className="px-3 py-2 text-emerald-400">{t('privacy.stage_upload_client')}</td>
                    <td className="px-3 py-2 text-indigo-300">{t('privacy.stage_upload_server')}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-white font-medium">{t('privacy.stage_processing')}</td>
                    <td className="px-3 py-2 text-emerald-400">{t('privacy.stage_proc_client')}</td>
                    <td className="px-3 py-2 text-indigo-300">{t('privacy.stage_proc_server')}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-white font-medium">{t('privacy.stage_retention')}</td>
                    <td className="px-3 py-2 text-emerald-400">{t('privacy.stage_ret_client')}</td>
                    <td className="px-3 py-2 text-indigo-300">{t('privacy.stage_ret_server')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border flex justify-end bg-dark-surface/95">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all"
          >
            {t('privacy.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
