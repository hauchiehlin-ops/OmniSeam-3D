import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud, FileType, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';

interface DropzoneProps {
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  isLoading?: boolean;
}

const SUPPORTED_FORMATS = [
  'STEP / IGES', 'SolidWorks', 'Rhino 3dm', 'STL / OBJ', '3MF', 'BIM (IFC)', 'DXF', 'Point Cloud', 'FBX / GLB'
];

export const Dropzone: React.FC<DropzoneProps> = ({
  onFileSelected,
  selectedFile,
  isLoading
}) => {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  const handleLoadSample = async (type: 'broken' | 'bracket') => {
    try {
      const { file } = await apiClient.getSampleModel(type);
      onFileSelected(file);
    } catch (err) {
      console.error("Failed to load sample:", err);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center overflow-hidden group ${
          isDragOver
            ? 'border-brand-400 bg-brand-500/10 scale-[1.01]'
            : selectedFile
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-dark-border hover:border-brand-500/50 bg-dark-surface hover:bg-dark-panel/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInput}
          disabled={isLoading}
        />

        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-brand-500/20 transition-all duration-300">
          <UploadCloud className="w-6 h-6 text-brand-400" />
        </div>

        <h3 className="text-sm font-semibold text-slate-100 mb-1">
          {selectedFile ? selectedFile.name : t('dropzone.title')}
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mb-3">
          {selectedFile
            ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for processing`
            : t('dropzone.subtitle')}
        </p>

        {/* Supported format pills */}
        <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
          {SUPPORTED_FORMATS.map((fmt) => (
            <span
              key={fmt}
              className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-dark-panel border border-dark-border text-slate-300"
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>

      {/* Benchmark samples guide */}
      <div className="flex flex-col gap-2 p-3 bg-dark-surface border border-dark-border rounded-xl">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {t('dropzone.sample_models')}
          </span>
          <span className="text-[11px] text-slate-500">點擊即刻載入測試</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Sample 1: Defective */}
          <button
            type="button"
            onClick={() => handleLoadSample('broken')}
            disabled={isLoading}
            className="group flex flex-col items-start p-2.5 rounded-lg bg-dark-panel border border-dark-border hover:border-rose-500/50 hover:bg-rose-500/5 text-left transition-all"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-bold text-rose-300 group-hover:text-rose-200 flex items-center gap-1">
                🔴 {t('dropzone.sample_broken')}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] rounded bg-rose-500/10 border border-rose-500/30 text-rose-300">
                {t('dropzone.sample_broken_tag')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              {t('dropzone.sample_broken_desc')}
            </p>
          </button>

          {/* Sample 2: Bracket */}
          <button
            type="button"
            onClick={() => handleLoadSample('bracket')}
            disabled={isLoading}
            className="group flex flex-col items-start p-2.5 rounded-lg bg-dark-panel border border-dark-border hover:border-brand-500/50 hover:bg-brand-500/5 text-left transition-all"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-xs font-bold text-brand-300 group-hover:text-brand-200 flex items-center gap-1">
                ⚙️ {t('dropzone.sample_bracket')}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] rounded bg-brand-500/10 border border-brand-500/30 text-brand-300">
                {t('dropzone.sample_bracket_tag')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              {t('dropzone.sample_bracket_desc')}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

