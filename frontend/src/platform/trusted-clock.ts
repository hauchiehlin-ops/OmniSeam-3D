/**
 * Tamper-resistant clock for the 7-day trial.
 *
 * Setting the device clock back must not extend the trial, so `now()` is
 * built from three sources and the device clock alone is never trusted:
 *
 *  1. Server time: the HTTPS `Date` header of our own config host, read on
 *     launch and every time the app returns to the foreground.
 *  2. High-water mark: the latest time the app has ever observed (server
 *     time, Apple's trial purchase date, or elapsed run time), kept in the
 *     Keychain so deleting and reinstalling the app does not reset it.
 *  3. Monotonic time: while the app runs, time advances with
 *     `performance.now()`, which ignores changes to the device clock.
 *
 * When offline and the device clock is earlier than the high-water mark,
 * the clock is flagged as rolled back; the trial is then paused until the
 * app can reach the server once (see entitlements.ts).
 */
import { registerPlugin } from '@capacitor/core';
import { IS_NATIVE } from './native';

/** Device clocks drift and time zones change; ignore differences smaller than this. */
const ROLLBACK_TOLERANCE_MS = 10 * 60 * 1000;
const HIGH_WATER_KEY = 'trial_high_water';

interface ClockPluginApi {
  getServerTime(): Promise<{ serverTime: number | null }>;
  getSecureValue(options: { key: string }): Promise<{ value: string | null }>;
  setSecureValue(options: { key: string; value: string }): Promise<void>;
}
const NativeClock = registerPlugin<ClockPluginApi>('Store');

// Dev-only hooks for browser testing (ignored in production builds):
//   localStorage.omniseam_dev_clock_offset = "-864000000"  → device clock 10 days behind
//   localStorage.omniseam_dev_offline = "1"                → server time unavailable
function devGet(key: string): string | null {
  if (!import.meta.env.DEV) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function deviceNow(): number {
  return Date.now() + (Number(devGet('omniseam_dev_clock_offset')) || 0);
}

const DevClock: ClockPluginApi = {
  async getServerTime() {
    if (devGet('omniseam_dev_offline') === '1') return { serverTime: null };
    try {
      const resp = await fetch('/', { method: 'HEAD', cache: 'no-store' });
      const header = resp.headers.get('Date');
      const t = header ? Date.parse(header) : NaN;
      return { serverTime: Number.isFinite(t) ? t : null };
    } catch {
      return { serverTime: null };
    }
  },
  async getSecureValue({ key }) {
    return { value: localStorage.getItem(`omniseam_dev_secure_${key}`) };
  },
  async setSecureValue({ key, value }) {
    localStorage.setItem(`omniseam_dev_secure_${key}`, value);
  },
};

const backend = (): ClockPluginApi => (IS_NATIVE ? NativeClock : DevClock);

export interface ClockStatus {
  /** True when this session's time comes from the server. */
  trusted: boolean;
  /** True when the device clock is behind a time already observed (and no server time is available). */
  rollback: boolean;
}

let baseWall = deviceNow();
let basePerf = performance.now();
let status: ClockStatus = { trusted: false, rollback: false };
let highWater = 0;
let syncPromise: Promise<ClockStatus> | null = null;

/** Current time in ms: anchored at the last sync, advanced monotonically. */
export function now(): number {
  return baseWall + (performance.now() - basePerf);
}

export function clockStatus(): ClockStatus {
  return status;
}

function anchor(wall: number) {
  baseWall = wall;
  basePerf = performance.now();
}

/**
 * Raises the high-water mark to at least `t` (for example Apple's signed
 * trial purchase date, a trusted time). Returns true if the device clock is
 * now detected as rolled back.
 */
export function observeTrustedTime(t: number): boolean {
  if (!Number.isFinite(t) || t <= highWater) return status.rollback;
  highWater = t;
  if (!status.trusted && now() < t - ROLLBACK_TOLERANCE_MS) {
    anchor(t);
    status = { trusted: false, rollback: true };
  }
  persistHighWater();
  return status.rollback;
}

/** Saves max(highWater, now()) so time spent in the app also counts offline. */
export function persistHighWater(): void {
  highWater = Math.max(highWater, Math.floor(now()));
  backend()
    .setSecureValue({ key: HIGH_WATER_KEY, value: String(highWater) })
    .catch(() => {});
}

/** Re-anchors the clock (launch / foreground). Concurrent calls share one request. */
export function syncClock(): Promise<ClockStatus> {
  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
    try {
      const stored = await backend().getSecureValue({ key: HIGH_WATER_KEY });
      const n = Number(stored.value);
      if (Number.isFinite(n) && n > highWater) highWater = n;
    } catch {
      /* keychain unavailable: keep in-memory value */
    }

    let server: number | null = null;
    try {
      server = (await backend().getServerTime()).serverTime;
    } catch {
      server = null;
    }

    const device = deviceNow();
    if (server !== null) {
      // Server time wins, even over a high-water mark raised by a clock set too far ahead.
      anchor(server);
      highWater = server;
      status = { trusted: true, rollback: false };
    } else if (device < highWater - ROLLBACK_TOLERANCE_MS) {
      anchor(highWater);
      status = { trusted: false, rollback: true };
    } else {
      anchor(Math.max(device, highWater));
      status = { trusted: false, rollback: false };
    }
    persistHighWater();
    return status;
  })().finally(() => {
    syncPromise = null;
  });
  return syncPromise;
}
