import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud } from 'lucide-react';

interface DropzoneProps {
  onFileSelected: (file: File) => void;
  onFilesSelected?: (files: File[]) => void;
  selectedFile: File | null;
  batchFilesCount?: number;
  isLoading?: boolean;
}

const SUPPORTED_FORMATS = [
  'STEP / IGES', 'SolidWorks', 'Rhino 3dm', 'STL / OBJ', '3MF', 'BIM (IFC)', 'DXF', 'Point Cloud', 'FBX / GLB'
];

export const Dropzone: React.FC<DropzoneProps> = ({
  onFileSelected,
  onFilesSelected,
  selectedFile,
  batchFilesCount = 0,
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
      const fileList = Array.from(e.dataTransfer.files);
      if (fileList.length > 1 && onFilesSelected) {
        onFilesSelected(fileList);
      } else {
        onFileSelected(fileList[0]);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      if (fileList.length > 1 && onFilesSelected) {
        onFilesSelected(fileList);
      } else {
        onFileSelected(fileList[0]);
      }
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
          multiple
          className="hidden"
          onChange={handleFileInput}
          disabled={isLoading}
        />

        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-brand-500/20 transition-all duration-300">
          <UploadCloud className="w-6 h-6 text-brand-400" />
        </div>

        <h3 className="text-sm font-semibold text-slate-100 mb-1">
          {batchFilesCount > 1
            ? `📦 ${batchFilesCount} ${t('dropzone.batch_selected_label')}`
            : selectedFile
            ? selectedFile.name
            : t('dropzone.title')}
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mb-3">
          {batchFilesCount > 1
            ? t('dropzone.batch_ready_hint', { count: batchFilesCount })
            : selectedFile
            ? t('dropzone.ready_for_processing', { size: (selectedFile.size / (1024 * 1024)).toFixed(2) })
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
    </div>
  );
};

