/**
 * Platform bridge between the web build and the Capacitor iOS shell.
 *
 * Every iOS-only behaviour is gated behind `IS_NATIVE`, so the Vercel web
 * build keeps its original browser behaviour (anchor downloads, Safari AR
 * Quick Look, LAN QR codes, localhost nodes, 500 MB limits).
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const IS_NATIVE = Capacitor.isNativePlatform();
export const IS_IOS_APP = IS_NATIVE && Capacitor.getPlatform() === 'ios';

/** Max file size processed on-device inside the iOS WebView (memory-bound). */
export const NATIVE_LOCAL_MAX_SIZE_MB = 100;
export const NATIVE_LOCAL_MAX_SIZE_BYTES = NATIVE_LOCAL_MAX_SIZE_MB * 1024 * 1024;

interface QuickLookPlugin {
  present(options: { path: string }): Promise<void>;
}
/** Native Swift plugin (ios/App/App/QuickLookPlugin.swift) wrapping QLPreviewController. */
const QuickLook = registerPlugin<QuickLookPlugin>('QuickLook');

interface AppReviewPlugin {
  requestReview(): Promise<void>;
}
/** Native Swift plugin (OmniSeamBridgeViewController.swift) for Apple's rating prompt. */
const AppReview = registerPlugin<AppReviewPlugin>('AppReview');

const REVIEW_SUCCESS_KEY = 'omniseam_successful_conversions';
const REVIEW_ASKED_KEY = 'omniseam_review_requested_version';
/** Ask after this many successful conversions (ASO: ratings drive App Store ranking). */
const REVIEW_AFTER_SUCCESSES = 3;

/**
 * Call after a conversion finished successfully. On the 3rd success, asks iOS to
 * show the system rating prompt once per app version. iOS itself limits the
 * prompt to 3 times a year, so this never nags. No-op on the web.
 */
export function recordSuccessfulConversion(appVersion: string): void {
  if (!IS_NATIVE) return;
  // Never show the rating prompt while capturing App Store screenshots.
  if (import.meta.env.VITE_SCREENSHOT_MODE === '1') return;
  try {
    const count = (parseInt(localStorage.getItem(REVIEW_SUCCESS_KEY) || '0', 10) || 0) + 1;
    localStorage.setItem(REVIEW_SUCCESS_KEY, String(count));
    if (count < REVIEW_AFTER_SUCCESSES) return;
    if (localStorage.getItem(REVIEW_ASKED_KEY) === appVersion) return;
    localStorage.setItem(REVIEW_ASKED_KEY, appVersion);
    // Small delay so the prompt appears after the result UI has settled.
    setTimeout(() => AppReview.requestReview().catch(() => {}), 1500);
  } catch {
    /* storage unavailable: skip */
  }
}

export const OPEN_FILE_EVENT = 'omniseam:open-file';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.substring(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_');
}

async function writeToCache(blob: Blob, filename: string): Promise<string> {
  // Unique folder per export so the shared file keeps its original name.
  const path = `exports/${Date.now()}/${sanitizeFilename(filename)}`;
  const data = await blobToBase64(blob);
  const res = await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Cache,
    recursive: true,
  });
  return res.uri;
}

/**
 * Saves a generated file. Web: classic anchor download. iOS: writes the file
 * to the app cache and opens the system Share Sheet ("Save to Files",
 * AirDrop, slicer apps, ...).
 */
export async function saveOrShareFile(blob: Blob, filename: string): Promise<void> {
  if (!IS_NATIVE) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return;
  }
  const uri = await writeToCache(blob, filename);
  try {
    await Share.share({ title: filename, files: [uri] });
  } catch (err: any) {
    // User dismissing the share sheet is not an error.
    if (!String(err?.message || err).toLowerCase().includes('cancel')) throw err;
  }
}

/** Fetches a URL (blob:, data:, http(s):) and saves/shares it. */
export async function saveOrShareUrl(url: string, filename: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed (${resp.status})`);
  await saveOrShareFile(await resp.blob(), filename);
}

/** Presents a USDZ in native AR Quick Look (iOS app only). */
export async function presentUsdzQuickLook(usdz: Blob, filename = 'model.usdz'): Promise<void> {
  const uri = await writeToCache(usdz, filename.endsWith('.usdz') ? filename : `${filename}.usdz`);
  await QuickLook.present({ path: uri });
}

/** Opens a URL in the system browser (Safari) from the app, or a new tab on web. */
export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function fileFromNativeUrl(url: string): Promise<File> {
  const name = decodeURIComponent(url.split('?')[0].split('/').pop() || 'model');
  const resp = await fetch(Capacitor.convertFileSrc(url));
  if (!resp.ok) throw new Error(`Cannot read opened file (${resp.status})`);
  const blob = await resp.blob();
  return new File([blob], name, { type: blob.type || 'application/octet-stream' });
}

/** One-time native shell setup: status bar, splash, safe-area class, "Open in" handling. */
export function initNativeShell(): void {
  if (!IS_NATIVE) return;
  document.documentElement.classList.add('native-app');

  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  setTimeout(() => SplashScreen.hide().catch(() => {}), 300);

  // Files opened from the Files app / Share sheet ("Open in OmniSeam 3D").
  CapApp.addListener('appUrlOpen', async ({ url }) => {
    if (!url || !url.startsWith('file:')) return;
    try {
      const file = await fileFromNativeUrl(url);
      window.dispatchEvent(new CustomEvent<File>(OPEN_FILE_EVENT, { detail: file }));
    } catch (err) {
      console.error('Failed to open shared file:', err);
    }
  });
}
