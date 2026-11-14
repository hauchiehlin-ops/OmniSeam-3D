/**
 * Basic / Pro plan entitlements.
 *
 * iOS app: backed by StoreKit 2 (ios/App/App/StorePlugin.swift) with two
 * Non-Consumable products — the Pro one-time unlock and a price-tier-0
 * "7-Day Pro Trial" (Guideline 3.1.1: the approved way to offer a
 * time-limited trial in a non-subscription app). The trial lasts 7 days from
 * the trial transaction's purchase date; because the transaction lives on the
 * user's Apple ID, reinstalling the app does not restart it.
 *
 * Web build: every feature stays unlocked (the open-source web app is
 * unchanged). For local testing of the paywall in a browser, run the dev
 * server and set localStorage "omniseam_dev_store" = "1" — a fake store that
 * simulates purchases is used instead.
 */
import { useEffect, useState } from 'react';
import { registerPlugin, PluginListenerHandle } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App as CapApp } from '@capacitor/app';
import { IS_NATIVE } from './native';
import { clockStatus, now as trustedNow, observeTrustedTime, persistHighWater, syncClock } from './trusted-clock';

export const PRODUCT_PRO = 'io.github.hauchiehlinops.omniseam3d.pro';
export const PRODUCT_TRIAL = 'io.github.hauchiehlinops.omniseam3d.trial7d';
export const TRIAL_DAYS = 7;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

/** Features reserved for Pro (Plan A: diagnose free, repair & advanced workflows paid). */
export type ProFeature =
  | 'auto_repair'     // Smart / watertight repair strategies and expert repair toggles
  | 'cad_import'      // STEP / IGES / BREP / DXF and proprietary CAD / BIM
  | 'cloud_node'      // Cloud processing node (heavy CAD, point clouds)
  | 'wind_tunnel'     // Fluid-domain extraction
  | 'batch'           // Multi-file queue and ZIP export
  | 'draco'           // glTF / Draco compression
  | 'report_export';  // Audit report JSON / PDF export

export type Tier = 'basic' | 'trial' | 'pro';

export interface StoreProduct {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  price: number;
}

export interface EntitlementState {
  tier: Tier;
  /** True once the free trial has been claimed on this Apple ID (even if expired). */
  trialUsed: boolean;
  /** Trial end (ms since epoch) when a trial was claimed. */
  trialEndsAt: number | null;
  /**
   * The device clock was set back while offline: the trial is paused until
   * the app can reach the server once to confirm the date.
   */
  trialNeedsVerification: boolean;
  /** False until the first StoreKit read finished (cached state is shown meanwhile). */
  loaded: boolean;
}

interface Entitlement {
  productId: string;
  purchaseDate: number;
  originalPurchaseDate?: number;
}

interface EntitlementsPayload {
  entitlements: Entitlement[];
  now?: number;
  status?: 'purchased' | 'pending' | 'cancelled';
}

interface StorePluginApi {
  getProducts(options: { ids: string[] }): Promise<{ products: StoreProduct[] }>;
  purchase(options: { productId: string }): Promise<EntitlementsPayload>;
  restore(): Promise<EntitlementsPayload>;
  getEntitlements(): Promise<EntitlementsPayload>;
  addListener(event: 'entitlementsChanged', cb: (p: EntitlementsPayload) => void): Promise<PluginListenerHandle>;
}

const NativeStore = registerPlugin<StorePluginApi>('Store');

// ---------------------------------------------------------------------------
// Dev-only fake store (browser testing of the paywall)
// ---------------------------------------------------------------------------
const DEV_STORE_KEY = 'omniseam_dev_store';
const DEV_ENT_KEY = 'omniseam_dev_entitlements';

function devStoreEnabled(): boolean {
  if (!import.meta.env.DEV || IS_NATIVE) return false;
  try {
    return localStorage.getItem(DEV_STORE_KEY) === '1';
  } catch {
    return false;
  }
}

const DevStore: Omit<StorePluginApi, 'addListener'> = {
  async getProducts() {
    return {
      products: [
        { id: PRODUCT_PRO, displayName: 'OmniSeam 3D Pro', description: '', displayPrice: 'US$29.99', price: 29.99 },
        { id: PRODUCT_TRIAL, displayName: '7-Day Pro Trial', description: '', displayPrice: 'US$0.00', price: 0 },
      ],
    };
  },
  async purchase({ productId }) {
    const list = devRead();
    if (!list.some((e) => e.productId === productId)) list.push({ productId, purchaseDate: Date.now() });
    localStorage.setItem(DEV_ENT_KEY, JSON.stringify(list));
    return { entitlements: list, status: 'purchased' };
  },
  async restore() {
    return { entitlements: devRead() };
  },
  async getEntitlements() {
    return { entitlements: devRead() };
  },
};

function devRead(): Entitlement[] {
  try {
    return JSON.parse(localStorage.getItem(DEV_ENT_KEY) || '[]');
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const CACHE_KEY = 'omniseam_entitlements_v1';

/** Whether this build sells Pro at all (iOS app, or the dev fake store). */
export const PAYWALL_ENABLED = IS_NATIVE || devStoreEnabled();
/** App Store screenshot builds always show Pro features. */
const FORCE_PRO = import.meta.env.VITE_SCREENSHOT_MODE === '1';

let state: EntitlementState = {
  tier: PAYWALL_ENABLED && !FORCE_PRO ? 'basic' : 'pro',
  trialUsed: false,
  trialEndsAt: null,
  trialNeedsVerification: false,
  loaded: !PAYWALL_ENABLED || FORCE_PRO,
};
let lastEntitlements: Entitlement[] = [];
const listeners = new Set<(s: EntitlementState) => void>();
let expiryTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * @param clockSynced false while only cached data is available at launch: a
 *   trial is then not granted until the trusted clock has been checked.
 */
function computeState(list: Entitlement[], loaded: boolean, clockSynced = true): EntitlementState {
  const pro = list.some((e) => e.productId === PRODUCT_PRO);
  const trial = list.find((e) => e.productId === PRODUCT_TRIAL);
  const trialStart = trial ? trial.originalPurchaseDate ?? trial.purchaseDate : null;
  const trialEndsAt = trialStart !== null ? trialStart + TRIAL_MS : null;
  // Apple signs the trial purchase date, so it is a trusted lower bound for "now".
  if (trialStart !== null) observeTrustedTime(trialStart);
  const now = trustedNow();
  const rollback = clockStatus().rollback;
  const withinTrial = trialEndsAt !== null && now < trialEndsAt;
  const trialActive = withinTrial && !rollback && clockSynced;
  return {
    tier: pro ? 'pro' : trialActive ? 'trial' : 'basic',
    trialUsed: Boolean(trial),
    trialEndsAt,
    trialNeedsVerification: !pro && withinTrial && rollback,
    loaded,
  };
}

function apply(list: Entitlement[], persist = true) {
  lastEntitlements = list;
  state = computeState(list, true);
  if (persist) {
    Preferences.set({ key: CACHE_KEY, value: JSON.stringify(list) }).catch(() => {});
  }
  // Drop back to Basic the moment the trial expires while the app is open.
  if (expiryTimer) clearTimeout(expiryTimer);
  if (state.tier === 'trial' && state.trialEndsAt) {
    const ms = Math.min(state.trialEndsAt - trustedNow() + 1000, 2 ** 31 - 1);
    expiryTimer = setTimeout(() => apply(lastEntitlements, false), Math.max(ms, 1000));
  }
  listeners.forEach((cb) => cb(state));
}

function store(): Omit<StorePluginApi, 'addListener'> {
  return devStoreEnabled() ? DevStore : NativeStore;
}

let initPromise: Promise<void> | null = null;

/** Loads cached entitlements immediately (offline use), then refreshes from StoreKit. */
export function initEntitlements(): Promise<void> {
  if (!PAYWALL_ENABLED || FORCE_PRO) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const cached = await Preferences.get({ key: CACHE_KEY });
      if (cached.value) {
        const list = JSON.parse(cached.value) as Entitlement[];
        lastEntitlements = list;
        state = { ...computeState(list, false, false) };
        listeners.forEach((cb) => cb(state));
      }
    } catch {
      /* no cache */
    }
    if (IS_NATIVE) {
      NativeStore.addListener('entitlementsChanged', (p) => apply(p.entitlements || [])).catch(() => {});
    }
    watchClock();
    await syncClock();
    try {
      const res = await store().getEntitlements();
      apply(res.entitlements || []);
    } catch (err) {
      console.warn('Entitlements refresh failed, using cache:', err);
      state = { ...state, loaded: true };
      listeners.forEach((cb) => cb(state));
    }
  })();
  return initPromise;
}

/** Re-checks the clock and entitlements whenever the app returns to the foreground. */
function watchClock() {
  const refresh = async () => {
    await syncClock();
    try {
      const res = await store().getEntitlements();
      apply(res.entitlements || [], false);
    } catch {
      apply(lastEntitlements, false);
    }
  };
  if (IS_NATIVE) {
    CapApp.addListener('resume', refresh).catch(() => {});
    CapApp.addListener('pause', persistHighWater).catch(() => {});
  } else {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh();
      else persistHighWater();
    });
  }
  // Time spent in the app counts toward the high-water mark even if the app is killed.
  setInterval(persistHighWater, 60_000);
}

export function getEntitlementState(): EntitlementState {
  return state;
}

export function isPro(): boolean {
  return state.tier !== 'basic';
}

/** Feature check used at every entry point (UI and actions). */
export function can(_feature: ProFeature): boolean {
  return isPro();
}

export function subscribeEntitlements(cb: (s: EntitlementState) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useEntitlements(): EntitlementState {
  const [s, setS] = useState(state);
  useEffect(() => {
    setS(state);
    return subscribeEntitlements(setS);
  }, []);
  return s;
}

export async function loadProducts(): Promise<Record<string, StoreProduct>> {
  const res = await store().getProducts({ ids: [PRODUCT_PRO, PRODUCT_TRIAL] });
  const map: Record<string, StoreProduct> = {};
  for (const p of res.products || []) map[p.id] = p;
  return map;
}

export type PurchaseResult = 'purchased' | 'pending' | 'cancelled';

export async function purchase(productId: string): Promise<PurchaseResult> {
  const res = await store().purchase({ productId });
  apply(res.entitlements || []);
  return res.status || 'cancelled';
}

export async function restorePurchases(): Promise<EntitlementState> {
  const res = await store().restore();
  apply(res.entitlements || []);
  return state;
}

/** Days left in the trial, rounded up (0 when not in trial). */
export function trialDaysLeft(s: EntitlementState = state): number {
  if (s.tier !== 'trial' || !s.trialEndsAt) return 0;
  return Math.max(0, Math.ceil((s.trialEndsAt - trustedNow()) / (24 * 60 * 60 * 1000)));
}

// ---------------------------------------------------------------------------
// Plan A gating rules
// ---------------------------------------------------------------------------
export const CAD_INPUT_EXTS = new Set([
  'step', 'stp', 'iges', 'igs', 'brep', 'dxf',
  'sldprt', 'sldasm', 'ipt', 'iam', 'ifc', '3dm', 'catpart', 'catproduct', 'dwg', 'prt', 'x_t', 'x_b',
]);

export function fileExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

export function isCadFile(name: string): boolean {
  return CAD_INPUT_EXTS.has(fileExt(name));
}

interface RepairFlags {
  auto_fill_holes: boolean;
  fix_non_manifold: boolean;
  unify_normals: boolean;
  remove_degenerate: boolean;
  weld_vertices: boolean;
  compress_gltf: boolean;
}

/** True when the config asks for any geometry repair (the free tier converts as-is). */
export function configUsesRepair(c: RepairFlags): boolean {
  return c.auto_fill_holes || c.fix_non_manifold || c.unify_normals || c.remove_degenerate || c.weld_vertices;
}

/** The free-tier version of a config: plain format conversion, no repair, no Draco. */
export function toBasicConfig<T extends RepairFlags & { enable_sewing: boolean }>(c: T): T {
  return {
    ...c,
    auto_fill_holes: false,
    fix_non_manifold: false,
    unify_normals: false,
    remove_degenerate: false,
    weld_vertices: false,
    enable_sewing: false,
    compress_gltf: false,
  };
}

/**
 * Which Pro feature (if any) a conversion request needs. Order matters: the
 * first hit decides which paywall message is shown.
 */
export function requiredFeatureForConvert(
  files: File[],
  config: RepairFlags & { target_format?: string },
  engineMode: 'client' | 'server'
): ProFeature | null {
  if (files.some((f) => isCadFile(f.name))) return 'cad_import';
  if (engineMode === 'server') return 'cloud_node';
  if (files.length > 1) return 'batch';
  if (configUsesRepair(config)) return 'auto_repair';
  if (config.compress_gltf && ['glb', 'gltf'].includes(String(config.target_format))) return 'draco';
  return null;
}
