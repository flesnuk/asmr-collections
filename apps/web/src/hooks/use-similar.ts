import { useAtomValue } from 'jotai';
import { focusAtom } from 'jotai-optics';
import useSWRImmutable from 'swr/immutable';

import { withQuery } from '@asmr-collections/shared';

import { settingOptionsAtom } from './use-setting-options';

import { notifyError } from '~/utils';

import { fetcher } from '~/lib/fetcher';
import { useTranslation } from '~/lib/i18n';

import type { Work } from '@asmr-collections/shared';

const asmroneOptions = focusAtom(settingOptionsAtom, optic => optic.prop('asmrone'));

export function useSimilar(id: string, exists: boolean) {
  const { t } = useTranslation();
  const options = useAtomValue(asmroneOptions);

  const query = options.recommender ? { api: options.api } : {};
  const key = exists ? withQuery(`/api/work/similar/${id}`, query) : null;

  return useSWRImmutable<Work[]>(key, fetcher, {
    onError: e => notifyError(e, t('获取相似作品失败'), { id: `work-similar-error-${id}` }),
    errorRetryCount: 0
  });
};
