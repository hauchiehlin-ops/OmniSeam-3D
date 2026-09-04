export type TargetFormat = 'glb' | 'gltf' | 'stl' | 'obj' | 'ply' | '3mf' | 'off' | 'dxf';

export type TaskStatus = 
  | 'pending'
  | 'analyzing'
  | 'repairing'
  | 'converting'
  | 'optimizing'
  | 'completed'
  | 'failed';

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
}

export interface GeometricMetrics {
  vertices_count: number;
  faces_count: number;
  edges_count: number;
  volume: number;
  surface_area: number;
  bounding_box: BoundingBox;
  is_watertight: boolean;
  euler_number: number;
  connected_components: number;
}

export interface GeometricDefectInfo {
  open_boundary_loops: number;
  non_manifold_edges: number;
  non_manifold_vertices: number;
  degenerate_faces: number;
  duplicate_faces: number;
  unreferenced_vertices: number;
  inverted_normals_count: number;
  hole_boundary_points: [number, number, number][];
  non_manifold_points: [number, number, number][];
}

export interface HealthAuditReport {
  task_id: string;
  filename: string;
  original_metrics: GeometricMetrics;
  repaired_metrics: GeometricMetrics | null;
  defects_found: GeometricDefectInfo;
  defects_fixed: Record<string, number>;
  watertight_achieved: boolean;
  volume_delta_percent: number;
  max_surface_deviation_mm: number;
  process_duration_seconds: number;
  status_summary_en: string;
  status_summary_zh_TW: string;
  timestamp: string;
}

export interface TaskResponse {
  task_id: string;
  filename: string;
  status: TaskStatus;
  progress: number;
  current_step: string;
  target_format: TargetFormat;
  created_at: string;
  completed_at?: string;
  error?: {
    code: string;
    message: string;
    i18n_key: string;
  };
  report?: HealthAuditReport;
  download_url?: string;
  preview_url?: string;
}

export interface InspectResponse {
  filename: string;
  file_format: string;
  file_size_bytes: number;
  metrics: GeometricMetrics;
  defects: GeometricDefectInfo;
  is_watertight: boolean;
  health_score: number;
  suggested_actions: Array<{ action: string; label: string }>;
}

export interface RepairOptions {
  auto_fill_holes: boolean;
  fix_non_manifold: boolean;
  unify_normals: boolean;
  remove_degenerate: boolean;
  weld_vertices: boolean;
  weld_tolerance?: number;
}

export interface CADOptions {
  linear_deflection: number;
  angular_deflection: number;
  enable_sewing: boolean;
  sewing_tolerance: number;
}

export interface ConversionConfig {
  target_format: TargetFormat;
  cad_linear_deflection: number;
  cad_angular_deflection: number;
  enable_sewing: boolean;
  sewing_tolerance: number;
  auto_fill_holes: boolean;
  fix_non_manifold: boolean;
  unify_normals: boolean;
  remove_degenerate: boolean;
  weld_vertices: boolean;
  compress_gltf: boolean;
}

export type DisplayMode = 'shaded' | 'wireframe' | 'normals' | 'xray';
