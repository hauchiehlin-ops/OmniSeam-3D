import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ListOrdered, 
  Download, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { TaskResponse } from '../types';
import { apiClient } from '../api/client';

interface TaskHistoryProps {
  tasks: TaskResponse[];
  onSelectPreview: (task: TaskResponse) => void;
  activeTaskId?: string | null;
}

export const TaskHistory: React.FC<TaskHistoryProps> = ({
  tasks,
  onSelectPreview,
  activeTaskId
}) => {
  const { t } = useTranslation();

  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 p-5 bg-dark-surface border border-dark-border rounded-2xl">
      <div className="flex items-center gap-2 text-slate-100 font-bold text-sm pb-2 border-b border-dark-border">
        <ListOrdered className="w-4 h-4 text-brand-400" />
        <span>{t('tasks.title')}</span>
      </div>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {tasks.map((task) => {
          const isSelected = task.task_id === activeTaskId;
          const isDone = task.status === 'completed';
          const isFailed = task.status === 'failed';

          return (
            <div
              key={task.task_id}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
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
                      onClick={() => onSelectPreview(task)}
                      className="p-2 rounded-lg bg-dark-surface hover:bg-brand-600 text-slate-300 hover:text-white border border-dark-border transition-all"
                      title={t('tasks.load_preview')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <a
                      href={apiClient.getDownloadUrl(task.task_id)}
                      download
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
                      title={t('tasks.download')}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t('tasks.download')}</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
