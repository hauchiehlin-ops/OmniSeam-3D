import { useCallback, useEffect, useState } from 'react';
import {
  PAYWALL_ENABLED,
  ProFeature,
  can,
  enterScreenshotPaywallMode,
  initEntitlements,
  useEntitlements,
} from '../platform/entitlements';

export interface PaywallSecondaryAction {
  label: string;
  onClick: () => void;
}

export interface PaywallState {
  /** Feature that triggered the paywall; null for the plan overview / welcome screen. */
  feature: ProFeature | null;
  welcome?: boolean;
  secondary?: PaywallSecondaryAction | null;
}

const INTRO_SEEN_KEY = 'omniseam_plan_intro_seen';

/**
 * Basic / Pro plan state: loads StoreKit entitlements, shows the plan chooser
 * once on first launch, and gates Pro features (`requirePro`).
 */
export function usePaywall() {
  const entitlements = useEntitlements();
  const [paywall, setPaywall] = useState<PaywallState | null>(null);

  useEffect(() => {
    if (!PAYWALL_ENABLED) return;
    initEntitlements().then(() => {
      if (import.meta.env.VITE_SCREENSHOT_MODE === '1') return;
      try {
        if (localStorage.getItem(INTRO_SEEN_KEY)) return;
        localStorage.setItem(INTRO_SEEN_KEY, '1');
      } catch {
        return;
      }
      if (!can('auto_repair')) setPaywall({ feature: null, welcome: true });
    });
  }, []);

  /** True when the feature is available; otherwise opens the paywall (with an optional free alternative). */
  const requirePro = useCallback(
    (feature: ProFeature, secondary?: PaywallSecondaryAction | null): boolean => {
      if (can(feature)) return true;
      setPaywall({ feature, secondary: secondary ?? null });
      return false;
    },
    []
  );

  const openPlan = useCallback(() => setPaywall({ feature: null }), []);
  const closePaywall = useCallback(() => setPaywall(null), []);

  /** Screenshot automation only: plan chooser as a Basic user sees it. */
  const showScreenshotPaywall = useCallback(() => {
    enterScreenshotPaywallMode();
    setPaywall({ feature: null, welcome: true });
  }, []);

  return {
    entitlements,
    paywall,
    requirePro,
    openPlan: PAYWALL_ENABLED ? openPlan : undefined,
    closePaywall,
    showScreenshotPaywall,
  };
}
