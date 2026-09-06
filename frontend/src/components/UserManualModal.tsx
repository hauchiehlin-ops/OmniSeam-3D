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
  HelpCircle,
  Target,
  Wrench,
  Compass,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

export type ManualTab = 'quickstart' | 'qa' | 'fidelity' | 'viewport' | 'engine' | 'slicer' | 'commands';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBackendSettings?: () => void;
}

const CHAPTERS: { id: ManualTab; labelKey: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'quickstart', labelKey: 'manual.tab_quickstart', icon: Sparkles },
  { id: 'qa', labelKey: 'manual.tab_qa', icon: HelpCircle },
  { id: 'fidelity', labelKey: 'manual.tab_fidelity', icon: ShieldCheck },
  { id: 'viewport', labelKey: 'manual.tab_viewport', icon: MousePointer },
  { id: 'engine', labelKey: 'manual.tab_engine', icon: Cpu },
  { id: 'slicer', labelKey: 'manual.tab_slicer', icon: Printer },
  { id: 'commands', labelKey: 'manual.tab_commands', icon: Terminal },
];

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  onOpenBackendSettings
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<ManualTab>('quickstart');
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const currentIndex = CHAPTERS.findIndex((chap) => chap.id === activeTab);
  const currentChapter = CHAPTERS[currentIndex] || CHAPTERS[0];
  const ActiveIcon = currentChapter.icon;

  const handlePrevTab = () => {
    if (currentIndex > 0) {
      setActiveTab(CHAPTERS[currentIndex - 1].id);
    }
  };

  const handleNextTab = () => {
    if (currentIndex < CHAPTERS.length - 1) {
      setActiveTab(CHAPTERS[currentIndex + 1].id);
    }
  };

  const dockerCmd = `docker run -d --name omniseam-backend -p 8000:8000 --memory="16g" hauchiehlin/omniseam-3d-backend:latest`;

  const handleCopy = () => {
    navigator.clipboard.writeText(dockerCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-surface border border-dark-border rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
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
                  {t('manual.badge')}
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

        {/* Chapter Navigation Bar - Dropdown Select Presentation */}
        <div className="border-b border-dark-border bg-dark-panel/75 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
              <ActiveIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 relative">
              <label htmlFor="manual-chapter-select" className="sr-only">
                {t('manual.select_chapter')}
              </label>
              <div className="relative">
                <select
                  id="manual-chapter-select"
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as ManualTab)}
                  className="w-full appearance-none bg-dark-surface hover:bg-dark-hover/80 text-slate-100 font-semibold text-xs sm:text-sm py-2 pl-3 pr-9 rounded-xl border border-dark-border focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer transition-all shadow-sm"
                >
                  {CHAPTERS.map((chap) => (
                    <option key={chap.id} value={chap.id} className="bg-dark-surface text-slate-100 py-1.5">
                      {t(chap.labelKey)}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Pagination Controls */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handlePrevTab}
              disabled={currentIndex <= 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-surface border border-dark-border text-slate-300 hover:text-white hover:bg-dark-hover disabled:opacity-30 disabled:pointer-events-none text-xs font-medium transition-all shadow-sm"
              title={t('manual.prev_chapter')}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('manual.prev_chapter')}</span>
            </button>
            <span className="text-xs font-mono font-bold text-brand-400/90 bg-dark-surface px-2.5 py-1 rounded-lg border border-dark-border">
              {currentIndex + 1} / {CHAPTERS.length}
            </span>
            <button
              type="button"
              onClick={handleNextTab}
              disabled={currentIndex >= CHAPTERS.length - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-surface border border-dark-border text-slate-300 hover:text-white hover:bg-dark-hover disabled:opacity-30 disabled:pointer-events-none text-xs font-medium transition-all shadow-sm"
              title={t('manual.next_chapter')}
            >
              <span className="hidden sm:inline">{t('manual.next_chapter')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          {/* TAB: Q&A (QUESTIONS & ANSWERS + TROUBLESHOOTING) */}
          {activeTab === 'qa' && (
            <div className="space-y-4">
              {/* Q&A Top Banner */}
              <div id="qa-top" className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1.5">
                <h3 className="font-bold text-sm sm:text-base text-amber-100 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{t('manual.qa_title')}</span>
                </h3>
                <p className="text-xs text-amber-300/90 leading-relaxed">
                  {t('manual.qa_desc')}
                </p>
              </div>

              {/* Interactive Table of Contents (TOC) - Dropdown Select Presentation */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-dark-panel border border-brand-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="w-7 h-7 rounded-xl bg-brand-500/20 text-brand-300 flex items-center justify-center font-bold shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-xs sm:text-sm flex items-center gap-2">
                      <span>{t('manual.qa_toc_title')}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">{t('manual.qa_toc_desc')}</p>
                  </div>
                </div>

                <div className="flex-1 max-w-full sm:max-w-md relative">
                  <label htmlFor="qa-case-select" className="sr-only">
                    {t('manual.qa_select_prompt')}
                  </label>
                  <div className="relative">
                    <select
                      id="qa-case-select"
                      defaultValue=""
                      onChange={(e) => {
                        const targetId = e.target.value;
                        if (targetId) {
                          const el = document.getElementById(targetId);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                          e.target.value = '';
                        }
                      }}
                      className="w-full appearance-none bg-dark-surface hover:bg-dark-hover/80 text-brand-300 font-semibold text-xs sm:text-sm py-2 pl-3 pr-9 rounded-xl border border-dark-border focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer transition-all shadow-sm"
                    >
                      <option value="" disabled className="text-slate-400">
                        {t('manual.qa_select_prompt')}
                      </option>
                      {[
                        { id: 'qa-case-1', labelKey: 'manual.qa_case1_toc', badgeKey: 'manual.qa_case1_badge' },
                        { id: 'qa-case-2', labelKey: 'manual.qa_case2_toc', badgeKey: 'manual.qa_case2_badge' },
                        { id: 'qa-case-3', labelKey: 'manual.qa_case3_toc', badgeKey: 'manual.qa_case3_badge' },
                        { id: 'qa-case-4', labelKey: 'manual.qa_case4_toc', badgeKey: 'manual.qa_case4_badge' },
                        { id: 'qa-case-5', labelKey: 'manual.qa_case5_toc', badgeKey: 'manual.qa_case5_badge' },
                        { id: 'qa-case-6', labelKey: 'manual.qa_case6_toc', badgeKey: 'manual.qa_case6_badge' },
                        { id: 'qa-case-7', labelKey: 'manual.qa_case7_toc', badgeKey: 'manual.qa_case7_badge' },
                        { id: 'qa-case-8', labelKey: 'manual.qa_case8_toc', badgeKey: 'manual.qa_case8_badge' },
                        { id: 'qa-case-9', labelKey: 'manual.qa_case9_toc', badgeKey: 'manual.qa_case9_badge' },
                      ].map((item, idx) => (
                        <option key={item.id} value={item.id} className="bg-dark-surface text-slate-200 py-1.5">
                          {`Case ${idx + 1}: ${t(item.labelKey)} [${t(item.badgeKey)}]`}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* CASE 1: CFD Import Error (IGES is GLB Mesh not CAD Solid) */}
              <div id="qa-case-1" className="p-4.5 rounded-2xl bg-dark-panel border border-amber-500/30 space-y-3.5 shadow-md scroll-mt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {t('manual.qa_case1_badge')}
                  </span>
                  <button
                    type="button"
                    onClick={() => document.getElementById('qa-top')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-[11px] text-slate-400 hover:text-brand-300 transition-colors"
                  >
                    {t('manual.qa_back_to_top')}
                  </button>
                </div>
                <h4 className="font-bold text-slate-100 text-sm sm:text-base leading-snug text-amber-200">
                  {t('manual.qa_case1_title')}
                </h4>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-dark-border space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{t('manual.qa_case1_why_title')}</span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border/60">
                      {t('manual.qa_case1_reason1')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border/60">
                      {t('manual.qa_case1_reason2')}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-emerald-500/30 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('manual.qa_case1_solutions_title')}</span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-200">
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-emerald-500/20 text-emerald-300/90 font-medium">
                      {t('manual.qa_case1_sol1')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-brand-500/20 text-brand-300/90 font-medium">
                      {t('manual.qa_case1_sol2')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-indigo-500/20 text-indigo-300/90 font-medium">
                      {t('manual.qa_case1_sol3')}
                    </div>
                  </div>
                </div>
              </div>

              {/* CASE 2: Mesh to STEP Solid Sewing (Original Issue 1) */}
              <div id="qa-case-2" className="p-4.5 rounded-2xl bg-dark-panel border border-rose-500/30 space-y-3.5 shadow-md scroll-mt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    {t('manual.qa_case2_badge')}
                  </span>
                  <button
                    type="button"
                    onClick={() => document.getElementById('qa-top')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-[11px] text-slate-400 hover:text-brand-300 transition-colors"
                  >
                    {t('manual.qa_back_to_top')}
                  </button>
                </div>
                <h4 className="font-bold text-slate-100 text-sm sm:text-base leading-snug text-rose-200">
                  {t('manual.qa_case2_title')}
                </h4>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-dark-border space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{t('manual.qa_case2_why_title')}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border/60">
                    {t('manual.qa_case2_desc')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-emerald-500/30 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('manual.qa_case2_solutions_title')}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-200">
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case2_sol1')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case2_sol2')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case2_sol3')}
                    </div>
                  </div>
                </div>
              </div>

              {/* CASE 3: Body vs Fluid Domain (Original Issue 2) */}
              <div id="qa-case-3" className="p-4.5 rounded-2xl bg-dark-panel border border-indigo-500/30 space-y-3.5 shadow-md scroll-mt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    {t('manual.qa_case3_badge')}
                  </span>
                  <button
                    type="button"
                    onClick={() => document.getElementById('qa-top')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-[11px] text-slate-400 hover:text-brand-300 transition-colors"
                  >
                    {t('manual.qa_back_to_top')}
                  </button>
                </div>
                <h4 className="font-bold text-slate-100 text-sm sm:text-base leading-snug text-indigo-200">
                  {t('manual.qa_case3_title')}
                </h4>
                <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed p-3.5 rounded-xl bg-dark-surface border border-dark-border">
                  {t('manual.qa_case3_desc')}
                </div>
              </div>

              {/* CASE 4: index.html Download Anomaly */}
              <div id="qa-case-4" className="p-4.5 rounded-2xl bg-dark-panel border border-sky-500/30 space-y-3.5 shadow-md scroll-mt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    {t('manual.qa_case4_badge')}
                  </span>
                  <button
                    type="button"
                    onClick={() => document.getElementById('qa-top')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-[11px] text-slate-400 hover:text-brand-300 transition-colors"
                  >
                    {t('manual.qa_back_to_top')}
                  </button>
                </div>
                <h4 className="font-bold text-slate-100 text-sm sm:text-base leading-snug text-sky-200">
                  {t('manual.qa_case4_title')}
                </h4>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-dark-border space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{t('manual.qa_case4_why_title')}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border/60">
                    {t('manual.qa_case4_reason')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-emerald-500/30 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('manual.qa_case4_solutions_title')}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-200">
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case4_sol1')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case4_sol2')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case4_sol3')}
                    </div>
                  </div>
                </div>
              </div>

              {/* CASE 5: CAD HUD Preview instead of 3D Mesh */}
              <div id="qa-case-5" className="p-4.5 rounded-2xl bg-dark-panel border border-purple-500/30 space-y-3.5 shadow-md scroll-mt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    {t('manual.qa_case5_badge')}
                  </span>
                  <button
                    type="button"
                    onClick={() => document.getElementById('qa-top')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-[11px] text-slate-400 hover:text-brand-300 transition-colors"
                  >
                    {t('manual.qa_back_to_top')}
                  </button>
                </div>
                <h4 className="font-bold text-slate-100 text-sm sm:text-base leading-snug text-purple-200">
                  {t('manual.qa_case5_title')}
                </h4>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-dark-border space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{t('manual.qa_case5_why_title')}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border/60">
                    {t('manual.qa_case5_reason')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-emerald-500/30 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('manual.qa_case5_solutions_title')}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-200">
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case5_sol1')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case5_sol2')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case5_sol3')}
                    </div>
                  </div>
                </div>
              </div>

              {/* CASE 6: Hugging Face 16GB Node Timeout or 503 */}
              <div id="qa-case-6" className="p-4.5 rounded-2xl bg-dark-panel border border-emerald-500/30 space-y-3.5 shadow-md scroll-mt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {t('manual.qa_case6_badge')}
                  </span>
                  <button
                    type="button"
                    onClick={() => document.getElementById('qa-top')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-[11px] text-slate-400 hover:text-brand-300 transition-colors"
                  >
                    {t('manual.qa_back_to_top')}
                  </button>
                </div>
                <h4 className="font-bold text-slate-100 text-sm sm:text-base leading-snug text-emerald-200">
                  {t('manual.qa_case6_title')}
                </h4>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-dark-border space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{t('manual.qa_case6_why_title')}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border/60">
                    {t('manual.qa_case6_reason')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-emerald-500/30 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('manual.qa_case6_solutions_title')}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-200">
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case6_sol1')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case6_sol2')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case6_sol3')}
                    </div>
                  </div>
                </div>
              </div>

              {/* CASE 7: Share URL Navigation Failure */}
              <div id="qa-case-7" className="p-4.5 rounded-2xl bg-dark-panel border border-teal-500/30 space-y-3.5 shadow-md scroll-mt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    {t('manual.qa_case7_badge')}
                  </span>
                  <button
                    type="button"
                    onClick={() => document.getElementById('qa-top')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-[11px] text-slate-400 hover:text-brand-300 transition-colors"
                  >
                    {t('manual.qa_back_to_top')}
                  </button>
                </div>
                <h4 className="font-bold text-slate-100 text-sm sm:text-base leading-snug text-teal-200">
                  {t('manual.qa_case7_title')}
                </h4>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-dark-border space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>{t('manual.qa_case7_why_title')}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border/60">
                    {t('manual.qa_case7_reason')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-emerald-500/30 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('manual.qa_case7_solutions_title')}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-200">
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case7_sol1')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case7_sol2')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case7_sol3')}
                    </div>
                  </div>
                </div>
              </div>

              {/* CASE 8: Wind Tunnel Settings Linkage */}
              <div id="qa-case-8" className="p-4.5 rounded-2xl bg-dark-panel border border-sky-500/30 space-y-3.5 shadow-md scroll-mt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    {t('manual.qa_case8_badge')}
                  </span>
                  <button
                    type="button"
                    onClick={() => document.getElementById('qa-top')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-[11px] text-slate-400 hover:text-brand-300 transition-colors"
                  >
                    {t('manual.qa_back_to_top')}
                  </button>
                </div>
                <h4 className="font-bold text-slate-100 text-sm sm:text-base leading-snug text-sky-200">
                  {t('manual.qa_case8_title')}
                </h4>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-dark-border space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{t('manual.qa_case8_why_title')}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <p className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border/60 leading-relaxed">
                      {t('manual.qa_case8_reason1')}
                    </p>
                    <p className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border/60 leading-relaxed">
                      {t('manual.qa_case8_reason2')}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-emerald-500/30 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('manual.qa_case8_solutions_title')}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-200">
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case8_sol1')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case8_sol2')}
                    </div>
                  </div>
                </div>
              </div>

              {/* CASE 9: Precondition Impact of Mesh Quality on Wind Tunnel Extraction */}
              <div id="qa-case-9" className="p-4.5 rounded-2xl bg-dark-panel border border-violet-500/30 space-y-3.5 shadow-md scroll-mt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40">
                    {t('manual.qa_case9_badge')}
                  </span>
                  <button
                    type="button"
                    onClick={() => document.getElementById('qa-top')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-[11px] text-slate-400 hover:text-brand-300 transition-colors"
                  >
                    {t('manual.qa_back_to_top')}
                  </button>
                </div>
                <h4 className="font-bold text-slate-100 text-sm sm:text-base leading-snug text-violet-200">
                  {t('manual.qa_case9_title')}
                </h4>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-dark-border space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-violet-400 shrink-0" />
                    <span>{t('manual.qa_case9_why_title')}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <p className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border/60 leading-relaxed">
                      {t('manual.qa_case9_reason1')}
                    </p>
                    <p className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border/60 leading-relaxed">
                      {t('manual.qa_case9_reason2')}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-surface border border-emerald-500/30 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('manual.qa_case9_solutions_title')}</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-200">
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case9_sol1')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case9_sol2')}
                    </div>
                    <div className="p-2.5 rounded-lg bg-dark-panel/80 border border-dark-border">
                      {t('manual.qa_case9_sol3')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: QUICK START */}
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-200">
                <h3 className="font-bold text-sm sm:text-base text-white mb-1 flex items-center gap-2">
                  <span>{t('manual.quickstart_banner_title')}</span>
                </h3>
                <p className="text-xs text-brand-300/90 leading-relaxed">
                  {t('manual.quickstart_banner_desc')}
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

              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-2.5">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                  <span>{t('manual.presets_guide_title')}</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-brand-400 font-bold shrink-0">{t('manual.preset_game_title')}</span>
                    <span className="text-slate-300">{t('manual.preset_game_desc')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold shrink-0">{t('manual.preset_3dprint_title')}</span>
                    <span className="text-slate-300">{t('manual.preset_3dprint_desc')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold shrink-0">{t('manual.preset_asis_title')}</span>
                    <span className="text-slate-300">{t('manual.preset_asis_desc')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FIDELITY & HEALING */}
          {activeTab === 'fidelity' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 space-y-1">
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{t('manual.fidelity_title')}</span>
                </h3>
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  {t('manual.fidelity_desc')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('manual.fidelity_passthrough_title')}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('manual.fidelity_passthrough_desc')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-brand-400 font-bold text-xs">
                    <Target className="w-4 h-4 shrink-0" />
                    <span>{t('manual.fidelity_intent_title')}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('manual.fidelity_intent_desc')}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('manual.fidelity_tiers_title')}</span>
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="text-slate-300 leading-relaxed">{t('manual.fidelity_tier1')}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="text-slate-300 leading-relaxed">{t('manual.fidelity_tier2')}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="text-slate-300 leading-relaxed">{t('manual.fidelity_tier3')}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-2">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('manual.fidelity_cad_title')}</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('manual.fidelity_cad_desc')}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: VIEWPORT & TOOLS */}
          {activeTab === 'viewport' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-brand-400" />
                  <span>{t('manual.viewport_title')}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="font-bold text-brand-300 block mb-1">{t('manual.control_lmb_title')}</span>
                    <span className="text-slate-400">{t('manual.control_lmb_desc')}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="font-bold text-indigo-300 block mb-1">{t('manual.control_rmb_title')}</span>
                    <span className="text-slate-400">{t('manual.control_rmb_desc')}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <span className="font-bold text-amber-300 block mb-1">{t('manual.control_wheel_title')}</span>
                    <span className="text-slate-400">{t('manual.control_wheel_desc')}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-dark-panel border border-dark-border space-y-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-400" />
                  <span>{t('manual.modes_tools_title')}</span>
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li>• {t('manual.mode_shaded_bullet')}</li>
                  <li>• {t('manual.mode_wireframe_bullet')}</li>
                  <li>• {t('manual.mode_normals_bullet')}</li>
                  <li>• {t('manual.mode_xray_bullet')}</li>
                  <li>• {t('manual.mode_heatmap_bullet')}</li>
                  <li>• {t('manual.tool_measure_bullet')}</li>
                  <li>• {t('manual.tool_section_bullet')}</li>
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
                  <span>{t('manual.engine_heading')}</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('manual.engine_desc')}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      {t('manual.engine_client_title')}
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>• {t('manual.engine_client_b1')}</li>
                      <li>• {t('manual.engine_client_b2')}</li>
                      <li>• {t('manual.engine_client_b3')}</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      {t('manual.engine_server_title')}
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>• {t('manual.engine_server_b1')}</li>
                      <li>• {t('manual.engine_server_b2')}</li>
                      <li>• {t('manual.engine_server_b3')}</li>
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
                    <span>{t('manual.engine_settings_btn')}</span>
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
                  <span>{t('manual.slicer_heading')}</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('manual.slicer_question')}
                </p>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <b className="text-white block mb-1">{t('manual.slicer_watertight_title')}</b>
                    <span>{t('manual.slicer_watertight_desc')}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-dark-surface border border-dark-border">
                    <b className="text-amber-400 block mb-1">{t('manual.slicer_overhang_title')}</b>
                    <span>{t('manual.slicer_overhang_desc')}</span>
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
                  <span>{t('manual.commands_heading')}</span>
                </h3>
                <p className="text-xs text-slate-300">
                  {t('manual.commands_desc')}
                </p>

                <div className="relative p-3 rounded-xl bg-black/70 border border-dark-border/80 font-mono text-xs text-emerald-400 overflow-x-auto">
                  <code>{dockerCmd}</code>
                  <button
                    onClick={handleCopy}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-dark-surface hover:bg-dark-hover text-slate-300 hover:text-white border border-dark-border transition-all"
                    title={t('backend_modal.copy')}
                  >
                    {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  {t('manual.commands_post_desc', { url: 'http://localhost:8000' })}
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
            {t('manual.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
