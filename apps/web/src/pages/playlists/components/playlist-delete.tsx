import { Loading } from '~/components/loading';
import { Button } from '~/components/ui/button';
import { confirm } from '~/components/ui/confirmer';

import { useNavigate } from '@tanstack/react-router';
import { useToastMutation } from '~/hooks/use-toast-fetch';
import { useTranslation } from '~/lib/i18n';

interface Props {
  id: string
}

export function PlaylistDelete({ id }: Props) {
  const { t } = useTranslation();
  const [action, isLoading] = useToastMutation('playlist-delete');

  const navigate = useNavigate();

  const onDelete = async () => {
    const yes = await confirm({
      title: t('确定要删除这个播放列表吗？'),
      description: t('删除后将无法恢复'),
      ActionProps: {
        variant: 'destructive'
      }
    });

    if (!yes) return;

    action({
      key: `/api/playlist/${id}`,
      fetchOps: {
        method: 'DELETE'
      },
      toastOps: {
        loading: t('删除中...'),
        success() {
          navigate({ to: '/playlists' });
          return t('删除成功');
        },
        error: t('删除失败')
      }
    });
  };

  return (
    <Button variant="destructive" onClick={onDelete} disabled={isLoading}>
      <Loading isLoading={isLoading} />
      {t('删除')}
    </Button>
  );
}
