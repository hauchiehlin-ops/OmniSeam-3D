import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudUpload, ShieldCheck, X } from 'lucide-react';
import { setUploadConsentHandler, UploadConsentDecision } from '../api/client';
import { PRIVACY_POLICY_URL } from '../platform/links';
import { openExternal } from '../platform/native';

interface PendingRequest {
  isPublic: boolean;
  host: string;
  resolve: (decision: UploadConsentDecision) => void;
}

/**
 * Asks the user before a file is uploaded to a cloud node for the first time
 * (App Store Guideline 5.1.1 / 5.1.2). Registers itself as the API client's
 * consent handler while mounted.
 */
export const UploadConsentModal: React.FC = () => {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    setUploadConsentHandler(
      (info) =>
        new Promise<UploadConsentDecision>((resolve) => {
          setRemember(false);
          setPending({ ...info, resolve });
        })
    );
    return () => setUploadConsentHandler(null);
  }, []);

  if (!pending) return null;

  const finish = (decision: UploadConsentDecision) => {
    pending.resolve(decision);
    setPending(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-dark-surface border border-brand-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border bg-dark-panel/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/20 border border-brand-500/30 text-brand-300">
              <CloudUpload className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">{t('consent.title')}</h3>
          </div>
          <button
            onClick={() => finish('declined')}
            aria-label={t('consent.decline')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-dark-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            {pending.isPublic
              ? t('consent.public_desc')
              : t('consent.own_desc', { host: pending.host })}
          </p>
          <p className="text-slate-400 text-[11px]">{t('consent.local_hint')}</p>
          <button
            type="button"
            onClick={() => openExternal(PRIVACY_POLICY_URL)}
            className="inline-flex items-center gap-1.5 text-brand-300 hover:underline text-[11px]"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('privacy.public_policy_link')}</span>
          </button>
          <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-300 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-brand-500"
            />
            <span>{t('consent.remember')}</span>
          </label>
        </div>

        <div className="px-5 py-4 border-t border-dark-border bg-dark-panel/60 flex items-center justify-end gap-2">
          <button
            onClick={() => finish('declined')}
            className="px-4 py-2 text-xs text-slate-300 hover:text-white rounded-xl border border-dark-border hover:bg-dark-hover transition-colors"
          >
            {t('consent.decline')}
          </button>
          <button
            onClick={() => finish(remember ? 'remember' : 'once')}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all"
          >
            {t('consent.accept')}
          </button>
        </div>
      </div>
    </div>
  );
};
