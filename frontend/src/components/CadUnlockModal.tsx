import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Lock, 
  Sparkles, 
  Cloud, 
  FileCode, 
  CheckCircle, 
  ArrowRight,
  X
} from 'lucide-react';
import { apiClient, OFFICIAL_PUBLIC_BACKEND_URL } from '../api/client';

interface CadUnlockModalProps {
  isOpen: boolean;
  fileName?: string;
  onClose: () => void;
  onOpenBackendSettings: () => void;
}

export const CadUnlockModal: React.FC<CadUnlockModalProps> = ({
  isOpen,
  fileName = '',
  onClose,
  onOpenBackendSettings,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const ext = fileName.split('.').pop()?.toUpperCase() || 'CAD';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-dark-surface border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Glow decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-indigo-500/20 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-dark-panel/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{t('cad_unlock.title', '原生 CAD 格式專用解鎖')}</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded">
                  .{ext}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {fileName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-dark-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-300 leading-relaxed space-y-2">
            <p>
              {t('cad_unlock.desc_1', '您目前上傳的是專有原廠 CAD 格式 (如 SolidWorks / Inventor / IFC)。此類封閉格式無法單靠瀏覽器純 JavaScript 進行精確 B-Rep 幾何拓撲縫合與曲面離散化。')}
            </p>
            <p className="text-slate-400">
              {t('cad_unlock.desc_2', '您可以自由選擇以下兩種方式進行處理：')}
            </p>
          </div>

          <div className="space-y-3">
            {/* Option 0: 1-Click Official Public Node (Instant) */}
            <div 
              onClick={() => {
                apiClient.setBackendUrl(OFFICIAL_PUBLIC_BACKEND_URL);
                apiClient.setEngineMode('server');
                onClose();
              }}
              className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 hover:border-emerald-400 cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{t('cad_unlock.opt0_title', '⚡ 一鍵使用官方雲端節點 (免設定 · 即開即用)')}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">免帳號 · 推薦</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {t('cad_unlock.opt0_desc', '直接連線官方公共轉譯節點，自動啟用 FreeCAD/OpenCASCADE 引擎解鎖此模型轉譯。')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
              </div>
            </div>

            {/* Option 1: Hugging Face 1-Click Free Space */}
            <div 
              onClick={() => {
                onClose();
                onOpenBackendSettings();
              }}
              className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 to-dark-panel border border-indigo-500/40 hover:border-indigo-400 cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 mt-0.5">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{t('cad_unlock.opt1_title', '建立個人專屬 16GB 私有節點 (企業/高隱私需求)')}</span>
                      <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20 font-mono">16GB RAM · 免費</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {t('cad_unlock.opt1_desc', '在 Hugging Face Spaces 建立您的專屬獨立算力空間，完全隔離保護商業機密。')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
              </div>
            </div>

            {/* Option 2: Convert to STEP/STL for Pure Client */}
            <div className="p-3 bg-dark-panel border border-dark-border rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-200 font-bold">
                <FileCode className="w-3.5 h-3.5 text-brand-400" />
                <span>{t('cad_unlock.opt2_title', '或將模型匯出為 STEP / STL / OBJ')}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t('cad_unlock.opt2_desc', '通用標準格式 (STEP, STL, OBJ, 3MF) 支援 100% 純前端瀏覽器離線轉譯，無需連接任何伺服器。')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-border bg-dark-panel/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            {t('cad_unlock.cancel', '我知道了')}
          </button>

          <button
            onClick={() => {
              apiClient.setBackendUrl(OFFICIAL_PUBLIC_BACKEND_URL);
              apiClient.setEngineMode('server');
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('cad_unlock.go_public', '⚡ 一鍵使用官方節點轉譯')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
