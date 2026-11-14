import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, Compass, AlertTriangle } from 'lucide-react';

interface ArPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelName?: string;
  /** Starts on-device AR (iOS AR Quick Look / Android Scene Viewer). */
  onLaunchDirectAr: () => Promise<void> | void;
  /** False on devices without an AR viewer (e.g. the desktop dev server). */
  isArSupported: boolean;
}

/** AR preview launcher: places the current model in the room with the device's native AR viewer. */
export const ArPreviewModal: React.FC<ArPreviewModalProps> = ({
  isOpen,
  onClose,
  modelName,
  onLaunchDirectAr,
  isArSupported,
}) => {
  const { t } = useTranslation();
  const [isLaunching, setIsLaunching] = useState(false);

  if (!isOpen) return null;

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      await onLaunchDirectAr();
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-surface border border-dark-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-dark-border flex items-center justify-between bg-dark-surface/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('ar.modal_title')}</h3>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">{modelName || '3D Model'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('ar.close')}
            className="p-2 rounded-xl bg-dark-panel border border-dark-border text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4 text-slate-300">
          {isArSupported ? (
            <button
              type="button"
              onClick={handleLaunch}
              disabled={isLaunching}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:opacity-95 disabled:opacity-60 text-white text-sm font-bold shadow-xl shadow-brand-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLaunching ? t('ar.preparing_ar') : t('ar.launch_now_btn')}</span>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t('ar.unsupported_device')}</span>
            </div>
          )}

          <p className="text-xs leading-relaxed text-slate-400">{t('ar.ar_instructions')}</p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border flex justify-end bg-dark-surface/95">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-dark-panel hover:bg-dark-hover border border-dark-border text-slate-300 hover:text-white text-xs font-semibold transition-all"
          >
            {t('ar.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
