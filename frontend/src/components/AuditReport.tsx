import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  Printer, 
  X, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  TrendingDown,
  Layers,
  Box
} from 'lucide-react';
import { HealthAuditReport, InspectResponse } from '../types';

interface AuditReportProps {
  report?: HealthAuditReport | null;
  inspectData?: InspectResponse | null;
  onClose: () => void;
}

export const AuditReport: React.FC<AuditReportProps> = ({
  report,
  inspectData,
  onClose
}) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  const origMetrics = report ? report.original_metrics : inspectData?.metrics;
  const repairedMetrics = report?.repaired_metrics;
  const defects = report ? report.defects_found : inspectData?.defects;
  const isWatertight = report ? report.watertight_achieved : (inspectData?.is_watertight ?? false);

  const handleExportJson = () => {
    const dataToExport = report || inspectData;
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!origMetrics || !defects) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-surface border border-dark-border rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-dark-border flex items-center justify-between sticky top-0 bg-dark-surface/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {t('audit.title')}
              </h2>
              <p className="text-xs text-slate-400">
                {report ? report.filename : inspectData?.filename}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="p-2 rounded-xl bg-dark-panel border border-dark-border text-slate-300 hover:text-white transition-all"
              title={t('audit.export_json')}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-dark-panel border border-dark-border text-slate-300 hover:text-white transition-all"
              title={t('audit.export_pdf')}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-dark-panel border border-dark-border text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-6">
          {/* Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            isWatertight
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex items-center gap-3">
              {isWatertight ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              )}
              <div>
                <h4 className="text-sm font-bold">
                  {isWatertight ? t('audit.watertight') : t('audit.not_watertight')}
                </h4>
                <p className="text-xs opacity-80">
                  {report
                    ? isZh ? report.status_summary_zh_TW : report.status_summary_en
                    : isWatertight
                    ? "Model topology is completely closed without holes."
                    : "Boundary holes or non-manifold edges detected."}
                </p>
              </div>
            </div>

            {report && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>{report.process_duration_seconds}s</span>
              </div>
            )}
          </div>

          {/* Metrics Delta Table */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {t('audit.metrics_comparison')}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-dark-border bg-dark-panel">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-surface/50 text-slate-400 border-b border-dark-border">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">{t('audit.metric_col')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('audit.original_col')}</th>
                    {repairedMetrics && <th className="px-4 py-2.5 font-medium text-emerald-400">{t('audit.repaired_col')}</th>}
                    {repairedMetrics && <th className="px-4 py-2.5 font-medium">{t('audit.delta_col')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border text-slate-200">
                  <tr>
                    <td className="px-4 py-2.5 text-slate-400">{t('audit.vertices')}</td>
                    <td className="px-4 py-2.5 font-mono">{origMetrics.vertices_count.toLocaleString()}</td>
                    {repairedMetrics && (
                      <td className="px-4 py-2.5 font-mono text-emerald-300">{repairedMetrics.vertices_count.toLocaleString()}</td>
                    )}
                    {repairedMetrics && (
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {repairedMetrics.vertices_count - origMetrics.vertices_count >= 0 ? '+' : ''}
                        {repairedMetrics.vertices_count - origMetrics.vertices_count}
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-400">{t('audit.faces')}</td>
                    <td className="px-4 py-2.5 font-mono">{origMetrics.faces_count.toLocaleString()}</td>
                    {repairedMetrics && (
                      <td className="px-4 py-2.5 font-mono text-emerald-300">{repairedMetrics.faces_count.toLocaleString()}</td>
                    )}
                    {repairedMetrics && (
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {repairedMetrics.faces_count - origMetrics.faces_count >= 0 ? '+' : ''}
                        {repairedMetrics.faces_count - origMetrics.faces_count}
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-400">{t('audit.volume')}</td>
                    <td className="px-4 py-2.5 font-mono">{origMetrics.volume.toFixed(2)}</td>
                    {repairedMetrics && (
                      <td className="px-4 py-2.5 font-mono text-emerald-300">{repairedMetrics.volume.toFixed(2)}</td>
                    )}
                    {repairedMetrics && (
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {report?.volume_delta_percent}%
                      </td>
                    )}
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-400">{t('audit.surface_area')}</td>
                    <td className="px-4 py-2.5 font-mono">{origMetrics.surface_area.toFixed(2)}</td>
                    {repairedMetrics && (
                      <td className="px-4 py-2.5 font-mono text-emerald-300">{repairedMetrics.surface_area.toFixed(2)}</td>
                    )}
                    {repairedMetrics && (
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {((repairedMetrics.surface_area - origMetrics.surface_area)).toFixed(2)}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Defects & Repairs Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-dark-panel p-4 rounded-xl border border-dark-border flex flex-col gap-2">
              <span className="text-xs font-semibold text-rose-400">{t('audit.defects_found_title')}</span>
              <ul className="text-xs text-slate-300 space-y-1">
                <li>• {t('audit.open_boundary_loops')}: <b className="text-white font-mono">{defects.open_boundary_loops}</b></li>
                <li>• {t('audit.non_manifold_edges')}: <b className="text-white font-mono">{defects.non_manifold_edges}</b></li>
                <li>• {t('audit.degenerate_faces')}: <b className="text-white font-mono">{defects.degenerate_faces}</b></li>
                <li>• {t('audit.duplicate_faces')}: <b className="text-white font-mono">{defects.duplicate_faces}</b></li>
              </ul>
            </div>

            {report?.defects_fixed && (
              <div className="bg-dark-panel p-4 rounded-xl border border-emerald-500/20 flex flex-col gap-2">
                <span className="text-xs font-semibold text-emerald-400">{t('audit.defects_fixed')}</span>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• {t('audit.vertices_welded')}: <b className="text-emerald-300 font-mono">{report.defects_fixed.vertices_welded || 0}</b></li>
                  <li>• {t('audit.holes_filled')}: <b className="text-emerald-300 font-mono">{report.defects_fixed.holes_filled || 0}</b></li>
                  <li>• {t('audit.non_manifold_fixed')}: <b className="text-emerald-300 font-mono">{report.defects_fixed.non_manifold_fixed || 0}</b></li>
                  <li>• {t('audit.duplicate_removed')}: <b className="text-emerald-300 font-mono">{report.defects_fixed.duplicate_faces_removed || 0}</b></li>
                  <li>• {t('audit.max_deviation')}: <b className="text-emerald-300 font-mono">{report.max_surface_deviation_mm} mm</b></li>
                </ul>
              </div>
            )}
          </div>

          {/* Slicer Readiness Checklist */}
          {((report?.slicer_readiness) || (inspectData?.slicer_readiness)) && (
            <div className="bg-dark-panel p-4 rounded-xl border border-dark-border flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    {t('audit.slicer_checklist_title')}
                  </span>
                </div>
                {((report?.slicer_readiness?.is_print_ready) ?? (inspectData?.slicer_readiness?.is_print_ready)) ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                    {t('audit.print_ready_badge')}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">
                    {t('audit.print_support_needed')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-dark-surface/60 border border-dark-border/40">
                  <span className="text-[10px] text-slate-400 block">{t('audit.overhang_faces')}</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {(report?.slicer_readiness?.overhang_faces_count ?? inspectData?.slicer_readiness?.overhang_faces_count ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-dark-surface/60 border border-dark-border/40">
                  <span className="text-[10px] text-slate-400 block">{t('audit.overhang_area')}</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {(report?.slicer_readiness?.overhang_area_mm2 ?? inspectData?.slicer_readiness?.overhang_area_mm2 ?? 0).toFixed(1)} mm²
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-dark-surface/60 border border-dark-border/40">
                  <span className="text-[10px] text-slate-400 block">{t('audit.est_support_vol')}</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {(report?.slicer_readiness?.estimated_support_volume_cm3 ?? inspectData?.slicer_readiness?.estimated_support_volume_cm3 ?? 0).toFixed(2)} cm³
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-dark-surface/60 border border-dark-border/40">
                  <span className="text-[10px] text-slate-400 block">{t('audit.bed_contact')}</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {(report?.slicer_readiness?.bed_contact_area_mm2 ?? inspectData?.slicer_readiness?.bed_contact_area_mm2 ?? 0).toFixed(1)} mm²
                  </span>
                </div>
              </div>

              {((report?.slicer_readiness?.warnings?.length ?? inspectData?.slicer_readiness?.warnings?.length ?? 0) > 0) && (
                <div className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                  {(report?.slicer_readiness?.warnings ?? inspectData?.slicer_readiness?.warnings ?? []).map((w, idx) => (
                    <p key={idx}>⚠️ {w}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all"
          >
            {t('audit.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
