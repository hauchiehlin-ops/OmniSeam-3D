import axios from 'axios';
import { ConversionConfig, InspectResponse, TaskResponse, FluidDomainResponse, ArSessionResponse } from '../types';
import { ClientPipeline } from '../engine/client-pipeline';

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

export const OFFICIAL_PUBLIC_BACKEND_URL = 'https://hauchieh-omniseam-engine.hf.space';
export const OFFICIAL_DUPLICATE_URL = "https://huggingface.co/spaces/hauchieh/omniseam-engine?duplicate=true";
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
    // Any explicitly configured backend URL is treated as a dedicated/private node
    return false;
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

  getApiBase(): string {
    if (this.customBackendUrl) {
      return `${this.customBackendUrl}/api/v1`;
    }
    // Fallback to official public backend node when backend API is requested
    return `${OFFICIAL_PUBLIC_BACKEND_URL}/api/v1`;
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
      return {
        ok: response.status === 200 && response.data?.status === 'healthy',
        latencyMs,
        data: response.data,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      const msg = err.response?.data?.message || err.message || 'Connection failed';
      return {
        ok: false,
        latencyMs,
        error: msg,
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
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lang', lang);

    const response = await axios.post<InspectResponse>(`${this.getApiBase()}/inspect`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
    formData.append('language', lang);

    const response = await axios.post<TaskResponse>(`${this.getApiBase()}/convert`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const task = response.data;
    if (this.customBackendUrl && task.download_url && !task.download_url.startsWith('http')) {
      task.download_url = `${this.customBackendUrl}${task.download_url}`;
    }
    if (this.customBackendUrl && task.preview_url && !task.preview_url.startsWith('http')) {
      task.preview_url = `${this.customBackendUrl}${task.preview_url}`;
    }
    return task;
  },

  async getTaskStatus(taskId: string): Promise<TaskResponse> {
    const response = await axios.get<TaskResponse>(`${this.getApiBase()}/tasks/${taskId}`);
    const task = response.data;
    if (this.customBackendUrl && task.download_url && !task.download_url.startsWith('http')) {
      task.download_url = `${this.customBackendUrl}${task.download_url}`;
    }
    if (this.customBackendUrl && task.preview_url && !task.preview_url.startsWith('http')) {
      task.preview_url = `${this.customBackendUrl}${task.preview_url}`;
    }
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
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const result = response.data;
      if (this.customBackendUrl && result.download_url && !result.download_url.startsWith('http')) {
        result.download_url = `${this.customBackendUrl}${result.download_url}`;
      }
      if (this.customBackendUrl && result.preview_url && !result.preview_url.startsWith('http')) {
        result.preview_url = `${this.customBackendUrl}${result.preview_url}`;
      }
      return result;
    } catch (serverErr) {
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
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    const result = response.data;
    if (this.customBackendUrl && result.glb_url && !result.glb_url.startsWith('http')) {
      result.glb_url = `${this.customBackendUrl}${result.glb_url}`;
    }
    if (this.customBackendUrl && result.usdz_url && !result.usdz_url.startsWith('http')) {
      result.usdz_url = `${this.customBackendUrl}${result.usdz_url}`;
    }
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
    if (this.customBackendUrl && result.glb_url && !result.glb_url.startsWith('http')) {
      result.glb_url = `${this.customBackendUrl}${result.glb_url}`;
    }
    if (this.customBackendUrl && result.usdz_url && !result.usdz_url.startsWith('http')) {
      result.usdz_url = `${this.customBackendUrl}${result.usdz_url}`;
    }
    return result;
  },

  getArGlbUrl(sessionId: string): string {
    const base = this.customBackendUrl || (this.isPublicDemoNode() ? OFFICIAL_PUBLIC_BACKEND_URL : '');
    return `${base}/api/v1/ar/${sessionId}/model.glb`;
  }
};


