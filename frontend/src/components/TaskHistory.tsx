import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ListOrdered, 
  Download, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  X
} from 'lucide-react';
import { TaskResponse } from '../types';
import { apiClient } from '../api/client';

interface TaskHistoryProps {
  tasks: TaskResponse[];
  onSelectPreview: (task: TaskResponse) => void;
  onDeleteTask?: (taskId: string) => void;
  onClearAll?: () => void;
  activeTaskId?: string | null;
}

export const TaskHistory: React.FC<TaskHistoryProps> = ({
  tasks,
  onSelectPreview,
  onDeleteTask,
  onClearAll,
  activeTaskId
}) => {
  const { t } = useTranslation();

  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 p-5 bg-dark-surface border border-dark-border rounded-2xl animate-fade-in">
      {/* Header with Title and Clear All button */}
      <div className="flex items-center justify-between pb-2 border-b border-dark-border">
        <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
          <ListOrdered className="w-4 h-4 text-brand-400" />
          <span>{t('tasks.title')}</span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-dark-panel border border-dark-border text-slate-400">
            {tasks.length}
          </span>
        </div>

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
                    <div className="flex items-center gap-2 w-full max-w-xs">
                      <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span>{task.current_step || 'Processing...'}</span>
                      <div className="flex-1 bg-dark-surface rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-brand-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
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

