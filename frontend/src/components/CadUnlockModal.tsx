import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Lock, 
  Sparkles, 
  Cloud, 
  FileCode, 
  CheckCircle, 
  ArrowRight,
  X
} from 'lucide-react';
import { apiClient, OFFICIAL_PUBLIC_BACKEND_URL } from '../api/client';

interface CadUnlockModalProps {
  isOpen: boolean;
  fileName?: string;
  onClose: () => void;
  onOpenBackendSettings: () => void;
}

export const CadUnlockModal: React.FC<CadUnlockModalProps> = ({
  isOpen,
  fileName = '',
  onClose,
  onOpenBackendSettings,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const ext = fileName.split('.').pop()?.toUpperCase() || 'CAD';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-dark-surface border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Glow decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-indigo-500/20 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-dark-panel/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{t('cad_unlock.title')}</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded">
                  .{ext}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {fileName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-dark-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-300 leading-relaxed space-y-2">
            <p>
              {t('cad_unlock.desc_1')}
            </p>
            <p className="text-slate-400">
              {t('cad_unlock.desc_2')}
            </p>
          </div>

          <div className="space-y-3">
            {/* Option 0: 1-Click Official Public Node (Instant) */}
            <div 
              onClick={() => {
                apiClient.setBackendUrl(OFFICIAL_PUBLIC_BACKEND_URL);
                apiClient.setEngineMode('server');
                onClose();
              }}
              className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 hover:border-emerald-400 cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{t('cad_unlock.opt0_title')}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">
                        {t('backend_modal.public_node_tag1')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {t('cad_unlock.opt0_desc')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
              </div>
            </div>

            {/* Option 1: Hugging Face 1-Click Free Space */}
            <div 
              onClick={() => {
                onClose();
                onOpenBackendSettings();
              }}
              className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 to-dark-panel border border-indigo-500/40 hover:border-indigo-400 cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 mt-0.5">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{t('cad_unlock.opt1_title')}</span>
                      <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20 font-mono">
                        {t('backend_modal.hf_duplicate_tag')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {t('cad_unlock.opt1_desc')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
              </div>
            </div>

            {/* Option 2: Convert to STEP/STL for Pure Client */}
            <div className="p-3 bg-dark-panel border border-dark-border rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-200 font-bold">
                <FileCode className="w-3.5 h-3.5 text-brand-400" />
                <span>{t('cad_unlock.opt2_title')}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t('cad_unlock.opt2_desc')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-border bg-dark-panel/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            {t('cad_unlock.cancel')}
          </button>

          <button
            onClick={() => {
              apiClient.setBackendUrl(OFFICIAL_PUBLIC_BACKEND_URL);
              apiClient.setEngineMode('server');
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('cad_unlock.go_public')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
