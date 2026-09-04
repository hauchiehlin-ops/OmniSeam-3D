import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const currentLang = i18n.language.startsWith('zh') ? 'zh-TW' : 'en';

  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'zh-TW' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-panel border border-dark-border text-xs font-medium text-slate-200 hover:text-white hover:border-brand-500 transition-all duration-200 shadow-sm"
      title="Toggle Language / 切換語系"
    >
      <Globe className="w-3.5 h-3.5 text-brand-400" />
      <span>{currentLang === 'en' ? 'English' : '繁體中文'}</span>
    </button>
  );
};
