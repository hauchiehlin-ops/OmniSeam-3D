import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { apiClient, EngineMode, PUBLIC_DEMO_MAX_SIZE_BYTES } from '../api/client';
import { ConversionConfig, TaskResponse } from '../types';
import { ZipPackager, ZipEntry } from '../engine/zip-packager';
import { ProFeature, can, fileExt, requiredFeatureForConvert, toBasicConfig } from '../platform/entitlements';
import { recordSuccessfulConversion, saveOrShareFile } from '../platform/native';
import { APP_VERSION } from '../version';
import { PROPRIETARY_CAD_EXTS } from './useModelLoader';
import { useNodeErrorReporter } from './useNodeErrorReporter';
import type { PaywallSecondaryAction } from './usePaywall';

const POLL_INTERVAL_MS = 1000;
const BATCH_POLL_INTERVAL_MS = 800;

interface ConversionOptions {
  selectedFile: File | null;
  selectedFiles: File[];
  config: ConversionConfig;
  engineMode: EngineMode;
  requirePro: (feature: ProFeature, secondary?: PaywallSecondaryAction | null) => boolean;
  closePaywall: () => void;
  onCadNeedsNode: (file: File) => void;
  onPublicNodeLimit: (file: File) => void;
  /** A conversion finished: show the result (and the report for single files). */
  onFinished: (opts: { showReport: boolean }) => void;
}

/** Inserts or replaces a task in the history list (newest first). */
function upsertTask(list: TaskResponse[], task: TaskResponse): TaskResponse[] {
  const idx = list.findIndex((t) => t.task_id === task.task_id);
  if (idx < 0) return [task, ...list];
  const next = [...list];
  next[idx] = task;
  return next;
}

const isFinal = (task: TaskResponse) => task.status === 'completed' || task.status === 'failed';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Conversion pipeline: plan gate, cloud-node guards, single and batch
 * conversion (on-device or cloud with status polling), task history and
 * ZIP export of all results.
 */
export function useConversion({
  selectedFile,
  selectedFiles,
  config,
  engineMode,
  requirePro,
  closePaywall,
  onCadNeedsNode,
  onPublicNodeLimit,
  onFinished,
}: ConversionOptions) {
  const { t, i18n } = useTranslation();
  const reportNodeError = useNodeErrorReporter();
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [activeTask, setActiveTask] = useState<TaskResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const celebrate = (particleCount: number, spread: number, y: number) =>
    confetti({ particleCount, spread, origin: { y } });

  /** Converts one file in the batch queue and waits until it is done. */
  const convertBatchItem = async (file: File, cfg: ConversionConfig) => {
    if (engineMode === 'client') {
      const res = await apiClient.convertModel(file, cfg, i18n.language, (progress) =>
        setTasks((prev) => upsertTask(prev, progress))
      );
      setActiveTask(res);
      return;
    }
    const initial = await apiClient.convertModel(file, cfg, i18n.language);
    setTasks((prev) => [initial, ...prev]);
    setActiveTask(initial);
    for (;;) {
      await wait(BATCH_POLL_INTERVAL_MS);
      const updated = await apiClient.getTaskStatus(initial.task_id);
      setTasks((prev) => upsertTask(prev, updated));
      if (isFinal(updated)) {
        if (updated.status === 'completed') setActiveTask(updated);
        return;
      }
    }
  };

  const finishSingle = (task: TaskResponse) => {
    if (task.status === 'completed') recordSuccessfulConversion(APP_VERSION);
    onFinished({ showReport: true });
    celebrate(80, 70, 0.6);
  };

  /** Cloud conversion of one file: polls the node until the task finishes. */
  const pollCloudTask = (initial: TaskResponse) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const timer = setInterval(async () => {
      try {
        const updated = await apiClient.getTaskStatus(initial.task_id);
        setActiveTask(updated);
        setTasks((prev) => upsertTask(prev, updated));
        if (!isFinal(updated)) return;
        clearInterval(timer);
        setIsProcessing(false);
        if (updated.status === 'failed' && updated.error?.message) {
          window.alert(t('node.failed', { message: updated.error.message }));
        } else if (updated.status === 'completed') {
          finishSingle(updated);
        }
      } catch (err) {
        console.error('Polling error:', err);
        clearInterval(timer);
        setIsProcessing(false);
        reportNodeError(err);
      }
    }, POLL_INTERVAL_MS);
    pollRef.current = timer;
  };

  /** Starts converting the selected file(s). `configOverride` is used for the free "convert as-is" path. */
  const startConvert = async (configOverride?: ConversionConfig): Promise<void> => {
    const files = selectedFiles.length > 0 ? selectedFiles : selectedFile ? [selectedFile] : [];
    if (files.length === 0) return;
    const cfg = configOverride ?? config;

    // Plan gate: Basic converts mesh formats as-is; repair, CAD, cloud and batch need Pro.
    const needed = requiredFeatureForConvert(files, cfg, engineMode);
    if (needed && !can(needed)) {
      const freeFallback = needed === 'auto_repair' || needed === 'draco';
      requirePro(needed, freeFallback
        ? {
            label: t('plan.secondary_convert_as_is'),
            onClick: () => {
              closePaywall();
              startConvert(toBasicConfig(cfg));
            },
          }
        : null);
      return;
    }

    // Cloud-node guards.
    for (const file of files) {
      if (PROPRIETARY_CAD_EXTS.has(fileExt(file.name)) && engineMode === 'client' && !apiClient.getStoredBackendUrl()) {
        onCadNeedsNode(file);
        return;
      }
      if (engineMode === 'server' && apiClient.isPublicDemoNode() && file.size > PUBLIC_DEMO_MAX_SIZE_BYTES) {
        onPublicNodeLimit(file);
        return;
      }
    }

    setIsProcessing(true);

    if (files.length > 1) {
      try {
        for (const file of files) await convertBatchItem(file, cfg);
        onFinished({ showReport: false });
        celebrate(100, 80, 0.6);
      } catch (err) {
        console.error('Batch conversion error:', err);
        reportNodeError(err);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    const file = files[0];
    try {
      if (engineMode === 'client') {
        const result = await apiClient.convertModel(file, cfg, i18n.language, (progress) => {
          setActiveTask(progress);
          setTasks((prev) => upsertTask(prev, progress));
        });
        setActiveTask(result);
        setIsProcessing(false);
        finishSingle(result);
      } else {
        const initial = await apiClient.convertModel(file, cfg, i18n.language);
        setTasks((prev) => [initial, ...prev]);
        setActiveTask(initial);
        pollCloudTask(initial);
      }
    } catch (err) {
      console.error('Conversion failed:', err);
      setIsProcessing(false);
      reportNodeError(err);
    }
  };

  /** Packs every completed result into one ZIP (Pro). */
  const downloadAllZip = async () => {
    const completed = tasks.filter((task) => task.status === 'completed');
    if (completed.length === 0 || !requirePro('batch')) return;

    setIsDownloadingZip(true);
    try {
      const entries: ZipEntry[] = [];
      for (const task of completed) {
        const baseName = task.filename.substring(0, task.filename.lastIndexOf('.')) || task.filename;
        const resp = await fetch(apiClient.getDownloadUrl(task));
        entries.push({
          filename: `${baseName}_omniseam.${task.target_format}`,
          data: await (await resp.blob()).arrayBuffer(),
        });
      }
      const zip = await ZipPackager.createZip(entries);
      await saveOrShareFile(zip, `OmniSeam3D_Batch_Export_${Date.now()}.zip`);
      celebrate(50, 60, 0.7);
    } catch (err) {
      console.error('ZIP packaging error:', err);
      reportNodeError(err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  /** Removes a task; returns true when it was the one being previewed. */
  const deleteTask = (taskId: string): boolean => {
    setTasks((prev) => prev.filter((task) => task.task_id !== taskId));
    if (activeTask?.task_id !== taskId) return false;
    setActiveTask(null);
    return true;
  };

  const clearTasks = () => {
    setTasks([]);
    setActiveTask(null);
  };

  return {
    tasks,
    activeTask,
    setActiveTask,
    isProcessing,
    isDownloadingZip,
    startConvert,
    downloadAllZip,
    deleteTask,
    clearTasks,
  };
}
