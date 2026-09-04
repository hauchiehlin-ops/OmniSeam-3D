import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Zap, Cloud } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import logoImg from '../assets/logo.png';
import { EngineMode } from '../api/client';

interface NavbarProps {
  onOpenAudit?: () => void;
  hasAudit?: boolean;
  engineMode: EngineMode;
  onToggleEngineMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAudit,
  hasAudit,
  engineMode,
  onToggleEngineMode,
}) => {
  const { t } = useTranslation();

  return (
    <header className="h-16 border-b border-dark-border bg-dark-surface/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img
          src={logoImg}
          alt="OmniSeam 3D Logo"
          className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-brand-500/20 ring-1 ring-brand-400/30"
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              {t('app_title')}
            </h1>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/30 rounded">
              v1.0 FOSS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal hidden sm:block">
            {t('app_subtitle')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Engine Mode Toggle Badge */}
        <button
          onClick={onToggleEngineMode}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-all duration-200 ${
            engineMode === 'client'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
          }`}
          title="Click to toggle between 100% In-Browser Local Engine and Backend Cloud Mode"
        >
          {engineMode === 'client' ? (
            <>
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>⚡ 100% Pure Client Engine</span>
            </>
          ) : (
            <>
              <Cloud className="w-3.5 h-3.5 text-indigo-400" />
              <span>☁️ Backend Cloud Mode</span>
            </>
          )}
        </button>

        {hasAudit && (
          <button
            onClick={onOpenAudit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/20 border border-brand-500/40 text-brand-300 text-xs font-medium hover:bg-brand-600/30 transition-all"
          >
            <Activity className="w-3.5 h-3.5 text-brand-400" />
            <span>{t('audit.title')}</span>
          </button>
        )}

        <LanguageSwitcher />
      </div>
    </header>
  );
};
