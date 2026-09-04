import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BookOpen, 
  ShieldCheck, 
  Github, 
  Settings, 
  Layers, 
  ExternalLink,
  Sparkles,
  Heart,
  Share2,
  Check,
  Mail
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import { APP_VERSION } from '../version';

interface FooterProps {
  onOpenManual: () => void;
  onOpenPrivacy: () => void;
  onOpenBackendSettings: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenManual,
  onOpenPrivacy,
  onOpenBackendSettings
}) => {
  const { t } = useTranslation();
  const [copiedShare, setCopiedShare] = useState(false);

  const supportedFormats = [
    'STEP', 'IGES', 'SolidWorks', 'Inventor', 'IFC', 'Rhino (3DM)', 
    'STL', 'OBJ', '3MF', 'GLTF / GLB', 'PLY', 'DXF', 'OFF'
  ];

  const handleShare = async () => {
    const shareData = {
      title: 'OmniSeam 3D - Universal 3D Model Converter & Auto-Healing Engine',
      text: 'Free enterprise-grade 3D CAD/Mesh converter with automated watertight healing and 100% offline privacy!',
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User dismissed share dialog
      }
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.url}`);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  return (
    <footer className="mt-12 border-t border-dark-border bg-dark-surface/90 backdrop-blur-md text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* Top Row: App Info & Navigation Quicklinks */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-dark-border/60">
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="OmniSeam 3D Logo"
              className="w-9 h-9 object-contain drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200 text-sm">{t('app_title')}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-brand-500/10 text-brand-400 border border-brand-500/30">
                  v{APP_VERSION} FOSS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                {t('tagline')}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-300 hover:text-white hover:bg-brand-500/25 text-xs font-semibold transition-all active:scale-95 shadow-sm"
              title="Share OmniSeam 3D"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-brand-400" />}
              <span>{copiedShare ? (t('nav.copied_link') || 'Link Copied!') : (t('nav.share') || 'Share')}</span>
            </button>

            <button
              onClick={onOpenManual}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-panel border border-dark-border text-slate-200 hover:text-white hover:border-slate-500 text-xs font-semibold transition-all active:scale-95 shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5 text-brand-400" />
              <span>{t('manual.nav_btn')}</span>
            </button>

            <button
              onClick={onOpenPrivacy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-panel border border-dark-border text-slate-200 hover:text-white hover:border-slate-500 text-xs font-semibold transition-all active:scale-95 shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('privacy.nav_btn')}</span>
            </button>

            <button
              onClick={onOpenBackendSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-panel border border-dark-border text-slate-200 hover:text-white hover:border-slate-500 text-xs font-semibold transition-all active:scale-95 shadow-sm"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('backend_modal.title').split('(')[0]}</span>
            </button>

            <a
              href="https://github.com/hauchiehlin-ops/OmniSeam-3D"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-panel border border-dark-border text-slate-200 hover:text-white hover:border-slate-500 text-xs font-semibold transition-all active:scale-95 shadow-sm"
            >
              <Github className="w-3.5 h-3.5 text-slate-300" />
              <span>GitHub</span>
            </a>
          </div>
        </div>

        {/* Supported Format Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 font-semibold mr-1">Supported Formats:</span>
          {supportedFormats.map((fmt) => (
            <span
              key={fmt}
              className="px-2 py-0.5 rounded-md bg-dark-panel/80 border border-dark-border/60 text-slate-300 font-mono text-[10px]"
            >
              {fmt}
            </span>
          ))}
        </div>

        {/* Bottom Copyright & Guarantee */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-[11px] text-slate-400">
          <p className="flex items-center gap-1.5 flex-wrap">
            <span>© {new Date().getFullYear()} <strong className="text-slate-200">@B&B</strong></span>
            <span>·</span>
            <span>Email :</span>
            <a 
              href="mailto:dr.cobra.lin@gmail.com" 
              className="text-brand-400 hover:text-brand-300 font-medium underline transition-colors inline-flex items-center gap-1"
            >
              <Mail className="w-3 h-3 inline" />
              <span>dr.cobra.lin@gmail.com</span>
            </a>
          </p>
          <div className="flex items-center gap-1 text-slate-500">
            <span>Crafted with</span>
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
            <span>for Global Engineers & Makers</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
