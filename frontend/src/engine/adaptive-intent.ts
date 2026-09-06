import { ConversionConfig, TargetFormat, InspectResponse, BoundingBox } from '../types';
import { EngineMode, apiClient } from '../api/client';

export type InputFormatCategory = 'cad' | 'mesh' | 'pointcloud' | 'bim';
export type IntentCategory = 'cad_solid' | '3d_print' | 'web_render' | 'mesh_interchange';

export interface AdaptiveIntentResult {
  recommendedEngineMode: EngineMode;
  recommendedStrategy: 'smart' | 'watertight' | 'passthrough';
  adaptedConfig: ConversionConfig;
  intentCategory: IntentCategory;
  inputCategory: InputFormatCategory;
  inputExt: string;
  targetFormat: TargetFormat;
  geometryStatus: 'clean_watertight' | 'defective_open' | 'cad_brep' | 'point_cloud';
  modelExtentMm: number;
  computedSewingTolerance: number;
  computedLinearDeflection: number;
  explanationKey: string;
  explanationParams: Record<string, string | number>;
  reasons: string[];
  warnings: string[];
}

const CAD_SOLID_TARGETS = new Set<TargetFormat>(['step', 'stp', 'iges', 'igs', 'brep', 'dxf']);
const WEB_RENDER_TARGETS = new Set<TargetFormat>(['glb', 'gltf']);
const PRINT_3D_TARGETS = new Set<TargetFormat>(['3mf', 'stl']);

const PROPRIETARY_CAD_EXTS = new Set([
  'sldprt', 'sldasm', 'ipt', 'iam', 'ifc', '3dm', 'catpart', 'catproduct', 'dwg'
]);

const STANDARD_CAD_EXTS = new Set([
  'step', 'stp', 'iges', 'igs', 'brep', 'dxf'
]);

const POINT_CLOUD_EXTS = new Set([
  'pcd', 'xyz', 'las', 'laz', 'pts'
]);

const BIM_EXTS = new Set([
  'ifc', 'rvt'
]);

export class AdaptiveIntentEngine {
  /**
   * Classify file extension into broad format category
   */
  static classifyInputCategory(filename: string): InputFormatCategory {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (BIM_EXTS.has(ext)) return 'bim';
    if (POINT_CLOUD_EXTS.has(ext)) return 'pointcloud';
    if (PROPRIETARY_CAD_EXTS.has(ext) || STANDARD_CAD_EXTS.has(ext)) return 'cad';
    return 'mesh';
  }

  /**
   * Classify target format into intent category
   */
  static classifyTargetCategory(targetFormat: TargetFormat): IntentCategory {
    if (CAD_SOLID_TARGETS.has(targetFormat)) return 'cad_solid';
    if (WEB_RENDER_TARGETS.has(targetFormat)) return 'web_render';
    if (PRINT_3D_TARGETS.has(targetFormat)) return '3d_print';
    return 'mesh_interchange';
  }

  /**
   * Calculate model bounding box diagonal or maximum dimension
   */
  static computeModelExtent(bbox?: BoundingBox): number {
    if (!bbox || !bbox.size) return 100.0; // fallback standard 100mm
    const [sx, sy, sz] = bbox.size;
    const maxDim = Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sz));
    return maxDim > 0 ? maxDim : 100.0;
  }

  /**
   * Dynamically calculate adaptive sewing tolerance based on bounding extent
   */
  static computeAdaptiveSewingTolerance(extentMm: number): number {
    // Formula: clamp(extent / 10000, 0.0005, 0.01)
    const raw = extentMm / 10000;
    const clamped = Math.min(Math.max(raw, 0.0005), 0.01);
    return Math.round(clamped * 10000) / 10000;
  }

  /**
   * Dynamically calculate adaptive linear deflection for CAD meshing
   */
  static computeAdaptiveLinearDeflection(extentMm: number): number {
    // Formula: clamp(extent / 5000, 0.001, 0.05)
    const raw = extentMm / 5000;
    const clamped = Math.min(Math.max(raw, 0.001), 0.05);
    return Math.round(clamped * 1000) / 1000;
  }

  /**
   * Main intelligent inference pipeline:
   * Combines input format, target format, and geometric pre-flight defects
   * to synthesize optimal conversion parameters and engine selection.
   */
  static analyzeIntent(
    file: File | { name: string; size: number },
    targetFormat: TargetFormat,
    currentConfig: ConversionConfig,
    inspectData?: InspectResponse | null
  ): AdaptiveIntentResult {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const inputCategory = this.classifyInputCategory(file.name);
    const targetCategory = this.classifyTargetCategory(targetFormat);
    const extentMm = this.computeModelExtent(inspectData?.metrics?.bounding_box);

    const adaptiveSewingTolerance = this.computeAdaptiveSewingTolerance(extentMm);
    const adaptiveLinearDeflection = this.computeAdaptiveLinearDeflection(extentMm);

    const hasHoles = (inspectData?.defects?.open_boundary_loops ?? 0) > 0 || (inspectData && !inspectData.is_watertight);
    const holeCount = inspectData?.defects?.open_boundary_loops ?? 0;
    const hasNonManifold = (inspectData?.defects?.non_manifold_edges ?? 0) > 0;
    const isCleanWatertight = inspectData ? inspectData.is_watertight && holeCount === 0 && !hasNonManifold : false;

    let geometryStatus: 'clean_watertight' | 'defective_open' | 'cad_brep' | 'point_cloud' = 'clean_watertight';
    if (inputCategory === 'pointcloud') {
      geometryStatus = 'point_cloud';
    } else if (inputCategory === 'cad') {
      geometryStatus = 'cad_brep';
    } else if (hasHoles || hasNonManifold) {
      geometryStatus = 'defective_open';
    }

    // Engine Mode Decision
    let recommendedEngineMode: EngineMode = 'client';
    if (PROPRIETARY_CAD_EXTS.has(ext)) {
      recommendedEngineMode = 'server';
    } else if (STANDARD_CAD_EXTS.has(ext)) {
      recommendedEngineMode = apiClient.getStoredBackendUrl() ? 'server' : 'client';
    } else if (targetCategory === 'cad_solid' && (hasHoles || hasNonManifold)) {
      // Mesh to STEP solid sewing with OCC is recommended on server if backend is available
      recommendedEngineMode = apiClient.getStoredBackendUrl() ? 'server' : 'client';
    }

    // Strategy & Parameter Synthesis
    let recommendedStrategy: 'smart' | 'watertight' | 'passthrough' = 'smart';
    let autoFillHoles = false;
    let fixNonManifold = true;
    let unifyNormals = true;
    let removeDegenerate = true;
    let weldVertices = true;
    let enableSewing = true;
    let compressGltf = true;

    let explanationKey = 'settings.adaptive_reason_default';
    const explanationParams: Record<string, string | number> = {
      ext,
      target: targetFormat.toUpperCase(),
      holes: holeCount,
      extent: Math.round(extentMm),
      tol: adaptiveSewingTolerance,
      deflection: adaptiveLinearDeflection,
    };
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Decision Logic Branches:
    if (targetCategory === 'cad_solid') {
      // Intent: Exporting to CAD Solid (STEP / IGES / BREP)
      enableSewing = true;
      if (inputCategory === 'mesh') {
        if (hasHoles || !isCleanWatertight) {
          // Mesh has open boundaries -> Watertight repair is mandatory for solid B-Rep sewing!
          recommendedStrategy = 'watertight';
          autoFillHoles = true;
          fixNonManifold = true;
          explanationKey = 'settings.adaptive_reason_cad_solid_open';
          reasons.push(`自動填補 ${holeCount || '未封閉'} 處開口孔洞以利 OpenCASCADE B-Rep 實體縫合`);
          reasons.push(`依模型尺寸 (${Math.round(extentMm)}mm) 自動配置 ${adaptiveSewingTolerance}mm 縫合公差`);
        } else {
          // Clean mesh to STEP
          recommendedStrategy = 'smart';
          autoFillHoles = false;
          explanationKey = 'settings.adaptive_reason_cad_solid_clean';
          reasons.push(`保持既有幾何結構，啟用拓撲縫合生成封閉 STEP 實體`);
        }
      } else {
        // CAD to CAD
        recommendedStrategy = 'passthrough';
        autoFillHoles = false;
        fixNonManifold = false;
        explanationKey = 'settings.adaptive_reason_cad_to_cad';
        reasons.push(`CAD 幾何實體直接重構與標準拓撲轉換`);
      }
    } else if (targetCategory === '3d_print') {
      // Intent: 3D Printing (3MF / STL)
      enableSewing = false;
      if (hasHoles || !isCleanWatertight) {
        recommendedStrategy = 'watertight';
        autoFillHoles = true;
        fixNonManifold = true;
        explanationKey = 'settings.adaptive_reason_3dprint_holes';
        reasons.push(`啟用強制水密修復，消除開口與非流形邊，防止切片軟體漏水警告`);
      } else {
        recommendedStrategy = 'smart';
        autoFillHoles = false;
        explanationKey = 'settings.adaptive_reason_3dprint_clean';
        reasons.push(`模型結構已達 100% 水密，以無損保真模式輸出高精度列印網格`);
      }
    } else if (targetCategory === 'web_render') {
      // Intent: Web 3D / AR (GLB / glTF)
      recommendedStrategy = 'smart';
      compressGltf = true;
      enableSewing = false;
      explanationKey = 'settings.adaptive_reason_web_glb';
      reasons.push(`啟用 Draco 幾何壓縮與法線平滑優化，大幅縮減網頁傳輸體積`);
    } else {
      // Standard Mesh Interchange (OBJ / PLY / OFF)
      if (inputCategory === 'cad') {
        recommendedStrategy = 'smart';
        explanationKey = 'settings.adaptive_reason_cad_to_mesh';
        reasons.push(`自動匹配 ${adaptiveLinearDeflection}mm 弦高偏差進行精準曲面離散化`);
      } else {
        recommendedStrategy = hasHoles ? 'smart' : 'passthrough';
        explanationKey = 'settings.adaptive_reason_mesh_interchange';
        reasons.push(`標準幾何拓撲轉換`);
      }
    }

    const adaptedConfig: ConversionConfig = {
      target_format: targetFormat,
      cad_linear_deflection: adaptiveLinearDeflection,
      cad_angular_deflection: currentConfig.cad_angular_deflection || 0.1,
      enable_sewing: enableSewing,
      sewing_tolerance: adaptiveSewingTolerance,
      auto_fill_holes: autoFillHoles,
      fix_non_manifold: fixNonManifold,
      unify_normals: unifyNormals,
      remove_degenerate: removeDegenerate,
      weld_vertices: weldVertices,
      compress_gltf: compressGltf,
    };

    return {
      recommendedEngineMode,
      recommendedStrategy,
      adaptedConfig,
      intentCategory: targetCategory,
      inputCategory,
      inputExt: ext,
      targetFormat,
      geometryStatus,
      modelExtentMm: Math.round(extentMm * 10) / 10,
      computedSewingTolerance: adaptiveSewingTolerance,
      computedLinearDeflection: adaptiveLinearDeflection,
      explanationKey,
      explanationParams,
      reasons,
      warnings,
    };
  }
}
