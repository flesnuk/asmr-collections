import { useToastMutation } from '~/hooks/use-toast-fetch';

import { DropdownMenuItem } from '~/components/ui/dropdown-menu';

import { mutateSimilar, mutateWorkInfo } from '~/lib/mutation';

import { useTranslation } from '~/lib/i18n';

export function UpdateMenu({ id }: { id: string }) {
  const { t } = useTranslation();

  const [updateAction, updateIsMutating] = useToastMutation('update');

  const update = () => {
    updateAction({
      key: `/api/work/update/${id}`,
      fetchOps: { method: 'PUT' },
      toastOps: {
        loading: `${id} ${t('数据更新中')}...`,
        success: `${id} ${t('数据更新成功')}`,
        error: `${id} ${t('数据更新失败')}`,
        finally() {
          mutateWorkInfo(id);
        }
      }
    });
  };

  const updateVector = () => {
    updateAction({
      key: `/api/work/update/embedding/${id}`,
      fetchOps: { method: 'PUT' },
      toastOps: {
        loading: `${id} ${t('向量信息更新中...')}`,
        success: `${id} ${t('向量信息更新成功')}`,
        error: `${id} ${t('向量信息更新失败')}`,
        finally() {
          mutateSimilar(id);
        }
      }
    });
  };

  return (
    <>
      <DropdownMenuItem disabled={updateIsMutating} onClick={update}>
        {t('更新信息')}
      </DropdownMenuItem>
      <DropdownMenuItem disabled={updateIsMutating} onClick={updateVector}>
        {t('更新向量')}
      </DropdownMenuItem>
    </>
  );
}
