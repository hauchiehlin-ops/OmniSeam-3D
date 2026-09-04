import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Zap, Cloud, Settings, Server } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import logoImg from '../assets/logo.png';
import { EngineMode, apiClient } from '../api/client';
import { APP_VERSION } from '../version';

interface NavbarProps {
  onOpenAudit?: () => void;
  hasAudit?: boolean;
  engineMode: EngineMode;
  onOpenBackendSettings: () => void;
  onOpenManual: () => void;
  onOpenPrivacy: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAudit,
  hasAudit,
  engineMode,
  onOpenBackendSettings,
  onOpenManual,
  onOpenPrivacy,
}) => {
  const { t } = useTranslation();
  const backendUrl = apiClient.getStoredBackendUrl();

  const getBackendDisplayName = () => {
    if (engineMode === 'client') {
      return t('navbar.node_client');
    }
    if (apiClient.isPublicDemoNode(backendUrl)) {
      return t('navbar.node_public_demo');
    }
    if (backendUrl.includes('hf.space')) {
      return t('navbar.node_dedicated_hf');
    }
    if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
      return t('navbar.node_local_docker');
    }
    if (backendUrl) {
      try {
        const parsed = new URL(backendUrl);
        return t('navbar.node_custom', { host: parsed.hostname });
      } catch {
        return t('navbar.node_custom', { host: 'CAD' });
      }
    }
    return t('navbar.node_public_demo');
  };


  return (
    <header className="h-16 border-b border-dark-border bg-dark-surface/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img
          src={logoImg}
          alt="OmniSeam 3D Logo"
          className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.35)] hover:scale-105 transition-transform duration-200"
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              {t('app_title')}
            </h1>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/30 rounded">
              v{APP_VERSION} FOSS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal hidden sm:block">
            {t('app_subtitle')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Manual Button */}
        <button
          onClick={onOpenManual}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-panel border border-dark-border text-slate-300 hover:text-white hover:border-slate-500 text-xs font-medium transition-all shadow-sm active:scale-95"
          title={t('manual.nav_btn')}
        >
          <span>📖</span>
          <span>{t('manual.nav_btn')}</span>
        </button>

        {/* Privacy Policy Button */}
        <button
          onClick={onOpenPrivacy}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-panel border border-dark-border text-slate-300 hover:text-white hover:border-slate-500 text-xs font-medium transition-all shadow-sm active:scale-95"
          title={t('privacy.nav_btn')}
        >
          <span className="text-emerald-400">🛡️</span>
          <span>{t('privacy.nav_btn')}</span>
        </button>

        {/* Engine Node Status Button -> Opens Backend Modal */}
        <button
          onClick={onOpenBackendSettings}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 group shadow-sm ${
            engineMode === 'client'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/25 shadow-indigo-500/10'
          }`}
          title="Click to configure Dedicated CAD Engine Node (Hugging Face / Local Docker / Client)"
        >
          {engineMode === 'client' ? (
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          ) : (
            <Cloud className="w-3.5 h-3.5 text-indigo-400" />
          )}
          <span className="hidden sm:inline">{getBackendDisplayName()}</span>
          <Settings className="w-3 h-3 text-slate-400 group-hover:text-slate-200 group-hover:rotate-45 transition-all" />
        </button>

        {hasAudit && (
          <button
            onClick={onOpenAudit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/20 border border-brand-500/40 text-brand-300 text-xs font-medium hover:bg-brand-600/30 transition-all"
          >
            <Activity className="w-3.5 h-3.5 text-brand-400" />
            <span className="hidden sm:inline">{t('audit.title')}</span>
          </button>
        )}

        <LanguageSwitcher />
      </div>
    </header>
  );
};
