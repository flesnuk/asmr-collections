import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import useSWRImmutable from 'swr/immutable';

import { HTTPError, withQuery } from '@asmr-collections/shared';

import { settingOptionsAtom } from './use-setting-options';
import { findSmartPath, notifyError } from '~/utils';

import { logger } from '~/lib/logger';
import { fetcher } from '~/lib/fetcher';
import { useTranslation } from '~/lib/i18n';

import type { Tracks, TracksResponse, SubtitleInfo } from '@asmr-collections/shared';

export type TracksData =
  {
    error: Error
    data?: undefined
    trackStorage?: undefined
    externalSubtitles?: undefined
  } | {
    data: Tracks
    trackStorage?: TracksResponse['storage']
    error?: undefined
    externalSubtitles?: SubtitleInfo[]
  } | null;

interface InternalResult { data: Tracks, trackStorage?: TracksResponse['storage'] }

// eslint-disable-next-line sukka/bool-param-default -- Need to distinguish undefined
export function useWorkDetailsTracks(id: string, smartNavigate: (path: string[]) => void, hasSubtitles?: boolean, searchPath?: string[]) {
  const { t } = useTranslation();
  const settings = useAtomValue(settingOptionsAtom);
  const storage = settings.storage;

  const hasSmartNavigated = useRef(false);

  useEffect(() => {
    hasSmartNavigated.current = false;
  }, [id]);

  function getQuery(provider: 'asmrone' | 'local') {
    if (provider === 'asmrone') {
      return {
        provider: 'asmrone',
        api: settings.asmrone.api
      };
    }
    return {};
  }

  const fetchFn = async (): Promise<TracksData> => {
    let result: InternalResult | null = null;
    let error: unknown | null = null;

    const tryStorage = async (): Promise<InternalResult | null> => {
      if (!storage.enabled) return null;
      try {
        const key = withQuery(`/api/tracks/${id}`, getQuery('local'));
        const data = await fetcher<TracksResponse>(key);
        return { data: data.tracks, trackStorage: data.storage };
      } catch (e) {
        if (e instanceof HTTPError && e.status === 404)
          return null;

        throw e;
      }
    };

    const tryOne = async (): Promise<InternalResult> => {
      const key = withQuery(`/api/tracks/${id}`, getQuery('asmrone'));
      const tracks = await fetcher<Tracks>(key);
      return {
        data: tracks,
        trackStorage: { type: 'asmrone', name: 'ASMR.ONE' }
      };
    };

    if (settings.asmrone.priority) {
      try {
        result = await tryOne();
      } catch (e) {
        logger.warn(e, '优先 ASMR.ONE 获取音频数据失败，回退本地存储');

        try {
          const data = await tryStorage();
          if (data) result = data;
        } catch (e) {
          error = e;
        }

        if (!result && !error) error = e;
      }
    } else {
      try {
        const data = await tryStorage();
        if (data) result = data;
      } catch (e) {
        logger.error(e, '获取本地音频数据失败');
        error = e;
      }

      if (!result && (storage.fallbackToAsmrOneApi || !storage.enabled)) {
        try {
          result = await tryOne();
          error = null;
        } catch (e) {
          logger.error(e, '获取 ASMR.ONE 音频数据失败');
          error = e;
        }
      }
    }

    if (!result) {
      if (error) return { error: new Error(t('获取音频数据失败'), { cause: error }) };

      return null;
    }

    const tracksData = {
      data: result.data,
      trackStorage: result.trackStorage
    };

    if (hasSubtitles) {
      try {
        const response = await fetch(`/api/subtitles/${id}`);
        const externalSubtitles: SubtitleInfo[] = await response.json();

        return { ...tracksData, externalSubtitles };
      } catch (e) {
        logger.error(e, '尝试加载数据库字幕失败');
        notifyError(e, t('尝试加载数据库字幕失败'));
        return tracksData;
      }
    }

    return tracksData;
  };

  const key = hasSubtitles === undefined
    ? null
    : [`work-tracks-${id}`, storage.enabled, storage.fallbackToAsmrOneApi, settings.asmrone.priority, hasSubtitles];

  const swr = useSWRImmutable<TracksData>(key, fetchFn);

  useEffect(() => {
    if (!swr.data) return;

    if (swr.data.error) {
      notifyError(swr.data.error.cause, swr.data.error.message, { id: `work-tracks-error-${id}` });
    }

    if (
      settings.smartPath.enabled
      && !searchPath
      && !hasSmartNavigated.current
      && swr.data.data
    ) {
      hasSmartNavigated.current = true;
      const targetPath = findSmartPath(swr.data.data, settings.smartPath.pattern);

      if (targetPath && targetPath.length > 0)
        smartNavigate(targetPath);
    }
  }, [id, searchPath, settings.smartPath.enabled, settings.smartPath.pattern, smartNavigate, swr.data]);

  return swr;
}
