import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ListOrdered, 
  Download, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  Package,
  X
} from 'lucide-react';
import { TaskResponse } from '../types';
import { apiClient } from '../api/client';

interface TaskHistoryProps {
  tasks: TaskResponse[];
  onSelectPreview: (task: TaskResponse) => void;
  onDeleteTask?: (taskId: string) => void;
  onClearAll?: () => void;
  onDownloadAllZip?: () => void;
  isDownloadingZip?: boolean;
  activeTaskId?: string | null;
}

export const TaskHistory: React.FC<TaskHistoryProps> = ({
  tasks,
  onSelectPreview,
  onDeleteTask,
  onClearAll,
  onDownloadAllZip,
  isDownloadingZip = false,
  activeTaskId
}) => {
  const { t } = useTranslation();

  if (tasks.length === 0) return null;

  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="flex flex-col gap-3 p-5 bg-dark-surface border border-dark-border rounded-2xl animate-fade-in">
      {/* Header with Title, Batch Download ZIP and Clear All button */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-dark-border">
        <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
          <ListOrdered className="w-4 h-4 text-brand-400" />
          <span>{t('tasks.title')}</span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-dark-panel border border-dark-border text-slate-400">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onDownloadAllZip && completedTasks.length > 0 && (
            <button
              type="button"
              onClick={onDownloadAllZip}
              disabled={isDownloadingZip}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              title={t('tasks.download_all_zip')}
            >
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {isDownloadingZip ? t('tasks.downloading_zip') : t('tasks.download_all_zip')}
              </span>
              <span className="px-1 py-0.2 text-[9px] font-mono rounded bg-emerald-950/80 text-emerald-300">
                ({completedTasks.length})
              </span>
            </button>
          )}

          {onClearAll && tasks.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all"
              title={t('tasks.clear_all')}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('tasks.clear_all')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {tasks.map((task) => {
          const isSelected = task.task_id === activeTaskId;
          const isDone = task.status === 'completed';
          const isFailed = task.status === 'failed';

          const baseName = task.filename.substring(0, task.filename.lastIndexOf('.')) || task.filename;
          const downloadFilename = `${baseName}_omniseam.${task.target_format}`;
          const downloadHref = apiClient.getDownloadUrl(task);

          return (
            <div
              key={task.task_id}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all group ${
                isSelected
                  ? 'bg-brand-500/10 border-brand-500/40 shadow-sm'
                  : 'bg-dark-panel border-dark-border hover:border-slate-600'
              }`}
            >
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {task.filename}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] uppercase font-mono font-bold rounded bg-dark-surface text-brand-400 border border-dark-border">
                    {task.target_format}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  {isDone ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {task.current_step || t('tasks.status_completed')}
                    </span>
                  ) : isFailed ? (
                    <span className="flex items-center gap-1 text-rose-400 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {task.current_step || t('tasks.status_failed')}
                    </span>
                  ) : (
                    <div className="flex flex-col gap-1 w-full max-w-sm">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin shrink-0" />
                          <span className="text-brand-300 font-medium truncate">
                            {task.current_step || t('settings.processing')}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-brand-400 shrink-0">
                          {task.progress || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-dark-surface rounded-full h-1.5 overflow-hidden border border-dark-border/50">
                        <div
                          className="bg-gradient-to-r from-brand-500 to-indigo-500 h-full rounded-full transition-all duration-300 relative overflow-hidden"
                          style={{ width: `${Math.max(task.progress || 5, 5)}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {isDone && (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelectPreview(task)}
                      className="p-2 rounded-lg bg-dark-surface hover:bg-brand-600 text-slate-300 hover:text-white border border-dark-border transition-all"
                      title={t('tasks.load_preview')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <a
                      href={downloadHref}
                      download={downloadFilename}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
                      title={t('tasks.download')}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t('tasks.download')}</span>
                    </a>
                  </>
                )}

                {/* Single Task Delete Button */}
                {onDeleteTask && (
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.task_id)}
                    className="p-2 rounded-lg bg-dark-surface hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-dark-border hover:border-rose-500/30 transition-all"
                    title={t('tasks.delete_task')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

