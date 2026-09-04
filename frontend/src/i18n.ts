import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import zhTWTranslation from './locales/zh-TW/translation.json';
import zhCNTranslation from './locales/zh-CN/translation.json';
import jaTranslation from './locales/ja/translation.json';
import koTranslation from './locales/ko/translation.json';
import thTranslation from './locales/th/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      'zh-TW': { translation: zhTWTranslation },
      'zh-CN': { translation: zhCNTranslation },
      zh: { translation: zhCNTranslation },
      ja: { translation: jaTranslation },
      ko: { translation: koTranslation },
      th: { translation: thTranslation },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

export default i18n;
