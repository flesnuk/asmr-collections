import { useAtomValue } from 'jotai';
import { focusAtom } from 'jotai-optics';
import { withQuery } from '@asmr-collections/shared';

import { DropdownMenuItem } from '~/components/ui/dropdown-menu';

import { useToastMutation } from '~/hooks/use-toast-fetch';
import { settingOptionsAtom } from '~/hooks/use-setting-options';

import { mutateTracks } from '~/lib/mutation';

import { useTranslation } from '~/lib/i18n';

const apiAtom = focusAtom(settingOptionsAtom, optic => optic.prop('asmrone').prop('api'));

export function ClearCacheMenu({ id }: { id: string }) {
  const { t } = useTranslation();

  const [clearTracksAction, m1] = useToastMutation('clear-tracks-cache');
  const api = useAtomValue(apiAtom);

  const isMutating = m1;

  const key = withQuery(`/api/tracks/${id}/cache/clear`, { api });

  const handleClear = () => {
    clearTracksAction({
      key,
      fetchOps: { method: 'POST' },
      toastOps: {
        loading: `${id} ${t('正在清理曲目缓存...')}`,
        success: `${id} ${t('曲目缓存已清理')}`,
        error: `${id} ${t('清理曲目缓存失败')}`,
        finally() {
          mutateTracks(id);
        }
      }
    });
  };

  return (
    <DropdownMenuItem
      title={t('清理获取 tracks 的缓存')}
      disabled={isMutating}
      onClick={handleClear}
    >
      {t('清理缓存')}
    </DropdownMenuItem>
  );
}
