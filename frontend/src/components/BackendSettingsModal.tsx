import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Cloud, 
  Zap, 
  Server, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Copy, 
  Check, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  HelpCircle,
  X
} from 'lucide-react';
import { apiClient, ConnectionTestResult, normalizeBackendUrl } from '../api/client';

interface BackendSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackendConnected?: (url: string) => void;
}

const OFFICIAL_DUPLICATE_URL = "https://huggingface.co/spaces/hauchieh/omniseam-engine?duplicate=true";
const OFFICIAL_DEMO_NODE_URL = "https://hauchieh-omniseam-engine.hf.space";

export const BackendSettingsModal: React.FC<BackendSettingsModalProps> = ({
  isOpen,
  onClose,
  onBackendConnected,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'hf' | 'local' | 'client'>('hf');
  const [backendUrl, setBackendUrl] = useState('');
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = apiClient.getStoredBackendUrl();
      setBackendUrl(stored || '');
      setTestResult(null);
      setSaveSuccess(false);
      if (stored) {
        handleTest(stored);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async (urlToTest?: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const rawTarget = urlToTest !== undefined ? urlToTest : backendUrl;
      const cleanTarget = normalizeBackendUrl(rawTarget);
      if (cleanTarget !== backendUrl) {
        setBackendUrl(cleanTarget);
      }
      const res = await apiClient.testBackendConnection(cleanTarget);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        ok: false,
        latencyMs: 0,
        error: err.message || 'Unknown network error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const clean = normalizeBackendUrl(backendUrl);
    apiClient.setBackendUrl(clean);
    apiClient.setEngineMode('server');
    setSaveSuccess(true);
    if (onBackendConnected) {
      onBackendConnected(clean);
    }
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleSwitchToClient = () => {
    apiClient.setEngineMode('client');
    onClose();
  };

  const handleUseOfficialDemo = () => {
    setBackendUrl(OFFICIAL_DEMO_NODE_URL);
    handleTest(OFFICIAL_DEMO_NODE_URL);
  };

  const copyDockerCommand = () => {
    navigator.clipboard.writeText('docker run -d -p 8000:8000 --name omniseam-backend ghcr.io/hauchiehlin-ops/omniseam-3d-backend:latest');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-dark-surface border border-dark-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-dark-panel/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-brand-500/20 border border-indigo-500/30 text-indigo-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{t('backend_modal.title')}</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Free 16GB RAM
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {t('backend_modal.subtitle')}
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

        {/* Tab Navigation */}
        <div className="flex flex-wrap border-b border-dark-border bg-dark-panel/40 px-4 sm:px-6 pt-2 gap-1">
          <button
            onClick={() => setActiveTab('hf')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'hf'
                ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('backend_modal.tab_hf')}</span>
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'local'
                ? 'border-brand-400 text-brand-300 bg-brand-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-brand-400" />
            <span>{t('backend_modal.tab_local')}</span>
          </button>
          <button
            onClick={() => setActiveTab('client')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'client'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('backend_modal.tab_client')}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'hf' && (
            <div className="space-y-4">
              {/* Option A: Fast Public Demo Node */}
              <div className="p-3.5 rounded-xl bg-dark-panel border border-dark-border space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 flex-wrap">
                        <span>{t('backend_modal.public_node_title')}</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-medium">
                          {t('backend_modal.public_node_tag1')}
                        </span>
                        <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          {t('backend_modal.public_node_tag2')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t('backend_modal.public_node_desc')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseOfficialDemo}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-lg transition-all shrink-0"
                  >
                    {t('backend_modal.use_public_btn')}
                  </button>
                </div>
              </div>

              {/* Option B: 1-Click Duplicate Personal Free 16GB Node */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-dark-panel to-dark-panel border border-indigo-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>{t('backend_modal.hf_duplicate_heading')}</span>
                  </span>
                  <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 font-semibold">
                    {t('backend_modal.hf_duplicate_tag')}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {t('backend_modal.hf_duplicate_desc')}
                </p>

                <div className="pt-1">
                  <a
                    href={OFFICIAL_DUPLICATE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all group"
                  >
                    <span>{t('backend_modal.hf_duplicate_btn')}</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </div>

                {/* Clear Field Guidance for Duplicate Screen */}
                <div className="p-3 bg-dark-bg/80 border border-indigo-500/20 rounded-lg text-xs space-y-1.5">
                  <div className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t('backend_modal.fields_guide_title')}</span>
                  </div>
                  <ul className="text-[11px] text-slate-300 space-y-1 pl-1">
                    <li>• {t('backend_modal.guide_owner')}</li>
                    <li>• {t('backend_modal.guide_hardware')}</li>
                  </ul>
                </div>
              </div>

              {/* Quick Spec Comparison Table */}
              <div className="p-3.5 rounded-xl bg-dark-panel/60 border border-dark-border text-xs space-y-2">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-400" />
                  <span>{t('backend_modal.comparison_title')}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-dark-border text-slate-400">
                        <th className="py-1.5 pr-2 font-medium">{t('backend_modal.table_col_item')}</th>
                        <th className="py-1.5 px-2 font-medium text-emerald-400">{t('backend_modal.table_col_public')}</th>
                        <th className="py-1.5 pl-2 font-medium text-indigo-300">{t('backend_modal.table_col_private')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/50 text-slate-300">
                      <tr>
                        <td className="py-1.5 pr-2 text-slate-400">{t('backend_modal.table_row_scene')}</td>
                        <td className="py-1.5 px-2">{t('backend_modal.table_row_scene_pub')}</td>
                        <td className="py-1.5 pl-2 text-indigo-200 font-medium">{t('backend_modal.table_row_scene_priv')}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-2 text-slate-400">{t('backend_modal.table_row_size')}</td>
                        <td className="py-1.5 px-2 text-amber-300 font-medium">{t('backend_modal.table_row_size_pub')}</td>
                        <td className="py-1.5 pl-2 text-emerald-400 font-medium">{t('backend_modal.table_row_size_priv')}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-2 text-slate-400">{t('backend_modal.table_row_compute')}</td>
                        <td className="py-1.5 px-2">{t('backend_modal.table_row_compute_pub')}</td>
                        <td className="py-1.5 pl-2 text-emerald-400 font-medium">{t('backend_modal.table_row_compute_priv')}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-2 text-slate-400">{t('backend_modal.table_row_privacy')}</td>
                        <td className="py-1.5 px-2">{t('backend_modal.table_row_privacy_pub')}</td>
                        <td className="py-1.5 pl-2 text-emerald-400 font-medium">{t('backend_modal.table_row_privacy_priv')}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-2 text-slate-400">{t('backend_modal.table_row_cost')}</td>
                        <td className="py-1.5 px-2 text-emerald-400 font-medium">{t('backend_modal.table_row_cost_pub')}</td>
                        <td className="py-1.5 pl-2 text-emerald-400 font-medium">{t('backend_modal.table_row_cost_priv')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>


              {/* URL Input & Connection test */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>{t('backend_modal.input_url_label')}</span>
                  <span className="text-[11px] text-slate-400 font-normal">{t('backend_modal.auto_normalize_hint')}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://your-username-spacename.hf.space"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    className="flex-1 bg-dark-panel border border-dark-border rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono transition-all"
                  />
                  <button
                    onClick={() => handleTest()}
                    disabled={isTesting || !backendUrl.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-dark-panel border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/20 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('backend_modal.testing')}</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{t('backend_modal.test_btn')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'local' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-dark-panel border border-dark-border space-y-3">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-brand-400" />
                  {t('backend_modal.local_title')}
                </span>

                <div className="relative group">
                  <pre className="p-3 bg-dark-bg border border-dark-border rounded-lg text-[11px] font-mono text-brand-300 overflow-x-auto">
                    docker run -d -p 8000:8000 hauchiehlin/omniseam-3d-backend:latest
                  </pre>
                  <button
                    onClick={copyDockerCommand}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-dark-surface border border-dark-border text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? t('backend_modal.copied') : t('backend_modal.copy')}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  {t('backend_modal.local_hint')}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  {t('backend_modal.local_url_label')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="http://localhost:8000"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    className="flex-1 bg-dark-panel border border-dark-border rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 font-mono transition-all"
                  />
                  <button
                    onClick={() => handleTest()}
                    disabled={isTesting || !backendUrl.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-dark-panel border border-brand-500/40 text-brand-300 hover:bg-brand-600/20 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                  >
                    {isTesting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-brand-400" />
                    )}
                    <span>{t('backend_modal.test_btn')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'client' && (
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>{t('backend_modal.client_title')}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {t('backend_modal.client_desc')}
              </p>
              <div className="p-3 bg-dark-surface/60 border border-dark-border rounded-lg text-[11px] text-slate-400">
                ⚠️ {t('backend_modal.client_limitation')}
              </div>
              <button
                onClick={handleSwitchToClient}
                className="w-full py-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold rounded-xl hover:bg-amber-500/30 transition-all"
              >
                {t('backend_modal.client_confirm')}
              </button>
            </div>
          )}

          {/* Test Connection Output Banner */}
          {testResult && (
            <div className={`p-4 rounded-xl border transition-all ${
              testResult.ok 
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-start gap-2.5">
                {testResult.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {testResult.ok ? t('backend_modal.test_success') : t('backend_modal.test_fail')}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-dark-surface border border-dark-border">
                      {testResult.latencyMs} ms
                    </span>
                  </div>
                  {testResult.ok && testResult.data ? (
                    <div className="text-[11px] text-slate-300 space-y-0.5 pt-1">
                      <div>{t('backend_modal.service_ver')}: <span className="font-mono text-emerald-400">v{testResult.data.version}</span> ({testResult.data.service})</div>
                      <div>{t('backend_modal.freecad_support')}: <span className="text-white font-medium">{testResult.data.engine_features?.freecad_available ? t('backend_modal.freecad_enabled') : t('backend_modal.freecad_light')}</span></div>
                      <div>{t('backend_modal.supported_formats_label')}: <span className="text-slate-400">{testResult.data.supported_formats.slice(0, 10).join(', ')}... (+{testResult.data.supported_formats.length - 10} formats)</span></div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-rose-300/90 pt-1">
                      {testResult.error}
                      {backendUrl.includes('hf.space') && t('backend_modal.hf_sleep_tip')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-dark-border bg-dark-panel/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            {t('backend_modal.cancel')}
          </button>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" />
                {t('backend_modal.saved')}
              </span>
            )}

            {activeTab !== 'client' && (
              <button
                onClick={handleSave}
                disabled={!backendUrl.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('backend_modal.save_and_activate')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
