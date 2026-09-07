import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { 
  Compass, 
  Smartphone, 
  Sparkles, 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle,
  Eye,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { Viewer3D } from './Viewer3D';
import { ArManager } from '../engine/ar-manager';
import { apiClient } from '../api/client';
import { ArSessionResponse } from '../types';

interface MobileArViewProps {
  sessionId?: string | null;
  taskId?: string | null;
  onExit: () => void;
}

export const MobileArView: React.FC<MobileArViewProps> = ({
  sessionId,
  taskId,
  onExit,
}) => {
  const { t } = useTranslation();
  const [session, setSession] = useState<ArSessionResponse | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelTitle, setModelTitle] = useState<string>('3D Model');
  const [loadedMesh, setLoadedMesh] = useState<THREE.Object3D | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [isLaunchingAr, setIsLaunchingAr] = useState<boolean>(false);

  useEffect(() => {
    setPlatform(ArManager.getArPlatform());
  }, []);

  // Fetch session or task details
  useEffect(() => {
    const fetchSessionData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (sessionId) {
          const res = await apiClient.getArSession(sessionId);
          setSession(res);
          setModelTitle(res.filename);
          setModelUrl(res.glb_url);
        } else if (taskId) {
          const task = await apiClient.getTaskStatus(taskId);
          setModelTitle(task.filename);
          const url = task.preview_url || apiClient.getPreviewUrl(taskId);
          setModelUrl(url);
        } else {
          setError(t('ar.invalid_session_error', '未提供有效的 AR 會話或模型代碼'));
        }
      } catch (err: any) {
        console.error("Failed to load AR session:", err);
        setError(t('ar.session_error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId, taskId, t]);

  const handleLaunchIos = async () => {
    if (!loadedMesh) return;
    setIsLaunchingAr(true);
    try {
      await ArManager.launchIosAr(loadedMesh);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLaunchingAr(false);
    }
  };

  const handleLaunchAndroid = () => {
    if (!modelUrl) return;
    ArManager.launchAndroidAr(modelUrl, modelTitle);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0e131f] flex flex-col text-slate-100 overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <header className="h-16 px-4 border-b border-dark-border bg-dark-surface/95 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-dark-panel border border-dark-border text-xs font-semibold text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-brand-400" />
          <span>{t('ar.back_to_app')}</span>
        </button>

        <div className="flex items-center gap-2 max-w-[200px] truncate">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Compass className="w-4 h-4" />
          </div>
          <div className="text-left truncate">
            <p className="text-xs font-bold text-white truncate">{modelTitle}</p>
            <p className="text-[10px] text-brand-400 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3 h-3" />
              <span>AR Ready (1:1)</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: modelTitle,
                url: window.location.href,
              }).catch(() => {});
            }
          }}
          className="p-2 rounded-xl bg-dark-panel border border-dark-border text-slate-400 hover:text-white"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </header>

      {/* 3D Model Interactive Viewport */}
      <main className="relative flex-1 w-full h-full bg-[#0a0d14]">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl">
              <AlertCircle className="w-8 h-8" />
            </div>
            <p className="text-sm text-slate-300 max-w-sm">{error}</p>
            <button
              onClick={onExit}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all"
            >
              {t('ar.back_to_app')}
            </button>
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-brand-400 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">{t('ar.loading_model')}</p>
          </div>
        ) : (
          <div className="w-full h-full">
            <Viewer3D
              modelUrl={modelUrl}
              onModelLoaded={(mesh) => setLoadedMesh(mesh)}
              displayMode="shaded"
              highlightColor={0x6366f1}
              title={modelTitle}
            />

            {/* Gesture Hint Overlay */}
            <div className="absolute top-4 left-4 pointer-events-none px-3 py-1.5 rounded-xl bg-dark-panel/80 backdrop-blur-md border border-dark-border text-[11px] text-slate-300 flex items-center gap-2 shadow-lg">
              <Eye className="w-3.5 h-3.5 text-brand-400" />
              <span>{t('ar.gesture_hint', '單指旋轉 · 雙指縮放檢視')}</span>
            </div>
          </div>
        )}
      </main>

      {/* Bottom AR Actions Floating Panel */}
      <footer className="p-4 bg-dark-surface/95 backdrop-blur-md border-t border-dark-border space-y-3 z-10 shrink-0">
        <div className="flex flex-col gap-2">
          {/* iOS Quick Look Button */}
          {(platform === 'ios' || platform === 'desktop') && (
            <button
              onClick={handleLaunchIos}
              disabled={!loadedMesh || isLaunchingAr}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:opacity-95 disabled:opacity-50 text-white text-sm font-bold shadow-xl shadow-brand-500/25 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLaunchingAr ? t('ar.preparing_ar', '正在準備 AR 實境...') : t('ar.launch_ios')}</span>
            </button>
          )}

          {/* Android Scene Viewer Button */}
          {(platform === 'android' || platform === 'desktop') && (
            <button
              onClick={handleLaunchAndroid}
              disabled={!modelUrl}
              className="w-full py-3 px-4 rounded-2xl bg-dark-panel hover:bg-dark-hover border border-brand-500/30 text-brand-300 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Smartphone className="w-4 h-4" />
              <span>{t('ar.launch_android')}</span>
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          {t('ar.ar_instructions')}
        </p>
      </footer>
    </div>
  );
};
