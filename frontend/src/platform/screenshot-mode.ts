/**
 * App Store screenshot automation (scripts/app-store-screenshots.sh).
 *
 * Compiled in ONLY when the web app is built with VITE_SCREENSHOT_MODE=1;
 * production builds drop it entirely. On launch it reads ./demo-scene.json
 * (written into the installed simulator app by the script) and drives the UI
 * into a deterministic state for a screenshot.
 */
import type { ConversionConfig, DisplayMode } from '../types';

export interface ScreenshotScene {
  /** home | holes | repair | report | heatmap | ar | paywall */
  scene: string;
  /** UI language, e.g. "en" or "zh-TW" */
  lang?: string;
  /** Sample model in public/samples */
  sample?: string;
  displayMode?: DisplayMode;
}

export interface ScreenshotApi {
  changeLanguage: (lang: string) => Promise<unknown>;
  loadFile: (file: File) => Promise<void>;
  setConfig: (update: (c: ConversionConfig) => ConversionConfig) => void;
  disableAutoAdaptive: () => void;
  startConvert: () => Promise<void>;
  closeAuditModal: () => void;
  openArModal: () => void;
  launchAr: () => Promise<void>;
  setDisplayMode: (mode: DisplayMode) => void;
  isModelLoaded: () => boolean;
  /** Shows the plan screen (Basic view, sample prices) for the IAP review screenshot. */
  showPaywall: () => void;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitUntil(check: () => boolean, timeoutMs = 20000): Promise<void> {
  const start = Date.now();
  while (!check() && Date.now() - start < timeoutMs) await wait(200);
}

/** Scrolls so `selector` starts just below the sticky header, unless it is already fully visible. */
function bringIntoView(selector: string): void {
  const el = document.querySelector(selector);
  if (!el) return;
  const header = (document.querySelector('header') as HTMLElement | null)?.offsetHeight ?? 64;
  const rect = el.getBoundingClientRect();
  if (rect.top >= header && rect.bottom <= window.innerHeight) return;
  window.scrollTo({ top: rect.top + window.scrollY - header - 12, behavior: 'instant' as ScrollBehavior });
}

export async function runScreenshotScene(api: () => ScreenshotApi): Promise<void> {
  let scene: ScreenshotScene;
  try {
    const resp = await fetch('./demo-scene.json', { cache: 'no-store' });
    if (!resp.ok) return;
    scene = await resp.json();
  } catch {
    return;
  }

  // No confetti in screenshots (canvas-confetti appends its canvas to <body>).
  const style = document.createElement('style');
  style.textContent = 'body > canvas { display: none !important; }';
  document.head.appendChild(style);

  if (scene.lang) await api().changeLanguage(scene.lang);
  await wait(600);
  if (scene.scene === 'paywall') {
    api().showPaywall();
    return;
  }
  if (scene.scene === 'home') {
    bringIntoView('[data-shot="dropzone"]');
    return;
  }

  const sample = scene.sample || (scene.scene === 'ar' || scene.scene === 'heatmap' ? 'l_bracket.obj' : 'holey_box.stl');
  const blob = await (await fetch(`./samples/${sample}`)).blob();
  await api().loadFile(new File([blob], sample, { type: 'application/octet-stream' }));
  await waitUntil(() => api().isModelLoaded());
  await wait(1200);
  const mode = scene.displayMode || (scene.scene === 'heatmap' ? 'heatmap' : undefined);
  if (mode) api().setDisplayMode(mode);
  if (scene.scene === 'holes' || scene.scene === 'heatmap') {
    bringIntoView('[data-shot="viewer"]');
    return;
  }

  if (scene.scene === 'repair' || scene.scene === 'report') {
    // "Forced watertight" strategy so the before/after shows filled holes.
    api().disableAutoAdaptive();
    api().setConfig((c) => ({
      ...c,
      target_format: 'stl',
      auto_fill_holes: true,
      fix_non_manifold: true,
      unify_normals: true,
      remove_degenerate: true,
      weld_vertices: true,
      enable_sewing: true,
    }));
    await wait(800);
    await api().startConvert();
    await wait(2500);
    if (scene.scene === 'repair') {
      api().closeAuditModal();
      await wait(1500);
      bringIntoView('[data-shot="viewer"]');
    }
    return;
  }

  if (scene.scene === 'ar') {
    api().openArModal();
    await wait(1200);
    await api().launchAr();
  }
}
