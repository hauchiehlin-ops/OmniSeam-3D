import axios from 'axios';
import { ConversionConfig, InspectResponse, TaskResponse } from '../types';
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

const STORAGE_KEY_BACKEND_URL = 'omniseam_backend_url';

export const apiClient = {
  currentEngineMode: 'client' as EngineMode,
  customBackendUrl: localStorage.getItem(STORAGE_KEY_BACKEND_URL) || '',

  setEngineMode(mode: EngineMode) {
    this.currentEngineMode = mode;
  },

  getStoredBackendUrl(): string {
    return this.customBackendUrl;
  },

  setBackendUrl(url: string) {
    let clean = url.trim();
    if (clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
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
    return '/api/v1';
  },

  async testBackendConnection(targetUrl?: string): Promise<ConnectionTestResult> {
    let url = (targetUrl !== undefined ? targetUrl : this.customBackendUrl).trim();
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
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

  async getSampleModel(sampleType: 'broken' | 'bracket'): Promise<{ file: File; name: string }> {
    try {
      if (this.currentEngineMode === 'client') {
        return this.generateLocalSample(sampleType);
      }
      const response = await axios.get(`${this.getApiBase()}/sample/${sampleType}`, {
        responseType: 'blob',
      });
      const filename = sampleType === 'broken' ? 'defective_sample.stl' : 'watertight_bracket.stl';
      const file = new File([response.data], filename, { type: 'model/stl' });
      return { file, name: filename };
    } catch {
      return this.generateLocalSample(sampleType);
    }
  },

  generateLocalSample(sampleType: 'broken' | 'bracket'): { file: File; name: string } {
    if (sampleType === 'broken') {
      let stl = "solid defective_mesh\n";
      stl += "  facet normal 0 0 -1\n    outer loop\n      vertex 0 0 0\n      vertex 30 0 0\n      vertex 15 25 0\n    endloop\n  endfacet\n";
      stl += "  facet normal 0 -1 0\n    outer loop\n      vertex 0 0 0\n      vertex 30 0 0\n      vertex 0 0 20\n    endloop\n  endfacet\n";
      stl += "  facet normal 0 -1 0\n    outer loop\n      vertex 30 0 0\n      vertex 30 0 20\n      vertex 0 0 20\n    endloop\n  endfacet\n";
      stl += "  facet normal 1 1 0\n    outer loop\n      vertex 30 0 0\n      vertex 15 25 0\n      vertex 30 0 20\n    endloop\n  endfacet\n";
      stl += "  facet normal 1 1 0\n    outer loop\n      vertex 15 25 0\n      vertex 15 25 20\n      vertex 30 0 20\n    endloop\n  endfacet\n";
      stl += "  facet normal -1 1 0\n    outer loop\n      vertex 15 25 0\n      vertex 0 0 0\n      vertex 15 25 20\n    endloop\n  endfacet\n";
      stl += "  facet normal -1 1 0\n    outer loop\n      vertex 0 0 0\n      vertex 0 0 20\n      vertex 15 25 20\n    endloop\n  endfacet\n";
      stl += "endsolid defective_mesh\n";

      const file = new File([stl], "defective_sample.stl", { type: 'model/stl' });
      return { file, name: "defective_sample.stl" };
    } else {
      let stl = "solid watertight_bracket\n";
      const addQuad = (p0: string, p1: string, p2: string, p3: string, n: string) => {
        stl += `  facet normal ${n}\n    outer loop\n      vertex ${p0}\n      vertex ${p1}\n      vertex ${p2}\n    endloop\n  endfacet\n`;
        stl += `  facet normal ${n}\n    outer loop\n      vertex ${p0}\n      vertex ${p2}\n      vertex ${p3}\n    endloop\n  endfacet\n`;
      };
      addQuad("0 0 0", "30 0 0", "30 20 0", "0 20 0", "0 0 -1");
      addQuad("0 0 15", "30 0 15", "30 20 15", "0 20 15", "0 0 1");
      addQuad("0 0 0", "30 0 0", "30 0 15", "0 0 15", "0 -1 0");
      addQuad("30 0 0", "30 20 0", "30 20 15", "30 0 15", "1 0 0");
      addQuad("30 20 0", "0 20 0", "0 20 15", "30 20 15", "0 1 0");
      addQuad("0 20 0", "0 0 0", "0 0 15", "0 20 15", "-1 0 0");
      stl += "endsolid watertight_bracket\n";

      const file = new File([stl], "watertight_bracket.stl", { type: 'model/stl' });
      return { file, name: "watertight_bracket.stl" };
    }
  }
};
