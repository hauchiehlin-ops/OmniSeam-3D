import axios from 'axios';
import { ConversionConfig, InspectResponse, TaskResponse, FluidDomainResponse, ArSessionResponse } from '../types';
import { ClientPipeline } from '../engine/client-pipeline';
import { remoteConfig, isVersionAtLeast } from '../platform/remote-config';

/** Uploads can be slow on free nodes; status/health calls should fail fast. */
const UPLOAD_TIMEOUT_MS = 180_000;
const STATUS_TIMEOUT_MS = 20_000;

/** Result of the upload-consent prompt shown before the first cloud upload. */
export type UploadConsentDecision = 'once' | 'remember' | 'declined';
export type UploadConsentHandler = (info: { isPublic: boolean; host: string }) => Promise<UploadConsentDecision>;

/** Thrown when the user declines uploading a file to a cloud node. */
export class UploadDeclinedError extends Error {
  constructor() {
    super('upload_declined');
    this.name = 'UploadDeclinedError';
  }
}

let uploadConsentHandler: UploadConsentHandler | null = null;
const sessionConsents = new Set<string>();
/** One prompt at a time: concurrent uploads to the same node share the answer. */
const pendingConsents = new Map<string, Promise<UploadConsentDecision>>();

/** Registers the UI prompt used to ask for consent before uploading. */
export function setUploadConsentHandler(handler: UploadConsentHandler | null) {
  uploadConsentHandler = handler;
}

/** Maps a failed cloud request to an i18n key + params for a user-facing message. */
export function describeNodeError(err: any): { key: string; params?: Record<string, string> } {
  if (err instanceof UploadDeclinedError) return { key: '' };
  const status: number | undefined = err?.response?.status;
  const contentType: string = err?.response?.headers?.['content-type'] || '';
  if (status === 429) return { key: 'node.rate_limited' };
  // Sleeping/building HF Spaces answer with 502/503 or an HTML status page.
  if (status === 502 || status === 503 || (status && contentType.includes('text/html'))) return { key: 'node.waking' };
  if (err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT') return { key: 'node.timeout' };
  if (!err?.response) return { key: 'node.offline' };
  const message = err?.response?.data?.detail?.message || err?.response?.data?.detail || err?.message || 'Unknown error';
  return { key: 'node.failed', params: { message: typeof message === 'string' ? message : JSON.stringify(message) } };
}

export type EngineMode = 'client' | 'server';

export interface BackendHealthResponse {
  status: string;
  service: string;
  version: string;
  uptime_seconds?: number;
  engine_features?: {
    freecad_available: boolean;
    opencascade_available: boolean;
    trimesh_available: boolean;
    server_type: string;
    supported_modes?: string[];
  };
  supported_formats: string[];
}

export interface ConnectionTestResult {
  ok: boolean;
  latencyMs: number;
  data?: BackendHealthResponse;
  error?: string;
  /** i18n key describing the failure (e.g. node.waking), when known. */
  errorKey?: string;
  /** Node is reachable but older than remoteConfig.minNodeVersion. */
  outdated?: boolean;
}

export function normalizeBackendUrl(rawUrl: string): string {
  let clean = rawUrl.trim();
  if (!clean) return '';

  // Auto-convert Hugging Face repository URL to Direct .hf.space URL
  // e.g., https://huggingface.co/spaces/hauchieh/omniseam-engine -> https://hauchieh-omniseam-engine.hf.space
  const hfRepoMatch = clean.match(/huggingface\.co\/spaces\/([^/]+)\/([^/?#]+)/i);
  if (hfRepoMatch) {
    const owner = hfRepoMatch[1].toLowerCase();
    const spaceName = hfRepoMatch[2].toLowerCase().replace(/_/g, '-');
    return `https://${owner}-${spaceName}.hf.space`;
  }

  // Ensure protocol
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = clean.includes('localhost') || clean.includes('127.0.0.1')
      ? `http://${clean}`
      : `https://${clean}`;
  }

  // Strip trailing slashes
  while (clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }

  return clean;
}

/** Built-in default; the live value comes from remote config (see getPublicNodeUrl). */
export const OFFICIAL_PUBLIC_BACKEND_URL = 'https://hauchieh-omniseam-engine.hf.space';

/** Public demo node URL (remote-configurable). */
export function getPublicNodeUrl(): string {
  return remoteConfig.publicNodeUrl || OFFICIAL_PUBLIC_BACKEND_URL;
}

/** Hugging Face "Duplicate this Space" link (remote-configurable). */
export function getDuplicateUrl(): string {
  return remoteConfig.duplicateUrl;
}
export const PUBLIC_DEMO_MAX_SIZE_MB = 25;
export const PUBLIC_DEMO_MAX_SIZE_BYTES = PUBLIC_DEMO_MAX_SIZE_MB * 1024 * 1024;
export const DEDICATED_MAX_SIZE_MB = 500;
export const DEDICATED_MAX_SIZE_BYTES = DEDICATED_MAX_SIZE_MB * 1024 * 1024;

const STORAGE_KEY_BACKEND_URL = 'omniseam_backend_url';

export const apiClient = {
  currentEngineMode: 'client' as EngineMode,
  customBackendUrl: localStorage.getItem(STORAGE_KEY_BACKEND_URL) || '',

  isPublicDemoNode(url?: string): boolean {
    const target = url !== undefined ? url : this.customBackendUrl;
    if (!target) return true; // Default fallback to public demo node when no custom node is configured
    const clean = normalizeBackendUrl(target);
    if (!clean) return true;
    // The public node may also be selected explicitly; anything else is the user's own node.
    return clean === getPublicNodeUrl() || clean === OFFICIAL_PUBLIC_BACKEND_URL;
  },


  setEngineMode(mode: EngineMode) {
    this.currentEngineMode = mode;
  },

  getStoredBackendUrl(): string {
    return this.customBackendUrl;
  },

  setBackendUrl(url: string) {
    const clean = normalizeBackendUrl(url);
    this.customBackendUrl = clean;
    if (clean) {
      localStorage.setItem(STORAGE_KEY_BACKEND_URL, clean);
    } else {
      localStorage.removeItem(STORAGE_KEY_BACKEND_URL);
    }
  },

  /** Origin of the node currently in use (custom node, else the public node). */
  getNodeOrigin(): string {
    return this.customBackendUrl || getPublicNodeUrl();
  },

  getApiBase(): string {
    return `${this.getNodeOrigin()}/api/v1`;
  },

  /** Resolves node-relative URLs (e.g. /api/v1/tasks/x/download) against the node origin. */
  absolutize(url?: string): string | undefined {
    if (!url || /^(https?:|blob:|data:)/.test(url)) return url;
    return `${this.getNodeOrigin()}${url.startsWith('/') ? '' : '/'}${url}`;
  },

  /**
   * Asks the user (once per node, or once per session) before any file is
   * uploaded to a cloud node. Throws UploadDeclinedError if declined.
   */
  async ensureUploadConsent(): Promise<void> {
    const origin = this.getNodeOrigin();
    const storageKey = `omniseam_upload_consent:${origin}`;
    if (sessionConsents.has(origin)) return;
    try {
      if (localStorage.getItem(storageKey) === 'yes') return;
    } catch {
      /* storage unavailable */
    }
    if (!uploadConsentHandler) return; // non-UI contexts (tests)
    let host = origin;
    try {
      host = new URL(origin).host;
    } catch {
      /* keep raw origin */
    }
    let prompt = pendingConsents.get(origin);
    if (!prompt) {
      prompt = uploadConsentHandler({ isPublic: this.isPublicDemoNode(), host });
      pendingConsents.set(origin, prompt);
      prompt.finally(() => pendingConsents.delete(origin)).catch(() => {});
    }
    const decision = await prompt;
    if (decision === 'declined') throw new UploadDeclinedError();
    sessionConsents.add(origin);
    if (decision === 'remember') {
      try {
        localStorage.setItem(storageKey, 'yes');
      } catch {
        /* ignore */
      }
    }
  },

  async testBackendConnection(targetUrl?: string): Promise<ConnectionTestResult> {
    const raw = (targetUrl !== undefined ? targetUrl : this.customBackendUrl);
    const url = normalizeBackendUrl(raw);
    const endpoint = url ? `${url}/api/v1/health` : '/api/v1/health';

    const startTime = performance.now();
    try {
      const response = await axios.get<BackendHealthResponse>(endpoint, {
        timeout: 15000,
      });
      const latencyMs = Math.round(performance.now() - startTime);
      const healthy = response.status === 200 && response.data?.status === 'healthy';
      if (!healthy && typeof response.data === 'string') {
        // A sleeping/building HF Space serves an HTML status page with 200.
        return { ok: false, latencyMs, error: 'Node is starting', errorKey: 'node.waking' };
      }
      return {
        ok: healthy,
        latencyMs,
        data: response.data,
        outdated: healthy && !isVersionAtLeast(response.data?.version, remoteConfig.minNodeVersion),
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      const msg = err.response?.data?.message || err.message || 'Connection failed';
      return {
        ok: false,
        latencyMs,
        error: msg,
        errorKey: describeNodeError(err).key,
      };
    }
  },

  async inspectModel(file: File, lang: string = 'en'): Promise<InspectResponse> {
    if (this.currentEngineMode === 'client') {
      try {
        return await ClientPipeline.inspectModel(file, lang);
      } catch (err) {
        console.warn("Client-side inspect fallback:", err);
      }
    }

    // Server API
    await this.ensureUploadConsent();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lang', lang);

    const response = await axios.post<InspectResponse>(`${this.getApiBase()}/inspect`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT_MS,
    });
    return response.data;
  },

  async convertModel(
    file: File,
    config: ConversionConfig,
    lang: string = 'en',
    onLocalProgress?: (task: TaskResponse) => void
  ): Promise<TaskResponse> {
    if (this.currentEngineMode === 'client') {
      try {
        return await ClientPipeline.processConversion(file, config, lang, onLocalProgress);
      } catch (err) {
        console.warn("Client-side conversion fallback to backend:", err);
      }
    }

    // Backend Server
    await this.ensureUploadConsent();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_format', config.target_format);
    formData.append('cad_linear_deflection', config.cad_linear_deflection.toString());
    formData.append('cad_angular_deflection', config.cad_angular_deflection.toString());
    formData.append('enable_sewing', config.enable_sewing.toString());
    formData.append('sewing_tolerance', config.sewing_tolerance.toString());
    formData.append('auto_fill_holes', config.auto_fill_holes.toString());
    formData.append('fix_non_manifold', config.fix_non_manifold.toString());
    formData.append('unify_normals', config.unify_normals.toString());
    formData.append('remove_degenerate', config.remove_degenerate.toString());
    formData.append('weld_vertices', config.weld_vertices.toString());
    formData.append('compress_gltf', config.compress_gltf.toString());
    formData.append('rotation_x', (config.rotation_x || 0).toString());
    formData.append('rotation_y', (config.rotation_y || 0).toString());
    formData.append('rotation_z', (config.rotation_z || 0).toString());
    formData.append('language', lang);

    const response = await axios.post<TaskResponse>(`${this.getApiBase()}/convert`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT_MS,
    });

    const task = response.data;
    task.download_url = this.absolutize(task.download_url);
    task.preview_url = this.absolutize(task.preview_url);
    return task;
  },

  async getTaskStatus(taskId: string): Promise<TaskResponse> {
    const response = await axios.get<TaskResponse>(`${this.getApiBase()}/tasks/${taskId}`, {
      timeout: STATUS_TIMEOUT_MS,
    });
    const task = response.data;
    task.download_url = this.absolutize(task.download_url);
    task.preview_url = this.absolutize(task.preview_url);
    return task;
  },

  getDownloadUrl(task: TaskResponse): string {
    if (task.download_url) return task.download_url;
    return `${this.getApiBase()}/tasks/${task.task_id}/download`;
  },

  getPreviewUrl(taskId: string): string {
    return `${this.getApiBase()}/tasks/${taskId}/preview`;
  },

  async extractFluidDomain(
    file: File,
    params: {
      inlet_factor: number;
      outlet_factor: number;
      margin_factor: number;
      boolean_mode: string;
      target_format: string;
    }
  ): Promise<FluidDomainResponse> {
    if (this.currentEngineMode === 'client') {
      try {
        return await ClientPipeline.extractFluidDomain(file, params);
      } catch (clientErr) {
        console.warn('Pure client fluid domain extraction fallback attempting server:', clientErr);
      }
    }

    try {
      await this.ensureUploadConsent();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('inlet_factor', params.inlet_factor.toString());
      formData.append('outlet_factor', params.outlet_factor.toString());
      formData.append('margin_factor', params.margin_factor.toString());
      formData.append('boolean_mode', params.boolean_mode);
      formData.append('target_format', params.target_format);

      const response = await axios.post<FluidDomainResponse>(
        `${this.getApiBase()}/wind-tunnel/extract`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: UPLOAD_TIMEOUT_MS }
      );

      const result = response.data;
      result.download_url = this.absolutize(result.download_url) as string;
      result.preview_url = this.absolutize(result.preview_url);
      return result;
    } catch (serverErr) {
      if (serverErr instanceof UploadDeclinedError) throw serverErr;
      console.warn('Server API failed or not found, falling back to 100% in-browser extraction:', serverErr);
      return await ClientPipeline.extractFluidDomain(file, params);
    }
  },

  /**
   * Creates a temporary AR streaming session on the backend.
   */
  async createArSession(
    payload: { file?: File | Blob; filename?: string; taskId?: string }
  ): Promise<ArSessionResponse> {
    if (payload.file) await this.ensureUploadConsent();
    const formData = new FormData();
    if (payload.file) {
      const name = payload.filename || (payload.file instanceof File ? payload.file.name : 'model.glb');
      formData.append('file', payload.file, name);
    }
    if (payload.taskId) {
      formData.append('task_id', payload.taskId);
    }
    if (payload.filename) {
      formData.append('filename', payload.filename);
    }

    const response = await axios.post<ArSessionResponse>(
      `${this.getApiBase()}/ar/session`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: UPLOAD_TIMEOUT_MS }
    );

    const result = response.data;
    result.glb_url = this.absolutize(result.glb_url) as string;
    result.usdz_url = this.absolutize(result.usdz_url ?? undefined);
    return result;
  },

  /**
   * Retrieves an existing AR session.
   */
  async getArSession(sessionId: string): Promise<ArSessionResponse> {
    const response = await axios.get<ArSessionResponse>(
      `${this.getApiBase()}/ar/${sessionId}`
    );
    const result = response.data;
    result.glb_url = this.absolutize(result.glb_url) as string;
    result.usdz_url = this.absolutize(result.usdz_url ?? undefined);
    return result;
  },

  getArGlbUrl(sessionId: string): string {
    return `${this.getNodeOrigin()}/api/v1/ar/${sessionId}/model.glb`;
  }
};


