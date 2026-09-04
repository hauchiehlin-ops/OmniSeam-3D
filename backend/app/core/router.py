import time
import trimesh
from pathlib import Path
from typing import Tuple, Dict, Any
from datetime import datetime

from backend.app.models.schemas import (
    ConversionParams,
    HealthAuditReport,
    TaskResponse,
    TaskStatus,
    TargetFormat,
    SupportedLanguage
)
from backend.app.core.cad_engine import CADEngine
from backend.app.core.native_cad import NativeCADEngine
from backend.app.core.bim_engine import BIMEngine
from backend.app.core.dcc_engine import DCCEngine
from backend.app.core.pointcloud import PointCloudEngine
from backend.app.core.mesh_repair import MeshRepairEngine
from backend.app.core.auditor import ModelAuditor
from backend.app.core.optimizer import MeshOptimizer
from backend.app.storage.file_manager import file_manager
from backend.app.i18n import get_text


class ConversionPipelineRouter:
    """
    Unified geometric format router and multi-stage repair pipeline orchestrator.
    """
    
    @classmethod
    def load_input_file(cls, file_path: Path, params: ConversionParams) -> trimesh.Trimesh:
        ext = file_path.suffix.lower().lstrip(".")
        
        # 1. CAD
        if ext in ["step", "stp", "iges", "igs", "brep"]:
            return CADEngine.load_cad_file(file_path, params.cad_options)
        
        # 2. Native CAD
        if ext in ["sldprt", "sldasm"]:
            return NativeCADEngine.load_solidworks(file_path)
        if ext in ["3dm"]:
            return NativeCADEngine.load_rhino_3dm(file_path)
        if ext in ["ipt", "iam"]:
            return NativeCADEngine.load_inventor(file_path)

        # 3. BIM & AEC
        if ext in ["ifc"]:
            return BIMEngine.load_ifc(file_path)
        if ext in ["dxf", "dwg"]:
            return BIMEngine.load_dxf(file_path)

        # 4. Point Cloud
        if ext in ["las", "pcd", "xyz", "pts"]:
            return PointCloudEngine.load_and_reconstruct(file_path)

        # 5. Mesh & DCC
        return DCCEngine.load_mesh_file(file_path)

    @classmethod
    def export_target_format(cls, mesh: trimesh.Trimesh, output_path: Path, target_format: TargetFormat):
        output_path.parent.mkdir(parents=True, exist_ok=True)
        fmt = target_format.value.lower()
        
        if fmt in ["step", "stp", "iges", "igs", "brep"]:
            CADEngine.export_cad_file(mesh, output_path, fmt)
        elif fmt in ["glb", "gltf"]:
            MeshOptimizer.export_glb(mesh, output_path, compress=True)
        elif fmt in ["stl", "obj", "ply", "off", "3mf"]:
            mesh.export(str(output_path), file_type=fmt)
        elif fmt == "dxf":
            mesh.export(str(output_path), file_type="dxf")
        else:
            # Fallback to GLB
            mesh.export(str(output_path), file_type="glb")


    @classmethod
    def process_task(cls, task_id: str, input_path: Path, params: ConversionParams) -> TaskResponse:
        start_time = time.time()
        lang = params.output_options.language.value

        try:
            # Stage 1: Analyzing
            file_manager.update_task(
                task_id,
                status=TaskStatus.ANALYZING,
                progress=20,
                current_step=get_text("status.analyzing", lang)
            )
            mesh = cls.load_input_file(input_path, params)
            
            orig_metrics = ModelAuditor.compute_metrics(mesh)
            defects_found = ModelAuditor.detect_defects(mesh)

            # Stage 2: Repairing
            file_manager.update_task(
                task_id,
                status=TaskStatus.REPAIRING,
                progress=50,
                current_step=get_text("status.repairing", lang)
            )
            repaired_mesh, defects_fixed, max_deviation = MeshRepairEngine.repair_mesh(mesh, params.repair_options)
            repaired_metrics = ModelAuditor.compute_metrics(repaired_mesh)

            # Stage 3: Converting
            file_manager.update_task(
                task_id,
                status=TaskStatus.CONVERTING,
                progress=75,
                current_step=get_text("status.converting", lang)
            )
            target_ext = params.target_format.value
            out_file = file_manager.get_output_file_path(task_id, target_ext)
            cls.export_target_format(repaired_mesh, out_file, params.target_format)

            # Stage 4: Optimizing & Preview GLB
            file_manager.update_task(
                task_id,
                status=TaskStatus.OPTIMIZING,
                progress=90,
                current_step=get_text("status.optimizing", lang)
            )
            preview_file = file_manager.get_preview_file_path(task_id)
            MeshOptimizer.export_glb(repaired_mesh, preview_file, compress=params.output_options.compress_gltf)

            # Calculate volume delta percentage
            vol_delta = 0.0
            if orig_metrics.volume > 0 and repaired_metrics.volume > 0:
                vol_delta = round(((repaired_metrics.volume - orig_metrics.volume) / orig_metrics.volume) * 100.0, 3)

            duration = round(time.time() - start_time, 2)
            
            # Bilingual summaries
            status_en = f"Repaired {defects_fixed.get('holes_filled', 0)} holes. Watertight: {'Yes' if repaired_metrics.is_watertight else 'No'}."
            status_zh = f"已修復 {defects_fixed.get('holes_filled', 0)} 個孔洞。封閉實體：{'是 (Watertight)' if repaired_metrics.is_watertight else '否'}。"

            report = HealthAuditReport(
                task_id=task_id,
                filename=input_path.name,
                original_metrics=orig_metrics,
                repaired_metrics=repaired_metrics,
                defects_found=defects_found,
                defects_fixed=defects_fixed,
                watertight_achieved=repaired_metrics.is_watertight,
                volume_delta_percent=vol_delta,
                max_surface_deviation_mm=max_deviation,
                process_duration_seconds=duration,
                status_summary_en=status_en,
                status_summary_zh_TW=status_zh,
                timestamp=datetime.utcnow()
            )

            # Completed
            updated = file_manager.update_task(
                task_id,
                status=TaskStatus.COMPLETED,
                progress=100,
                current_step=get_text("status.completed", lang),
                completed_at=datetime.utcnow(),
                report=report,
                download_url=f"/api/v1/tasks/{task_id}/download",
                preview_url=f"/api/v1/tasks/{task_id}/preview"
            )
            return updated

        except Exception as e:
            error_msg = str(e)
            updated = file_manager.update_task(
                task_id,
                status=TaskStatus.FAILED,
                progress=100,
                current_step=get_text("status.failed", lang),
                completed_at=datetime.utcnow(),
                error={
                    "code": "CONVERSION_PIPELINE_ERROR",
                    "message": error_msg,
                    "i18n_key": "errors.conversion_failed"
                }
            )
            return updated
