import { Input } from '~/components/ui/input';
import { Loading } from '~/components/loading';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Field, FieldGroup, FieldLabel } from '~/components/ui/field';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';

import { PlusIcon } from 'lucide-react';

import { toast } from 'sonner';
import { useState } from 'react';
import { useToastMutation } from '~/hooks/use-toast-fetch';

import { logger } from '~/lib/logger';
import { useTranslation } from '~/lib/i18n';
import { mutatePlaylist, mutatePlaylists } from '~/lib/mutation';
import { PlaylistUpsertSchema } from '@asmr-collections/shared';

import type { Playlist } from '@asmr-collections/shared';

interface PlaylistDialogProps {
  type: 'create' | 'edit'
  playlist?: Playlist
  trigger?: React.ReactNode
}

// TODO: 加一个 cover 选择栏，选择 work 作为封面
export function PlaylistDialog({ type, playlist, trigger }: PlaylistDialogProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const [action, isLoading] = useToastMutation(`playlist-${type}`);

  const isEdit = type === 'edit';

  const clear = () => {
    setOpen(false);
  };

  const onOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isLoading)
      return;

    setOpen(nextOpen);

    if (!nextOpen) clear();
  };

  const submitAction = (formData: FormData) => {
    const validationData = PlaylistUpsertSchema.safeParse({
      name: formData.get('name'),
      description: formData.get('description'),
      works: formData.get('works')
    });

    if (!validationData.success) {
      toast.error(t('表单验证失败，请检查输入'));
      return logger.error(validationData.error);
    }

    const { validIds, isValid } = validationData.data.works;

    const desc = isValid ? `${t('尝试导入')} ${validIds.length} ${t('个作品')}` : undefined;

    if (isEdit) {
      if (!playlist) {
        toast.error(t('缺少播放列表信息'));
        return;
      }

      action({
        key: `/api/playlist/${playlist.id}`,
        fetchOps: {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(validationData.data)
        },
        toastOps: {
          loading: t('更新中...'),
          success: t('更新成功'),
          error: t('更新失败'),
          description: desc,
          finally() {
            clear();
            mutatePlaylist(playlist.id);
          }
        }
      });

      return;
    }

    action({
      key: '/api/playlist',
      fetchOps: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validationData.data)
      },
      toastOps: {
        loading: t('创建中...'),
        success: t('创建成功'),
        error: t('创建失败'),
        description: desc,
        finally() {
          clear();
          mutatePlaylists();
        }
      }
    });
  };

  let triggerNode = <Button variant="secondary">{t('编辑')}</Button>;

  if (!isEdit) {
    triggerNode = (
      <Button variant="secondary">
        <PlusIcon />
        {t('创建')}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? triggerNode}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('编辑播放列表') : t('创建播放列表')}</DialogTitle>
          <DialogDescription className="sr-only" />
        </DialogHeader>
        <form id="playlist-dialog-form" action={submitAction}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="playlist-name">{t('名称')}</FieldLabel>
              <Input id="playlist-name" placeholder={t('请输入名称')} name="name" required defaultValue={playlist?.name} />
            </Field>
            <Field>
              <FieldLabel htmlFor="playlist-description">{t('描述')}</FieldLabel>
              <Textarea id="playlist-description" placeholder={t('请输入描述')} name="description" defaultValue={playlist?.description ?? undefined} />
            </Field>
            <Field>
              <FieldLabel htmlFor="playlist-import">{t('导入作品')}</FieldLabel>
              <Textarea className="resize-none max-h-42" id="playlist-import" placeholder={t('请输入作品 ID，将自动识别导入')} name="works" />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild disabled={isLoading}>
            <Button variant="outline">{t('返回')}</Button>
          </DialogClose>
          <Button type="submit" form="playlist-dialog-form" disabled={isLoading}>
            <Loading isLoading={isLoading} />
            {isEdit ? t('更新') : t('创建')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
