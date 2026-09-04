import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BookOpen, 
  X, 
  Sparkles, 
  MousePointer, 
  Cpu, 
  Terminal, 
  Printer, 
  Flame, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink,
  Layers,
  HelpCircle
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBackendSettings?: () => void;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  onOpenBackendSettings
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'quickstart' | 'viewport' | 'engine' | 'commands' | 'slicer'>('quickstart');
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const dockerCmd = `docker run -d --name omniseam-backend -p 8000:8000 --memory="16g" hauchiehlin/omniseam-3d-backend:latest`;

  const handleCopy = () => {
    navigator.clipboard.writeText(dockerCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-surface border border-dark-border rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-dark-border flex items-center justify-between bg-dark-surface/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>{t('manual.title')}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/40">
                  v1.4 Guide
                </span>
              </h2>
              <p className="text-xs text-slate-400">{t('manual.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-dark-panel border border-dark-border text-slate-400 hover:text-white hover:border-slate-500 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-dark-border bg-dark-panel/60 px-4 sm:px-6 overflow-x-auto gap-2 py-2">
          <button
            onClick={() => setActiveTab('quickstart')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'quickstart'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-hover'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('manual.tab_quickstart')}</span>
          </button>

          <button
            onClick={() => setActiveTab('viewport')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'viewport'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-hover'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>{t('manual.tab_viewport')}</span>
          </button>

          <button
            onClick={() => setActiveTab('engine')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'engine'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-hover'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{t('manual.tab_engine')}</span>
          </button>

          <button
            onClick={() => setActiveTab('slicer')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'slicer'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-hover'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('manual.tab_slicer')}</span>
          </button>

          <button
            onClick={() => setActiveTab('commands')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'commands'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-hover'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{t('manual.tab_commands')}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          {/* TAB 1: QUICKSTART */}
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-200">
                <h3 className="font-bold text-sm sm:text-base text-white mb-1 flex items-center gap-2">
                  <span>⚡ 3 步驟零基礎極速上手指南</span>
                </h3>
                <p className="text-xs text-brand-300/90 leading-relaxed">
                  OmniSeam 3D 內建智慧格式探測與自動破面縫合引擎，無論您是 3D 列印創客、機械工程師還是遊戲美術，均可在 10 秒內完成轉換。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-600/30 text-brand-300 font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <h4 className="font-bold text-slate-100 text-sm">{t('manual.step1_title')}</h4>
                  <p className="text-xs text-slate-400">
                    {t('manual.step1_desc')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <h4 className="font-bold text-slate-100 text-sm">{t('manual.step2_title')}</h4>
                  <p className="text-xs text-slate-400">
                    {t('manual.step2_desc')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <h4 className="font-bold text-slate-100 text-sm">{t('manual.step3_title')}</h4>
                  <p className="text-xs text-slate-400">
                    {t('manual.step3_desc')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-2">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">{t('manual.presets_guide_title')}</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-brand-400 font-bold shrink-0">🖨️ 3D 列印 / 製造：</span>
                    <span className="text-slate-300">強制啟用全自動補洞、縫合與法向量統一，保證輸出 100% 水密封閉實體 (Watertight Solid)。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold shrink-0">🎮 遊戲 / 渲染動畫：</span>
                    <span className="text-slate-300">統一表面光影法線，但保留原本刻意設計的空心管路與開口造型，不強行閉合。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold shrink-0">🔍 原始幾何轉存：</span>
                    <span className="text-slate-300">100% 原樣保留頂點與三角面片，純粹進行檔案副檔名格式轉換。</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VIEWPORT & TOOLS */}
          {activeTab === 'viewport' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-brand-400" />
                  <span>3D 視圖滑鼠與手勢操控秘訣</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="font-bold text-brand-300 block mb-1">🖱️ 滑鼠左鍵 (拖曳)</span>
                    <span className="text-slate-400">360 度自由旋轉 3D 空間視角 (Orbit Rotate)。</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="font-bold text-indigo-300 block mb-1">🖱️ 滑鼠右鍵 / 兩指</span>
                    <span className="text-slate-400">水平與垂直平移視角中心點 (Pan Move)。</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="font-bold text-amber-300 block mb-1">⚙️ 滾輪滑動 / 捏合</span>
                    <span className="text-slate-400">放大與縮小模型 (Zoom in / out)。</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-400" />
                  <span>5 大顯示模式與專業量測工具</span>
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li>• <b className="text-white">實體渲染 (Shaded PBR)</b>：標準金屬/粗糙度物理光照渲染，直觀觀察表面質感。</li>
                  <li>• <b className="text-white">線框模式 (Wireframe)</b>：即時檢查網格拓撲密度、三角形分佈與布線整齊度。</li>
                  <li>• <b className="text-white">法向量 (Normals)</b>：以 RGB 顏色映射面片法線方向，快速排查暗面翻轉。</li>
                  <li>• <b className="text-white">X 光半透明 (X-Ray)</b>：透視內部結構，精準檢查模型內部是否有隱藏腔體或自相交面。</li>
                  <li>• <b className="text-amber-400">🔥 幾何偏差熱力圖 (Heatmap)</b>：以綠（0.00mm）- 黃（0.025mm）- 紅（&ge;0.05mm）即時顯示修復造成的微米級形變量。</li>
                  <li>• <b className="text-cyan-400">📏 3D 距離量測尺</b>：在 3D 模型表面任點兩點，即時計算毫米級空間歐幾里得直線距離。</li>
                  <li>• <b className="text-amber-300">✂️ 即時剖面分析 (Section Plane)</b>：拉動滑桿即時切開實體，透視內部壁厚與實心填充狀態。</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: ENGINE ARCHITECTURE */}
          {activeTab === 'engine' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-brand-400" />
                  <span>雙核心架構：純前端模式 vs 雲端算力節點</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  OmniSeam 3D 採用創新的「混合分流 (Hybrid Offloading)」架構，依檔案格式自動配置最優算力：
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      ⚡ 純前端離線模式 (Pure Client)
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>• 100% 於本機瀏覽器內運算 (WebAssembly)</li>
                      <li>• 檔案永不離開電腦，最高資料隱私</li>
                      <li>• 支援 STL, OBJ, 3MF, STEP, PLY, OFF, DXF 等通用格式</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      ☁️ 雲端/私有算力節點 (Dedicated Node)
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>• 內建 FreeCAD / OpenCASCADE 工業幾何內核</li>
                      <li>• 專門處理 SolidWorks, Inventor, IFC 原廠封閉 CAD</li>
                      <li>• 可一鍵 Duplicate 至個人 Hugging Face 或本地 Docker</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenBackendSettings?.();
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all"
                  >
                    <span>⚙️ 前往專屬轉譯節點設定</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SLICER & PRINT */}
          {activeTab === 'slicer' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>3D 列印水密封閉與切片機準備度 (Slicer Readiness)</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  為什麼一般 STL 匯入 Cura / PrusaSlicer / Bambu Studio 會報錯「Non-manifold edges」或「Model is not watertight」？
                </p>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <b className="text-white block mb-1">💧 何謂 100% 水密 (Watertight Solid)？</b>
                    <span>每個三角面邊線必須「恰好被 2 個三角形共用」。若只有 1 個面共用即為「開口破洞」；大於 2 個面共用即為「非流形畸變」，會導致切片軟體無法判斷內外壁而切出實心或空洞錯誤。</span>
                  </div>

                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <b className="text-amber-400 block mb-1">📐 懸垂面片 (&gt;45°) 與支撐體積預估</b>
                    <span>FDM 3D 列印在沒有支撐的情況下，超過 45 度之懸空結構會因重力塌陷。OmniSeam 3D 會在體檢報告中精確標示懸垂面積（mm²）並估算所需支撐材料耗量（cm³）。</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COMMANDS & SELF-HOST */}
          {activeTab === 'commands' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-brand-400" />
                  <span>企業私有化部署指令 (Self-Hosted Docker)</span>
                </h3>
                <p className="text-xs text-slate-300">
                  若您為企業內網或嚴格機密環境，可於本機伺服器一鍵啟動後端轉譯容器：
                </p>

                <div className="relative p-3 rounded-xl bg-black/70 border border-dark-border/80 font-mono text-xs text-emerald-400 overflow-x-auto">
                  <code>{dockerCmd}</code>
                  <button
                    onClick={handleCopy}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-dark-surface hover:bg-dark-hover text-slate-300 hover:text-white border border-dark-border transition-all"
                    title="Copy Docker Command"
                  >
                    {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  啟動後，於 OmniSeam 3D 頂部節點設定輸入 <code className="text-brand-300 font-mono">http://localhost:8000</code> 即可享有本地全速 CAD 幾何轉譯。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border flex justify-end bg-dark-surface/95">
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
