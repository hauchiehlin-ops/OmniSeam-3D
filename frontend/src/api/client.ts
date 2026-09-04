import axios from 'axios';
import { ConversionConfig, InspectResponse, TaskResponse } from '../types';
import { ClientPipeline } from '../engine/client-pipeline';

const API_BASE = '/api/v1';

export type EngineMode = 'client' | 'server';

export const apiClient = {
  currentEngineMode: 'client' as EngineMode,

  setEngineMode(mode: EngineMode) {
    this.currentEngineMode = mode;
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

    const response = await axios.post<InspectResponse>(`${API_BASE}/inspect`, formData, {
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

    const response = await axios.post<TaskResponse>(`${API_BASE}/convert`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getTaskStatus(taskId: string): Promise<TaskResponse> {
    const response = await axios.get<TaskResponse>(`${API_BASE}/tasks/${taskId}`);
    return response.data;
  },

  getDownloadUrl(task: TaskResponse): string {
    if (task.download_url) return task.download_url;
    return `${API_BASE}/tasks/${task.task_id}/download`;
  },

  getPreviewUrl(taskId: string): string {
    return `${API_BASE}/tasks/${taskId}/preview`;
  },

  async getSampleModel(sampleType: 'broken' | 'bracket'): Promise<{ file: File; name: string }> {
    try {
      if (this.currentEngineMode === 'client') {
        return this.generateLocalSample(sampleType);
      }
      const response = await axios.get(`${API_BASE}/sample/${sampleType}`, {
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
