/**
 * Remote runtime configuration.
 *
 * The public node URL, the Hugging Face "duplicate" link and the minimum node
 * version are read from a small JSON file hosted with the web app
 * (https://omniseam-3d.vercel.app/config.json). If Hugging Face policies change,
 * the iOS app can be pointed at a new node without a new App Store review.
 * Built-in defaults are used when offline or when the fetch fails.
 */
import { IS_NATIVE } from './native';

export interface RemoteConfig {
  schemaVersion: number;
  publicNodeUrl: string;
  duplicateUrl: string;
  minNodeVersion: string;
  /** Optional announcement shown once per distinct text, keyed by language ("en", "zh-TW", ...). */
  notice: Record<string, string> | null;
}

export const DEFAULT_REMOTE_CONFIG: RemoteConfig = {
  schemaVersion: 1,
  publicNodeUrl: 'https://hauchieh-omniseam-engine.hf.space',
  duplicateUrl: 'https://huggingface.co/spaces/hauchieh/omniseam-engine?duplicate=true',
  minNodeVersion: '4.3.0',
  notice: null,
};

const REMOTE_CONFIG_URL = 'https://omniseam-3d.vercel.app/config.json';
const CACHE_KEY = 'omniseam_remote_config';

function readCache(): Partial<RemoteConfig> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function sanitize(raw: any): Partial<RemoteConfig> {
  const out: Partial<RemoteConfig> = {};
  if (!raw || typeof raw !== 'object') return out;
  if (typeof raw.publicNodeUrl === 'string' && raw.publicNodeUrl.startsWith('https://')) out.publicNodeUrl = raw.publicNodeUrl.replace(/\/+$/, '');
  if (typeof raw.duplicateUrl === 'string' && raw.duplicateUrl.startsWith('https://huggingface.co/')) out.duplicateUrl = raw.duplicateUrl;
  if (typeof raw.minNodeVersion === 'string' && /^\d+\.\d+\.\d+$/.test(raw.minNodeVersion)) out.minNodeVersion = raw.minNodeVersion;
  if (raw.notice && typeof raw.notice === 'object') out.notice = raw.notice;
  else if (raw.notice === null) out.notice = null;
  return out;
}

export const remoteConfig: RemoteConfig = { ...DEFAULT_REMOTE_CONFIG, ...sanitize(readCache()) };

/** Fetches the latest config in the background; resolves to the merged config. */
export async function loadRemoteConfig(): Promise<RemoteConfig> {
  // Web: same-origin file. iOS app: the hosted copy on Vercel.
  const url = IS_NATIVE ? REMOTE_CONFIG_URL : './config.json';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    if (resp.ok) {
      const clean = sanitize(await resp.json());
      Object.assign(remoteConfig, clean);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(clean));
      } catch {
        /* storage full or disabled */
      }
    }
  } catch {
    /* offline: keep cached/default values */
  }
  return remoteConfig;
}

/** Semantic version comparison: returns true if `version` >= `min`. */
export function isVersionAtLeast(version: string | undefined, min: string): boolean {
  if (!version) return false;
  const a = version.split('.').map((n) => parseInt(n, 10) || 0);
  const b = min.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return true;
}
