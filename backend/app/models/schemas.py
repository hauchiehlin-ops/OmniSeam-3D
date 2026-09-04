from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class TargetFormat(str, Enum):
    GLTF = "gltf"
    GLB = "glb"
    STL = "stl"
    OBJ = "obj"
    PLY = "ply"
    THREE_MF = "3mf"
    OFF = "off"
    STEP = "step"
    STP = "stp"
    IGES = "iges"
    IGS = "igs"
    BREP = "brep"
    DXF = "dxf"



class TaskStatus(str, Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    REPAIRING = "repairing"
    CONVERTING = "converting"
    OPTIMIZING = "optimizing"
    COMPLETED = "completed"
    FAILED = "failed"


class SupportedLanguage(str, Enum):
    EN = "en"
    ZH_TW = "zh-TW"


class CADOptions(BaseModel):
    linear_deflection: float = Field(0.005, description="Chordal/Sagitta deflection error limit in mm", ge=0.0001, le=1.0)
    angular_deflection: float = Field(0.1, description="Angular deflection error limit in radians", ge=0.01, le=1.0)
    enable_sewing: bool = Field(True, description="Enable B-Rep topology sewing for CAD shells")
    sewing_tolerance: float = Field(0.001, description="Maximum sewing gap tolerance in mm", ge=0.00001, le=0.1)


class RepairOptions(BaseModel):
    auto_fill_holes: bool = Field(True, description="Automatically detect and triangulate boundary loops")
    fix_non_manifold: bool = Field(True, description="Split non-manifold vertices and resolve shared edges")
    unify_normals: bool = Field(True, description="Ensure all surface normals consistently point outward")
    remove_degenerate: bool = Field(True, description="Remove zero-area triangles and duplicate faces")
    weld_vertices: bool = Field(True, description="Merge duplicate vertices within tolerance")
    weld_tolerance: float = Field(1e-5, description="Vertex merge distance threshold")


class OutputOptions(BaseModel):
    compress_gltf: bool = Field(True, description="Apply quantization and compression to GLB/glTF output")
    generate_preview: bool = Field(True, description="Generate WebGL-optimized preview GLB")
    language: SupportedLanguage = Field(SupportedLanguage.EN, description="Language for reports and status")


class ConversionParams(BaseModel):
    target_format: TargetFormat = TargetFormat.GLB
    cad_options: CADOptions = Field(default_factory=CADOptions)
    repair_options: RepairOptions = Field(default_factory=RepairOptions)
    output_options: OutputOptions = Field(default_factory=OutputOptions)


class BoundingBox(BaseModel):
    min: List[float] = Field(..., description="[min_x, min_y, min_z]")
    max: List[float] = Field(..., description="[max_x, max_y, max_z]")
    size: List[float] = Field(..., description="[dx, dy, dz]")


class GeometricMetrics(BaseModel):
    vertices_count: int = 0
    faces_count: int = 0
    edges_count: int = 0
    volume: float = 0.0
    surface_area: float = 0.0
    bounding_box: BoundingBox
    is_watertight: bool = False
    euler_number: int = 0
    connected_components: int = 1


class GeometricDefectInfo(BaseModel):
    open_boundary_loops: int = 0
    non_manifold_edges: int = 0
    non_manifold_vertices: int = 0
    degenerate_faces: int = 0
    duplicate_faces: int = 0
    unreferenced_vertices: int = 0
    inverted_normals_count: int = 0
    hole_boundary_points: List[List[float]] = Field(default_factory=list, description="Coordinates of boundary loop vertices for 3D visualization")
    non_manifold_points: List[List[float]] = Field(default_factory=list, description="Coordinates of non-manifold vertices for 3D visualization")


class AssemblyNode(BaseModel):
    id: str
    name: str
    color: Optional[List[float]] = None  # RGBA [0-1]
    matrix: Optional[List[float]] = None  # 4x4 transform
    children: List['AssemblyNode'] = Field(default_factory=list)
    visible: bool = True
    part_count: int = 1


class AssemblyTree(BaseModel):
    root: AssemblyNode
    total_parts: int = 1


class SlicerReadiness(BaseModel):
    is_print_ready: bool = True
    overhang_area_mm2: float = 0.0
    overhang_faces_count: int = 0
    estimated_support_volume_cm3: float = 0.0
    bed_contact_area_mm2: float = 0.0
    warnings: List[str] = Field(default_factory=list)


class HealthAuditReport(BaseModel):
    task_id: str
    filename: str
    original_metrics: GeometricMetrics
    repaired_metrics: Optional[GeometricMetrics] = None
    defects_found: GeometricDefectInfo
    defects_fixed: Dict[str, int] = Field(default_factory=dict)
    watertight_achieved: bool = False
    volume_delta_percent: float = 0.0
    max_surface_deviation_mm: float = 0.0
    slicer_readiness: Optional[SlicerReadiness] = None
    assembly_tree: Optional[AssemblyTree] = None
    process_duration_seconds: float = 0.0
    status_summary_en: str = ""
    status_summary_zh_TW: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TaskResponse(BaseModel):
    task_id: str
    filename: str
    status: TaskStatus
    progress: int = Field(0, ge=0, le=100)
    current_step: str = ""
    target_format: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error: Optional[Dict[str, Any]] = None
    report: Optional[HealthAuditReport] = None
    download_url: Optional[str] = None
    preview_url: Optional[str] = None


class InspectResponse(BaseModel):
    filename: str
    file_format: str
    file_size_bytes: int
    metrics: GeometricMetrics
    defects: GeometricDefectInfo
    is_watertight: bool
    health_score: int = Field(..., ge=0, le=100, description="Overall mesh quality score 0-100")
    slicer_readiness: Optional[SlicerReadiness] = None
    assembly_tree: Optional[AssemblyTree] = None
    suggested_actions: List[Dict[str, str]]

