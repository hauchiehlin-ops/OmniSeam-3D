import { FormatParsers } from './format-parsers';
import { FormatExporters } from './format-exporters';
import { GeometricKernel } from './geometric-kernel';
import { MeshRepairKernel } from './mesh-repair';
import { 
  ConversionConfig, 
  HealthAuditReport, 
  InspectResponse, 
  TaskResponse, 
  TaskStatus 
} from '../types';

export class ClientPipeline {
  private static createdObjectUrls: string[] = [];

  /**
   * Inspects 3D model geometry directly in-browser.
   */
  static async inspectModel(file: File, lang: string = 'en'): Promise<InspectResponse> {
    const mesh = await FormatParsers.parseFile(file);
    const metrics = GeometricKernel.computeMetrics(mesh);
    const defects = GeometricKernel.detectDefects(mesh);

    let score = 100;
    if (!metrics.is_watertight) score -= 30;
    if (defects.open_boundary_loops > 0) score -= Math.min(30, defects.open_boundary_loops * 5);
    if (defects.non_manifold_edges > 0) score -= Math.min(25, defects.non_manifold_edges * 5);
    if (defects.degenerate_faces > 0) score -= Math.min(15, defects.degenerate_faces);
    score = Math.max(0, Math.min(100, score));

    const isZh = lang.startsWith('zh');
    const suggestions = [];
    if (!metrics.is_watertight || defects.open_boundary_loops > 0) {
      suggestions.push({
        action: 'fill_holes',
        label: isZh ? '建議啟用自動邊界孔洞補平以建構封閉實體' : 'Enable auto-hole filling to achieve watertight solid',
      });
    }
    if (defects.non_manifold_edges > 0) {
      suggestions.push({
        action: 'fix_non_manifold',
        label: isZh ? '建議修復非流形幾何缺陷' : 'Resolve non-manifold edges for 3D slicing',
      });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'mesh';
    const slicerInfo = GeometricKernel.analyzeSlicerReadiness(mesh);
    const assemblyTree = {
      root: {
        id: 'root',
        name: file.name,
        children: [{ id: 'part_1', name: file.name, visible: true, part_count: 1 }],
        visible: true,
        part_count: 1,
      },
      total_parts: 1,
    };

    return {
      filename: file.name,
      file_format: ext,
      file_size_bytes: file.size,
      metrics,
      defects,
      is_watertight: metrics.is_watertight,
      health_score: score,
      slicer_readiness: slicerInfo,
      assembly_tree: assemblyTree,
      suggested_actions: suggestions,
    };
  }

  /**
   * Runs the complete conversion & auto-healing pipeline 100% in-browser.
   */
  static async processConversion(
    file: File,
    config: ConversionConfig,
    lang: string = 'en',
    onProgress?: (task: TaskResponse) => void
  ): Promise<TaskResponse> {
    const startTime = performance.now();
    const taskId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isZh = lang.startsWith('zh');

    const update = (status: TaskStatus, progress: number, stepText: string): TaskResponse => {
      const task: TaskResponse = {
        task_id: taskId,
        filename: file.name,
        status,
        progress,
        current_step: stepText,
        target_format: config.target_format,
        created_at: new Date().toISOString(),
      };
      onProgress?.(task);
      return task;
    };

    // Stage 1: Analyzing
    update('analyzing', 25, isZh ? '正在分析幾何拓撲 (純前端本機)...' : 'Analyzing geometry (Local Worker)...');
    await sleep(60);

    const rawMesh = await FormatParsers.parseFile(file);
    const origMetrics = GeometricKernel.computeMetrics(rawMesh);
    const defectsFound = GeometricKernel.detectDefects(rawMesh);

    // Stage 2: Repairing
    update('repairing', 50, isZh ? '正在執行拓撲破面縫合與補洞...' : 'Auto-healing mesh defects & suturing...');
    await sleep(60);

    const repairOptions = {
      auto_fill_holes: config.auto_fill_holes,
      fix_non_manifold: config.fix_non_manifold,
      unify_normals: config.unify_normals,
      remove_degenerate: config.remove_degenerate,
      weld_vertices: config.weld_vertices,
      weld_tolerance: 1e-5,
    };

    const { repairedMesh, defectsFixed, maxDeviationMm } = MeshRepairKernel.repair(rawMesh, repairOptions);
    const repairedMetrics = GeometricKernel.computeMetrics(repairedMesh);

    // Stage 3: Converting to Target Format
    update('converting', 75, isZh ? '正在封裝目標格式...' : 'Exporting target 3D asset...');
    await sleep(40);

    const targetBlob = FormatExporters.exportBlob(repairedMesh, config.target_format);
    const downloadUrl = URL.createObjectURL(targetBlob);
    this.createdObjectUrls.push(downloadUrl);

    // Stage 4: WebGL Preview GLB Generation
    update('optimizing', 90, isZh ? '正在生成 WebGL 預覽串流...' : 'Generating WebGL Preview GLB...');
    await sleep(30);

    const previewBlob = FormatExporters.exportGLB(repairedMesh);
    const previewUrl = URL.createObjectURL(previewBlob);
    this.createdObjectUrls.push(previewUrl);

    const durationSeconds = Math.round(((performance.now() - startTime) / 1000) * 100) / 100;
    const volDelta = origMetrics.volume > 0 && repairedMetrics.volume > 0
      ? Math.round(((repairedMetrics.volume - origMetrics.volume) / origMetrics.volume) * 1000) / 10
      : 0;

    const statusEn = `Repaired ${defectsFixed.holes_filled || 0} holes. Watertight: ${repairedMetrics.is_watertight ? 'Yes' : 'No'}. (100% Client-side)`;
    const statusZh = `已修復 ${defectsFixed.holes_filled || 0} 個孔洞。封閉實體：${repairedMetrics.is_watertight ? '是 (Watertight)' : '否'}。(100% 本機端)`;

    const slicerInfo = GeometricKernel.analyzeSlicerReadiness(repairedMesh);
    const assemblyTree = {
      root: {
        id: 'root',
        name: file.name,
        children: [{ id: 'part_1', name: file.name, visible: true, part_count: 1 }],
        visible: true,
        part_count: 1,
      },
      total_parts: 1,
    };

    const report: HealthAuditReport = {
      task_id: taskId,
      filename: file.name,
      original_metrics: origMetrics,
      repaired_metrics: repairedMetrics,
      defects_found: defectsFound,
      defects_fixed: defectsFixed,
      watertight_achieved: repairedMetrics.is_watertight,
      volume_delta_percent: volDelta,
      max_surface_deviation_mm: maxDeviationMm,
      slicer_readiness: slicerInfo,
      assembly_tree: assemblyTree,
      process_duration_seconds: durationSeconds,
      status_summary_en: statusEn,
      status_summary_zh_TW: statusZh,
      timestamp: new Date().toISOString(),
    };

    const finalTask: TaskResponse = {
      task_id: taskId,
      filename: file.name,
      status: 'completed',
      progress: 100,
      current_step: isZh ? '轉換與幾何修復完成 (純本機)' : 'Conversion & Auto-Healing Completed (Local)',
      target_format: config.target_format,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      report,
      download_url: downloadUrl,
      preview_url: previewUrl,
    };

    onProgress?.(finalTask);
    return finalTask;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
