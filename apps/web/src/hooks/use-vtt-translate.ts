import { toast } from 'sonner';
import { match } from 'ts-pattern';
import { useImmer } from 'use-immer';
import { useCallback, useRef, useState } from 'react';

import { logger } from '~/lib/logger';
import { fetcher } from '~/lib/fetcher';
import { notifyError } from '~/utils';
import { useTranslation } from '~/lib/i18n';
import { mutateWorkInfo } from '~/lib/mutation';

import type { BatchLogType, BatchSSEData, BatchSSEEvent } from '@asmr-collections/shared';

// ── Types ────────────────────────────────────────────────────────────────────

interface AsmrOneTrackItem {
  type: 'folder' | 'audio' | 'image' | 'text' | 'other';
  title: string;
  children?: AsmrOneTrackItem[];
  mediaStreamUrl?: string;
  mediaDownloadUrl?: string;
}

interface ResolveResult {
  sourceId: string;
  lang: string;
  title: string;
  tracks: AsmrOneTrackItem[];
}

export type VttPhase = 'idle' | 'resolving' | 'select-folder' | 'translating' | 'done' | 'error';

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useVttTranslate(workId: string) {
  const { t } = useTranslation();

  const [phase, setPhase] = useState<VttPhase>('idle');
  const [resolveData, setResolveData] = useState<ResolveResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useImmer<Array<{ id: string; type: BatchLogType; message: string }>>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [errorMessage, setErrorMessage] = useState('');

  const eventSourceRef = useRef<EventSource | null>(null);
  const toastIdRef = useRef<string | number>('vtt-translate-toast');

  // ── Step 1: Resolve Chinese edition ──────────────────────────────────────

  const resolve = useCallback(async () => {
    setPhase('resolving');
    setLogs([]);
    setProgress({ current: 0, total: 0, percent: 0 });
    setErrorMessage('');

    try {
      const data = await fetcher<ResolveResult>('/api/subtitles/vtt-translate/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId })
      });

      setResolveData(data);
      setPhase('select-folder');
      toast.success(`${t('找到中文版本')}: ${data.title}`);
    } catch (err) {
      setPhase('error');
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      notifyError(err, t('获取中文版本失败'));
    }
  }, [workId, setLogs, t]);

  // ── Step 2: Start translation SSE ────────────────────────────────────────

  const startTranslation = useCallback((folderPath: string[]) => {
    if (isProcessing || !resolveData) return;

    setPhase('translating');
    setIsProcessing(true);
    setLogs([]);
    setProgress({ current: 0, total: 0, percent: 0 });
    toastIdRef.current = toast.loading(t('正在建立 SSE 连接...'));

    const params = new URLSearchParams({
      sourceId: resolveData.sourceId,
      folder: JSON.stringify(folderPath),
      workId
    });

    const es = new EventSource(`/api/subtitles/vtt-translate/translate?${params.toString()}`);
    eventSourceRef.current = es;

    const handleEvent = (id: string, event: BatchSSEEvent, data: string) => {
      if (!data) return;

      let parsedData: unknown;
      try {
        parsedData = JSON.parse(data);
      } catch {
        logger.error('VTT SSE data parse failed');
        return;
      }

      match({ id, event, data: parsedData } as BatchSSEData)
        .with({ event: 'start' }, ({ data }) => {
          const { total, message } = data;
          setProgress({ current: 0, total, percent: 0 });
          toast.info(message, { id: toastIdRef.current });
        })
        .with({ event: 'progress' }, ({ data }) => {
          setProgress(data);
        })
        .with({ event: 'log' }, ({ id, data }) => {
          const { type, message } = data;
          setLogs(p => {
            p.push({ id, type, message });
          });
        })
        .with({ event: 'end' }, ({ data }) => {
          setIsProcessing(false);
          setPhase('done');
          const { message } = data;
          toast.success(message, { id: toastIdRef.current });
          mutateWorkInfo(workId);
        })
        .with({ event: 'error' }, ({ data }) => {
          toast.error(`${t('操作失败')}: ${data.message}`, {
            id: toastIdRef.current,
            description: data.details
          });
        })
        .exhaustive();
    };

    es.addEventListener('open', () => {
      toast.success(t('SSE 连接已建立'), { id: toastIdRef.current });
    });

    es.addEventListener('start', e => handleEvent(e.lastEventId, 'start', e.data));
    es.addEventListener('progress', e => handleEvent(e.lastEventId, 'progress', e.data));
    es.addEventListener('log', e => handleEvent(e.lastEventId, 'log', e.data));
    es.addEventListener('ping', () => {}); // Ignore keepalive ping
    es.addEventListener('end', e => {
      handleEvent(e.lastEventId, 'end', e.data);
      es.close();
    });

    es.addEventListener('error', e => {
      setIsProcessing(false);

      if ('data' in e && typeof e.data === 'string') {
        handleEvent('error', 'error', e.data);
        return es.close();
      }

      toast.error(t('SSE 连接错误'), { id: toastIdRef.current });
      es.close();
    });
  }, [isProcessing, resolveData, workId, setLogs, t]);

  // ── Cancel ───────────────────────────────────────────────────────────────

  const cancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setLogs(p => {
        p.push({ id: Date.now().toString(), type: 'warning', message: t('操作已被用户取消') });
      });
      toast.info(t('已停止'), {
        description: t('操作已被用户取消'),
        id: toastIdRef.current
      });
    }
    setIsProcessing(false);
  }, [setLogs, t]);

  // ── Reset ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setPhase('idle');
    setResolveData(null);
    setIsProcessing(false);
    setLogs([]);
    setProgress({ current: 0, total: 0, percent: 0 });
    setErrorMessage('');
  }, [setLogs]);

  return {
    phase,
    resolveData,
    isProcessing,
    logs,
    progress,
    errorMessage,
    resolve,
    startTranslation,
    cancel,
    reset
  };
}
