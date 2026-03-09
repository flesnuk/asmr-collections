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

// TODO: 导入作品
export function PlaylistDialog() {
  const [open, setOpen] = useState(false);
  const [action, isLoading] = useToastMutation('playlist-create');

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <PlusIcon />
          创建
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>创建播放列表</DialogTitle>
          <DialogDescription className="sr-only" />
        </DialogHeader>
        <form id="playlist-create-form" action={submitAction}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="playlist-name">名称</FieldLabel>
              <Input id="playlist-name" placeholder="请输入名称" name="name" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="playlist-description">描述</FieldLabel>
              <Input id="playlist-description" placeholder="请输入描述" name="description" />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild disabled={isLoading}>
            <Button variant="outline">返回</Button>
          </DialogClose>
          <Button type="submit" form="playlist-create-form" disabled={isLoading}>
            <Loading isLoading={isLoading} />
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
