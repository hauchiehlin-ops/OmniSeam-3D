import React from 'react';
import { useTranslation } from 'react-i18next';
import { Scale, X } from 'lucide-react';

interface LicenseEntry {
  name: string;
  license: string;
}

const APP_LICENSES: LicenseEntry[] = [
  { name: 'React / React DOM', license: 'MIT' },
  { name: 'three.js', license: 'MIT' },
  { name: 'i18next / react-i18next / i18next-browser-languagedetector', license: 'MIT' },
  { name: 'Capacitor (core, iOS, App, Filesystem, Share, Preferences, Splash Screen, Status Bar)', license: 'MIT' },
  { name: 'axios', license: 'MIT' },
  { name: 'lucide-react', license: 'ISC' },
  { name: 'clsx', license: 'MIT' },
  { name: 'tailwind-merge', license: 'MIT' },
  { name: 'Tailwind CSS', license: 'MIT' },
  { name: 'canvas-confetti', license: 'ISC' },
  { name: 'Inter typeface (@fontsource/inter)', license: 'SIL Open Font License 1.1' },
  { name: 'JetBrains Mono typeface (@fontsource/jetbrains-mono)', license: 'SIL Open Font License 1.1' },
];

const SERVER_LICENSES: LicenseEntry[] = [
  { name: 'FastAPI / Starlette / Uvicorn', license: 'MIT / BSD-3-Clause' },
  { name: 'Pydantic', license: 'MIT' },
  { name: 'trimesh', license: 'MIT' },
  { name: 'NumPy / SciPy / NetworkX', license: 'BSD-3-Clause' },
  { name: 'pygltflib', license: 'MIT' },
  { name: 'ezdxf', license: 'MIT' },
  { name: 'Gradio', license: 'Apache-2.0' },
  { name: 'Open CASCADE Technology (OCCT)', license: 'LGPL-2.1 with exception' },
  { name: 'FreeCAD', license: 'LGPL-2.0-or-later' },
  { name: 'LibreDWG', license: 'GPL-3.0-or-later' },
];

interface LicensesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicensesModal: React.FC<LicensesModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const renderList = (items: LicenseEntry[]) => (
    <ul className="divide-y divide-dark-border/60 rounded-xl border border-dark-border bg-dark-panel/60">
      {items.map((item) => (
        <li key={item.name} className="flex items-start justify-between gap-3 px-3 py-2">
          <span className="text-slate-200">{item.name}</span>
          <span className="shrink-0 font-mono text-[10px] text-slate-400">{item.license}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-dark-surface border border-dark-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border bg-dark-panel/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-300">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">{t('licenses.title')}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label={t('licenses.close')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-dark-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <p className="text-slate-300 leading-relaxed">{t('licenses.intro')}</p>
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('licenses.app_section')}</h4>
            {renderList(APP_LICENSES)}
          </div>
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('licenses.server_section')}</h4>
            {renderList(SERVER_LICENSES)}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-dark-border bg-dark-panel/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-dark-panel hover:bg-dark-hover border border-dark-border text-slate-200 text-xs font-semibold"
          >
            {t('licenses.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
