import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Check, X, RotateCcw, Sparkles, Gift } from 'lucide-react';
import {
  ProFeature,
  PRODUCT_PRO,
  PRODUCT_TRIAL,
  StoreProduct,
  TRIAL_DAYS,
  loadProducts,
  purchase,
  restorePurchases,
  trialDaysLeft,
  useEntitlements,
} from '../platform/entitlements';
import { openExternal } from '../platform/native';
import { PRIVACY_POLICY_URL } from '../platform/links';

/** Apple's standard EULA (used when no custom license agreement is set in App Store Connect). */
const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const PRO_FEATURE_LIST: ProFeature[] = [
  'auto_repair',
  'cad_import',
  'wind_tunnel',
  'batch',
  'report_export',
  'draco',
];

export interface PaywallModalProps {
  isOpen: boolean;
  /** Feature that triggered the paywall; null for the plan overview / welcome screen. */
  feature: ProFeature | null;
  /** First-launch plan chooser: shows "Continue with Basic" as a first-class option. */
  welcome?: boolean;
  /** Optional free alternative, e.g. "Convert without repair". */
  secondaryAction?: { label: string; onClick: () => void } | null;
  onClose: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  feature,
  welcome = false,
  secondaryAction,
  onClose,
}) => {
  const { t } = useTranslation();
  const ent = useEntitlements();
  const [products, setProducts] = useState<Record<string, StoreProduct> | null>(null);
  const [productsError, setProductsError] = useState(false);
  const [busy, setBusy] = useState<null | 'pro' | 'trial' | 'restore'>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMessage(null);
    if (products) return;
    let cancelled = false;
    loadProducts()
      .then((p) => {
        if (cancelled) return;
        setProducts(p);
        setProductsError(!p[PRODUCT_PRO]);
      })
      .catch(() => !cancelled && setProductsError(true));
    return () => {
      cancelled = true;
    };
  }, [isOpen, products]);

  if (!isOpen) return null;

  const isPaid = ent.tier === 'pro';
  const inTrial = ent.tier === 'trial';
  const canStartTrial = !ent.trialUsed && !isPaid;
  const proProduct = products?.[PRODUCT_PRO];
  const trialProduct = products?.[PRODUCT_TRIAL];

  const run = async (kind: 'pro' | 'trial') => {
    const id = kind === 'pro' ? PRODUCT_PRO : PRODUCT_TRIAL;
    setBusy(kind);
    setMessage(null);
    try {
      const status = await purchase(id);
      if (status === 'purchased') {
        setMessage(kind === 'pro' ? t('plan.msg_pro_done') : t('plan.msg_trial_started', { days: TRIAL_DAYS }));
        setTimeout(onClose, 1200);
      } else if (status === 'pending') {
        setMessage(t('plan.msg_pending'));
      }
    } catch (err) {
      console.error('Purchase failed:', err);
      setMessage(t('plan.msg_failed'));
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    setMessage(null);
    try {
      const s = await restorePurchases();
      setMessage(s.tier === 'pro' ? t('plan.msg_restored') : t('plan.msg_nothing_to_restore'));
    } catch (err) {
      console.error('Restore failed:', err);
      setMessage(t('plan.msg_failed'));
    } finally {
      setBusy(null);
    }
  };

  const statusLine = isPaid
    ? t('plan.status_pro')
    : inTrial
      ? t('plan.status_trial', { days: trialDaysLeft(ent) })
      : ent.trialNeedsVerification
        ? t('plan.status_trial_verify')
        : ent.trialUsed
        ? t('plan.status_basic_trial_used')
        : t('plan.status_basic');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-dark-surface border border-amber-500/30 rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 id="paywall-title" className="text-base font-bold text-slate-100">
                {welcome ? t('plan.welcome_title') : t('plan.title')}
              </h2>
              <p className="text-[11px] text-slate-400">{statusLine}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('plan.close')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-dark-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
          {/* Why the paywall appeared */}
          {ent.trialNeedsVerification && (
            <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs text-sky-100 leading-relaxed">
              {t('plan.trial_verify_desc')}
            </div>
          )}
          {feature && !isPaid && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-100 leading-relaxed">
              {t(`plan.reason_${feature}`)}
            </div>
          )}
          {welcome && (
            <p className="text-xs text-slate-300 leading-relaxed">{t('plan.welcome_desc', { days: TRIAL_DAYS })}</p>
          )}

          {/* Basic vs Pro */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-3 rounded-xl bg-dark-panel border border-dark-border space-y-1.5">
              <div className="font-bold text-slate-200">{t('plan.basic_name')}</div>
              <div className="text-slate-400">{t('plan.basic_price')}</div>
              <ul className="space-y-1 text-slate-300 pt-1">
                {['basic_f1', 'basic_f2', 'basic_f3', 'basic_f4'].map((k) => (
                  <li key={k} className="flex gap-1.5">
                    <Check className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                    <span>{t(`plan.${k}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-1.5">
              <div className="font-bold text-amber-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {t('plan.pro_name')}
              </div>
              <div className="text-amber-300/80">
                {proProduct ? t('plan.pro_price', { price: proProduct.displayPrice }) : t('plan.pro_price_generic')}
              </div>
              <ul className="space-y-1 text-slate-200 pt-1">
                <li className="flex gap-1.5">
                  <Check className="w-3 h-3 mt-0.5 shrink-0 text-amber-300" />
                  <span>{t('plan.pro_everything_basic')}</span>
                </li>
                {PRO_FEATURE_LIST.map((f) => (
                  <li key={f} className="flex gap-1.5">
                    <Check className="w-3 h-3 mt-0.5 shrink-0 text-amber-300" />
                    <span>{t(`plan.feature_${f}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actions */}
          {!isPaid && (
            <div className="space-y-2">
              {canStartTrial && (
                <button
                  type="button"
                  onClick={() => run('trial')}
                  disabled={busy !== null || productsError || !trialProduct}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 transition-all active:scale-[0.99]"
                >
                  <Gift className="w-4 h-4" />
                  {busy === 'trial' ? t('plan.working') : t('plan.btn_trial', { days: TRIAL_DAYS })}
                </button>
              )}
              <button
                type="button"
                onClick={() => run('pro')}
                disabled={busy !== null || productsError || !proProduct}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.99] disabled:opacity-50 ${
                  canStartTrial
                    ? 'text-amber-200 bg-dark-panel border border-amber-500/40 hover:bg-amber-500/10'
                    : 'text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
                }`}
              >
                <Crown className="w-4 h-4" />
                {busy === 'pro'
                  ? t('plan.working')
                  : proProduct
                    ? t('plan.btn_buy', { price: proProduct.displayPrice })
                    : t('plan.btn_buy_generic')}
              </button>

              {secondaryAction && (
                <button
                  type="button"
                  onClick={secondaryAction.onClick}
                  disabled={busy !== null}
                  className="w-full py-2.5 rounded-xl text-xs font-medium text-slate-300 bg-dark-panel border border-dark-border hover:bg-dark-hover transition-all"
                >
                  {secondaryAction.label}
                </button>
              )}
              {welcome && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy !== null}
                  className="w-full py-2.5 rounded-xl text-xs font-medium text-slate-300 bg-dark-panel border border-dark-border hover:bg-dark-hover transition-all"
                >
                  {t('plan.btn_continue_basic')}
                </button>
              )}
            </div>
          )}

          {productsError && !isPaid && (
            <p className="text-[11px] text-rose-300 text-center">{t('plan.products_unavailable')}</p>
          )}
          {message && <p className="text-xs text-emerald-300 text-center">{message}</p>}

          {/* Restore + legal */}
          <div className="pt-1 space-y-2 text-center">
            <button
              type="button"
              onClick={restore}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-300 hover:text-brand-200 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {busy === 'restore' ? t('plan.working') : t('plan.btn_restore')}
            </button>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {t('plan.fine_print', { days: TRIAL_DAYS })}
            </p>
            <div className="flex justify-center gap-4 text-[10px]">
              <button type="button" className="text-slate-400 underline" onClick={() => openExternal(APPLE_EULA_URL)}>
                {t('plan.terms')}
              </button>
              <button type="button" className="text-slate-400 underline" onClick={() => openExternal(PRIVACY_POLICY_URL)}>
                {t('plan.privacy')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Small "PRO" chip shown on locked controls (hidden once the user has Pro or a trial). */
export const ProBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const ent = useEntitlements();
  if (ent.tier !== 'basic') return null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 ${className}`}
    >
      <Crown className="w-2.5 h-2.5" />
      PRO
    </span>
  );
};
