import { confirm } from '~/components/ui/confirmer';
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from '~/components/ui/dropdown-menu';

import { PlaylistSubMenu, SubtitlesSubMenu } from '~/components/work-card/menu';

import { UpdateMenu } from './update';
import { ClearCacheMenu } from './clear-cache';

import { match } from 'ts-pattern';

import { useWorkInfo } from '~/hooks/use-work-info';
import { useToastMutation } from '~/hooks/use-toast-fetch';

import { mutateSimilar, mutateWorkInfo } from '~/lib/mutation';
import { useTranslation } from '~/lib/i18n';

export function MenuActions({ id}: { id: string }) {
  const { t } = useTranslation();
  const [createAction, createIsMutating] = useToastMutation<{ message?: string }>('create');
  const [deleteAction, deleteIsMutating] = useToastMutation('delete');

  const { data } = useWorkInfo(id, { suspense: true });

  const handleDelete = async () => {
    const yes = await confirm({
      title: t('确定要删除收藏吗?'),
      description: t('认真考虑哦')
    });
    if (!yes) return;

    deleteAction({
      key: `/api/work/delete/${id}`,
      fetchOps: { method: 'DELETE' },
      toastOps: {
        loading: `${id} ${t('删除中...')}`,
        success: `${id} ${t('删除成功')}`,
        error: `${id} ${t('删除失败')}`,
        finally() {
          mutateWorkInfo(id);
        }
      }
    });
  };

  const handleCreate = () => {
    createAction({
      key: `/api/work/create/${id}`,
      fetchOps: { method: 'POST' },
      toastOps: {
        loading: `${id} ${t('添加中...')}`,
        success() {
          return `${id} ${t('添加成功')}`;
        },
        description(data) {
          return data.message;
        },
        error: `${id} ${t('添加失败')}`,
        finally() {
          mutateWorkInfo(id);
          mutateSimilar(id);
        }
      }
    });
  };
  return (
    <DropdownMenuGroup>
      {
        match(data?.exists)
          .with(true, () => (
            <>
              <UpdateMenu id={id} />
              <ClearCacheMenu id={id} />
              <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={deleteIsMutating}>
                {t('删除作品')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <SubtitlesSubMenu id={id} existsSubtitles />
              <PlaylistSubMenu workId={id} />
            </>
          ))
          .with(false, () => (
            <DropdownMenuItem onClick={handleCreate} disabled={createIsMutating}>
              {t('添加作品')}
            </DropdownMenuItem>
          ))
          .otherwise(() => <DropdownMenuItem disabled>{t('菜单项加载失败')}</DropdownMenuItem>)
      }
    </DropdownMenuGroup>
  );
}
