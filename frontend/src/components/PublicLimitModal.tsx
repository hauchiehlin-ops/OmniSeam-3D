import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Sparkles, ExternalLink, Settings, X } from 'lucide-react';
import { OFFICIAL_DUPLICATE_URL, PUBLIC_DEMO_MAX_SIZE_MB } from '../api/client';

interface PublicLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileSizeMb?: number;
  fileName?: string;
  onOpenSettings: () => void;
}

export const PublicLimitModal: React.FC<PublicLimitModalProps> = ({
  isOpen,
  onClose,
  fileSizeMb = 0,
  fileName = '',
  onOpenSettings,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-dark-surface border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-gradient-to-r from-amber-500/10 via-dark-panel to-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{t('public_limit.title', '檔案超過公共展示節點上限')}</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
                  限 {PUBLIC_DEMO_MAX_SIZE_MB}MB
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {fileName ? `「${fileName}」 (${fileSizeMb.toFixed(1)} MB)` : '檢測到大型 CAD / 網格檔案'}
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
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-slate-300 leading-relaxed space-y-1">
            <p className="text-amber-200 font-semibold">
              ⚡ 官方公共展示節點僅供輕量嘗鮮（單檔限制 {PUBLIC_DEMO_MAX_SIZE_MB}MB，避免多人共用記憶體耗盡）。
            </p>
            <p className="text-slate-300 text-[11px]">
              您上傳的檔案為 <strong className="text-white">{fileSizeMb.toFixed(1)} MB</strong>。若需轉換此大型專案，建議立即建立【個人專屬 16GB 私有節點】！
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="p-4 rounded-xl bg-dark-panel border border-indigo-500/30 space-y-2.5">
            <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>建立個人專屬節點享有（100% 免費）：</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1.5 pl-1">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong className="text-white">支援 500MB 大檔</strong>：輕鬆處理超複雜大型 CAD 裝配體</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong className="text-white">100% 獨享 16GB RAM</strong>：不卡頓、零排隊極速轉譯</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong className="text-white">絕對隱私獨立</strong>：資料僅存放在您的私人 Space 中</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2.5">
            <a
              href={OFFICIAL_DUPLICATE_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all group"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('public_limit.duplicate_btn', '🚀 一鍵 Duplicate 複製個人專屬 16GB 節點 (10秒完成)')}</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-dark-panel hover:bg-dark-hover border border-dark-border rounded-xl transition-all"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('public_limit.settings_btn', '前往節點設定 / 填寫專屬網址')}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {t('public_limit.close', '關閉')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
