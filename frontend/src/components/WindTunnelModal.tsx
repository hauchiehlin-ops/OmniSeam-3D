import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Wind, 
  Box, 
  Settings2, 
  Download, 
  Eye, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Layers
} from 'lucide-react';
import { apiClient } from '../api/client';
import { FluidDomainResponse, TargetFormat } from '../types';

interface WindTunnelModalProps {
  isOpen: boolean;
  file?: File | null;
  selectedFileName?: string;
  onClose: () => void;
  onLoadPreviewUrl?: (url: string) => void;
}

export const WindTunnelModal: React.FC<WindTunnelModalProps> = ({
  isOpen,
  file,
  selectedFileName = '',
  onClose,
  onLoadPreviewUrl,
}) => {
  const { t } = useTranslation();

  const [inletFactor, setInletFactor] = useState<number>(2.0);
  const [outletFactor, setOutletFactor] = useState<number>(5.0);
  const [marginFactor, setMarginFactor] = useState<number>(2.0);
  const [booleanMode, setBooleanMode] = useState<'auto' | 'manifold_mesh' | 'solid_cad'>('auto');
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('step');


  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<FluidDomainResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExtract = async () => {
    if (!file) {
      setErrorMsg(t('wind_tunnel.no_file_error', 'No 3D model selected.'));
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await apiClient.extractFluidDomain(file, {
        inlet_factor: inletFactor,
        outlet_factor: outletFactor,
        margin_factor: marginFactor,
        boolean_mode: booleanMode,
        target_format: targetFormat,
      });
      setResult(res);
    } catch (err: any) {
      console.error('Fluid domain extraction error:', err);
      setErrorMsg(
        err?.response?.data?.detail || 
        err?.message || 
        t('wind_tunnel.failed', 'Failed to extract fluid domain.')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreview = () => {
    if (result?.preview_url && onLoadPreviewUrl) {
      onLoadPreviewUrl(result.preview_url);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-dark-surface border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-cyan-500/15 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-dark-panel/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-sm">
              <Wind className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{t('wind_tunnel.title', '風洞流體域抽取 (Wind Tunnel)')}</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded">
                  CFD B-Rep
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">
                {selectedFileName || file?.name || t('wind_tunnel.subtitle', 'Aerodynamic Fluid Domain Boolean Extraction')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-dark-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Description banner */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-slate-300 leading-relaxed space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>{t('wind_tunnel.desc_title', '端到端 CFD 空氣流道抽取')}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {t(
                'wind_tunnel.desc_body',
                '直接在應用程式內以 OpenCASCADE / 高階水密布林引擎，自長方體風洞中減去實體模型，生成水密流場域與流道，無須透過外部 CAD 軟體。'
              )}
            </p>
          </div>

          {/* Wind Tunnel Bounds Parameters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('wind_tunnel.bounds_settings', '風洞邊界與擴展係數')}</span>
              </h4>
              <span className="text-[10px] text-slate-400">
                {t('wind_tunnel.multiplier_hint', '以模型長寬高為基準倍數')}
              </span>
            </div>

            {/* Inlet Multiplier */}
            <div className="space-y-1.5 bg-dark-bg/60 p-3 rounded-xl border border-dark-border">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-medium">
                  {t('wind_tunnel.inlet_label', '上游入口長度 (Upstream Inlet)')}
                </span>
                <span className="text-cyan-400 font-bold">{inletFactor.toFixed(1)}x Length</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={inletFactor}
                onChange={(e) => setInletFactor(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.5x (緊密)</span>
                <span>2.0x (標準)</span>
                <span>10.0x (充裕)</span>
              </div>
            </div>

            {/* Outlet Multiplier */}
            <div className="space-y-1.5 bg-dark-bg/60 p-3 rounded-xl border border-dark-border">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-medium">
                  {t('wind_tunnel.outlet_label', '下游尾流長度 (Downstream Outlet / Wake)')}
                </span>
                <span className="text-cyan-400 font-bold">{outletFactor.toFixed(1)}x Length</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="20.0"
                step="0.5"
                value={outletFactor}
                onChange={(e) => setOutletFactor(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1.0x</span>
                <span>5.0x (標準尾流)</span>
                <span>20.0x</span>
              </div>
            </div>

            {/* Margin Multiplier */}
            <div className="space-y-1.5 bg-dark-bg/60 p-3 rounded-xl border border-dark-border">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-medium">
                  {t('wind_tunnel.margin_label', '側壁與頂底間隙 (Side & Wall Margin)')}
                </span>
                <span className="text-cyan-400 font-bold">{marginFactor.toFixed(1)}x Margin</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6.0"
                step="0.5"
                value={marginFactor}
                onChange={(e) => setMarginFactor(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.5x</span>
                <span>2.0x (標準無干擾)</span>
                <span>6.0x</span>
              </div>
            </div>
          </div>

          {/* Engine & Format Options */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                {t('wind_tunnel.boolean_mode', '布林相減引擎')}
              </label>
              <select
                value={booleanMode}
                onChange={(e: any) => setBooleanMode(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="auto">{t('wind_tunnel.mode_auto', '自動調優 (Auto Adaptive)')}</option>
                <option value="manifold_mesh">{t('wind_tunnel.mode_manifold', '高階水密網格布林 (推薦複雜葉片)')}</option>
                <option value="solid_cad">{t('wind_tunnel.mode_cad', 'CAD 實體布林 (OpenCASCADE)')}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                {t('wind_tunnel.export_format', '匯出流體域格式')}
              </label>
              <select
                value={targetFormat}
                onChange={(e: any) => setTargetFormat(e.target.value as TargetFormat)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="step">STEP (.step - Manifold Solid)</option>
                <option value="stl">STL (.stl - CFD Surface)</option>
                <option value="glb">GLB (.glb - 3D Visual)</option>
                <option value="obj">OBJ (.obj)</option>
              </select>

            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Result Card */}
          {result && (
            <div className="p-4 bg-cyan-950/40 border border-cyan-500/40 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>{t('wind_tunnel.success_title', '流體域抽取成功！')}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {result.filename}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-dark-bg/60 p-2.5 rounded-lg border border-cyan-500/20">
                <div>
                  <span className="text-slate-400">{t('wind_tunnel.fluid_faces', '流體域面數')}:</span>{' '}
                  <span className="font-semibold text-slate-200">
                    {result.fluid_domain_metrics.faces_count.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">{t('wind_tunnel.watertight', '水密性')}:</span>{' '}
                  <span className="font-semibold text-emerald-400">
                    {result.fluid_domain_metrics.is_watertight ? '100% Watertight' : 'Valid Shell'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">{t('wind_tunnel.domain_size', '風洞尺寸 (X×Y×Z)')}:</span>{' '}
                  <span className="font-mono text-cyan-300">
                    {result.wind_tunnel_bounds.size.map((s) => s.toFixed(1)).join(' × ')} mm
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={result.download_url}
                  download={result.filename}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('wind_tunnel.download_btn', '下載流體域檔案')}</span>
                </a>

                {result.preview_url && onLoadPreviewUrl && (
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-dark-bg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 text-xs font-semibold transition-all active:scale-95"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{t('wind_tunnel.preview_btn', '在視圖中預覽')}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-dark-border bg-dark-panel/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-dark-hover transition-colors"
          >
            {t('common.close', '關閉')}
          </button>

          <button
            type="button"
            onClick={handleExtract}
            disabled={isProcessing}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
              isProcessing
                ? 'bg-cyan-600/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('wind_tunnel.extracting', '正在抽取流體域...')}</span>
              </>
            ) : (
              <>
                <Wind className="w-4 h-4" />
                <span>{t('wind_tunnel.start_extract', '開始風洞布林抽取')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
