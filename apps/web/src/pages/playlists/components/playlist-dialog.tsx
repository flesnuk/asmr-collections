import { Input } from '~/components/ui/input';
import { Loading } from '~/components/loading';
import { Button } from '~/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '~/components/ui/field';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';

import { PlusIcon } from 'lucide-react';

import { toast } from 'sonner';
import { useState } from 'react';
import { useToastMutation } from '~/hooks/use-toast-fetch';

import { logger } from '~/lib/logger';
import { mutatePlaylists } from '~/lib/mutation';
import { PlaylistUpsertSchema } from '@asmr-collections/shared';

import type { Playlist } from '@asmr-collections/shared';

interface PlaylistDialogProps {
  type: 'create' | 'edit'
  playlist?: Playlist
}

// TODO: 导入作品
export function PlaylistDialog({ type, playlist }: PlaylistDialogProps) {
  const [open, setOpen] = useState(false);
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
      description: formData.get('description')
    });

    if (!validationData.success) {
      toast.error('表单验证失败，请检查输入');
      return logger.error(validationData.error);
    }

    if (isEdit) {
      if (!playlist) {
        toast.error('缺少播放列表信息');
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
          loading: '更新中...',
          success: '更新成功',
          error: '更新失败',
          finally() {
            clear();
            mutatePlaylists();
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
        loading: '创建中...',
        success: '创建成功',
        error: '创建失败',
        finally() {
          clear();
          mutatePlaylists();
        }
      }
    });
  };

  let trigger = <Button variant="secondary">编辑</Button>;

  if (!isEdit) {
    trigger = (
      <Button variant="secondary">
        <PlusIcon />
        创建
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑播放列表' : '创建播放列表'}</DialogTitle>
          <DialogDescription className="sr-only" />
        </DialogHeader>
        <form id="playlist-dialog-form" action={submitAction}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="playlist-name">名称</FieldLabel>
              <Input id="playlist-name" placeholder="请输入名称" name="name" required defaultValue={playlist?.name} />
            </Field>
            <Field>
              <FieldLabel htmlFor="playlist-description">描述</FieldLabel>
              <Input id="playlist-description" placeholder="请输入描述" name="description" defaultValue={playlist?.description ?? undefined} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild disabled={isLoading}>
            <Button variant="outline">返回</Button>
          </DialogClose>
          <Button type="submit" form="playlist-dialog-form" disabled={isLoading}>
            <Loading isLoading={isLoading} />
            {isEdit ? '更新' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
