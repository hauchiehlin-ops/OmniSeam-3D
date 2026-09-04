import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Smartphone, 
  X, 
  QrCode, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  Compass
} from 'lucide-react';

interface ArPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelName?: string;
  onLaunchDirectAr?: () => void;
  isMobileDevice?: boolean;
}

export const ArPreviewModal: React.FC<ArPreviewModalProps> = ({
  isOpen,
  onClose,
  modelName,
  onLaunchDirectAr,
  isMobileDevice = false,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // Generate dynamic QR code URL using standard public SVG QR endpoint
  const currentAppUrl = window.location.href;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentAppUrl)}&color=6366f1&bgcolor=0e131f`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-surface border border-dark-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-dark-border flex items-center justify-between bg-dark-surface/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{t('ar.modal_title')}</span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">
                {modelName || '3D Model'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-dark-panel border border-dark-border text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center gap-5 text-center text-slate-300">
          {isMobileDevice ? (
            <div className="space-y-4 w-full">
              <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-left space-y-2">
                <span className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>{t('ar.mobile_detected_title')}</span>
                </span>
                <p className="text-xs text-slate-300">
                  {t('ar.mobile_detected_desc')}
                </p>
              </div>

              <button
                onClick={onLaunchDirectAr}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white text-sm font-bold shadow-xl shadow-brand-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('ar.launch_now_btn')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col items-center w-full">
              {/* QR Code Container */}
              <div className="p-3 rounded-2xl bg-[#0e131f] border-2 border-brand-500/40 shadow-2xl relative group">
                <img
                  src={qrCodeUrl}
                  alt="Scan for Mobile AR View"
                  className="w-44 h-44 rounded-xl object-contain"
                />
                <div className="absolute inset-0 bg-dark-bg/80 backdrop-blur-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                  <span className="text-xs text-brand-300 font-semibold">{t('ar.qr_hover_hint')}</span>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-100">{t('ar.scan_qr_heading')}</h4>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  {t('ar.scan_qr_instruction')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full text-[11px] text-left pt-2">
                <div className="p-2.5 rounded-xl bg-dark-panel border border-dark-border flex items-center gap-2">
                  <span className="text-base">🍎</span>
                  <div>
                    <b className="text-slate-200 block">iOS Quick Look</b>
                    <span className="text-slate-400 text-[10px]">Safari 原生 AR 投影</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-dark-panel border border-dark-border flex items-center gap-2">
                  <span className="text-base">🤖</span>
                  <div>
                    <b className="text-slate-200 block">Android Scene Viewer</b>
                    <span className="text-slate-400 text-[10px]">Google ARCore 1:1 實境</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border flex justify-end bg-dark-surface/95">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-dark-panel hover:bg-dark-hover border border-dark-border text-slate-300 hover:text-white text-xs font-semibold transition-all"
          >
            {t('audit.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
