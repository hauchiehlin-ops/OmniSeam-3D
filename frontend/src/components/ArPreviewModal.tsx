import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { 
  Smartphone, 
  X, 
  Sparkles, 
  Compass,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Wifi
} from 'lucide-react';
import { ArManager } from '../engine/ar-manager';
import { apiClient } from '../api/client';

interface ArPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelName?: string;
  currentModelMesh?: THREE.Object3D | null;
  modelFile?: File | null;
  previewUrl?: string | null;
  activeTaskId?: string | null;
  onLaunchDirectAr?: () => void;
  isMobileDevice?: boolean;
}

export const ArPreviewModal: React.FC<ArPreviewModalProps> = ({
  isOpen,
  onClose,
  modelName,
  currentModelMesh,
  modelFile,
  previewUrl,
  activeTaskId,
  onLaunchDirectAr,
  isMobileDevice = false,
}) => {
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Localhost helper state
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const [lanHost, setLanHost] = useState<string>(() => {
    return localStorage.getItem('omniseam_lan_host') || '';
  });
  const [tempLanInput, setTempLanInput] = useState<string>('');

  // Generate AR Session on modal open
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initSession = async () => {
      setIsGenerating(true);
      setError(null);

      try {
        let res;
        if (activeTaskId) {
          res = await apiClient.createArSession({
            taskId: activeTaskId,
            filename: modelName,
          });
        } else if (currentModelMesh) {
          // Export the current rendered Three.js mesh directly to GLB
          const glbBlob = await ArManager.exportGlb(currentModelMesh);
          res = await apiClient.createArSession({
            file: glbBlob,
            filename: modelName ? `${modelName.replace(/\.[^/.]+$/, '')}.glb` : 'model.glb',
          });
        } else if (modelFile) {
          res = await apiClient.createArSession({
            file: modelFile,
            filename: modelName || modelFile.name,
          });
        }

        if (res?.session_id) {
          setSessionId(res.session_id);
        }
      } catch (err: any) {
        console.warn("Failed to create cloud AR session:", err);
        setError(t('ar.session_error'));
      } finally {
        setIsGenerating(false);
      }
    };

    initSession();
  }, [isOpen, activeTaskId, currentModelMesh, modelFile, modelName, t]);

  if (!isOpen) return null;

  // Compute final target URL for mobile phone
  let targetUrl = window.location.href;
  if (sessionId) {
    const origin = lanHost.trim()
      ? (lanHost.startsWith('http') ? lanHost.trim() : `http://${lanHost.trim()}`)
      : window.location.origin;
    targetUrl = `${origin}${window.location.pathname}?ar_session=${sessionId}`;
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(targetUrl)}&color=6366f1&bgcolor=0e131f`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveLanHost = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempLanInput.trim()) {
      setLanHost(tempLanInput.trim());
      localStorage.setItem('omniseam_lan_host', tempLanInput.trim());
      setTempLanInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-surface border border-dark-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-dark-border flex items-center justify-between bg-dark-surface/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{t('ar.modal_title')}</span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">
                {modelName || '3D Model'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-dark-panel border border-dark-border text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex flex-col items-center gap-5 text-center text-slate-300">
          {isMobileDevice ? (
            <div className="space-y-4 w-full">
              <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-left space-y-2">
                <span className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>{t('ar.mobile_detected_title')}</span>
                </span>
                <p className="text-xs text-slate-300">
                  {t('ar.mobile_detected_desc')}
                </p>
              </div>

              <button
                onClick={onLaunchDirectAr}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white text-sm font-bold shadow-xl shadow-brand-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('ar.launch_now_btn')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col items-center w-full">
              {/* QR Code Container or Loading */}
              {isGenerating ? (
                <div className="w-52 h-52 rounded-2xl bg-[#0e131f] border-2 border-brand-500/40 flex flex-col items-center justify-center gap-3 shadow-2xl">
                  <RefreshCw className="w-8 h-8 text-brand-400 animate-spin" />
                  <span className="text-xs text-slate-300">{t('ar.generating_session')}</span>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-[#0e131f] border-2 border-brand-500/40 shadow-2xl relative group">
                  <img
                    src={qrCodeUrl}
                    alt="Scan for Mobile AR View"
                    className="w-48 h-48 rounded-xl object-contain"
                  />
                  <div className="absolute inset-0 bg-dark-bg/85 backdrop-blur-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3 gap-2">
                    <span className="text-xs text-brand-300 font-semibold">{t('ar.qr_hover_hint')}</span>
                    <button
                      onClick={handleCopyLink}
                      className="py-1 px-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? t('ar.copied') : t('ar.copy_link')}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-100">{t('ar.scan_qr_heading')}</h4>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  {t('ar.scan_qr_instruction')}
                </p>
              </div>

              {/* Localhost LAN IP helper */}
              {isLocalhost && (
                <div className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{t('ar.localhost_hint_title', '本機連線提示 (Localhost)')}</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    {t('ar.localhost_hint_desc', '手機無法直接讀取電腦的 localhost。請輸入電腦在區網中的 IP（例如 192.168.1.100:5173）更新 QR 碼：')}
                  </p>
                  <form onSubmit={handleSaveLanHost} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={lanHost || "192.168.1.xxx:5173"}
                      value={tempLanInput}
                      onChange={(e) => setTempLanInput(e.target.value)}
                      className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      {t('ar.update_qr')}
                    </button>
                  </form>
                  {lanHost && (
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-amber-500/20">
                      <span>{t('ar.current_target', '目前目標：')}{lanHost}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLanHost('');
                          localStorage.removeItem('omniseam_lan_host');
                        }}
                        className="text-amber-400 hover:underline"
                      >
                        {t('ar.reset_default', '重設為預設')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Native AR Platform Badges */}
              <div className="grid grid-cols-2 gap-2 w-full text-[11px] text-left pt-1">
                <div className="p-2.5 rounded-xl bg-dark-panel border border-dark-border flex items-center gap-2">
                  <span className="text-base">🍎</span>
                  <div>
                    <b className="text-slate-200 block">iOS Quick Look</b>
                    <span className="text-slate-400 text-[10px]">{t('ar.ios_desc')}</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-dark-panel border border-dark-border flex items-center gap-2">
                  <span className="text-base">🤖</span>
                  <div>
                    <b className="text-slate-200 block">Android Scene Viewer</b>
                    <span className="text-slate-400 text-[10px]">{t('ar.android_desc')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border flex items-center justify-between bg-dark-surface/95">
          <button
            onClick={handleCopyLink}
            disabled={!sessionId && !previewUrl}
            className="px-3.5 py-2 rounded-xl bg-dark-panel hover:bg-dark-hover border border-dark-border text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t('ar.copied') : t('ar.copy_link')}</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-dark-panel hover:bg-dark-hover border border-dark-border text-slate-300 hover:text-white text-xs font-semibold transition-all"
          >
            {t('audit.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
