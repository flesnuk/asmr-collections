import { FolderPlusIcon } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '~/components/ui/select';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '~/components/ui/dialog';

import { Loading } from '~/components/loading';

import { SettingInput } from './setting-input';

import { toast } from 'sonner';
import { useState } from 'react';
import { match } from 'ts-pattern';
import { useImmer } from 'use-immer';
import { useTranslation } from '~/lib/i18n';

import { useToastMutation } from '~/hooks/use-toast-fetch';

import { STORAGE_TYPES, StorageConfigBodySchema } from '@asmr-collections/shared';
import type { StorageConfigBody, StorageType } from '@asmr-collections/shared';

const getStorageTypeOptionsText = (t: any) => Object
  .values(STORAGE_TYPES)
  .reduce<Record<string, string>>((acc, type) => {
    switch (type) {
      case STORAGE_TYPES.LOCAL:
        acc[type] = t('本地存储');
        break;
      case STORAGE_TYPES.WEBDAV:
        acc[type] = 'WebDAV';
        break;
      default:
        acc[type] = type;
    }
    return acc;
  }, {});

interface StorageDialogCreateProps {
  actionType: 'create'
  data?: StorageConfigBody
  storageId?: never
  mutate: () => void
}

interface StorageDialogEditProps {
  actionType: 'edit'
  data?: StorageConfigBody
  storageId: number
  mutate: () => void
}

type StorageDialogProps = StorageDialogCreateProps | StorageDialogEditProps;

export function StorageDialog({ actionType, data, mutate, storageId }: StorageDialogProps) {
  const { t } = useTranslation();
  const optionsText = getStorageTypeOptionsText(t);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useImmer<StorageConfigBody>(data ?? {
    name: optionsText[STORAGE_TYPES.LOCAL],
    type: STORAGE_TYPES.LOCAL,
    config: {
      path: ''
    }
  });

  const [action, isLoading] = useToastMutation(`storage-${actionType}`);

  function onChange<T extends keyof StorageConfigBody>(field: T, value: StorageConfigBody[T]) {
    setForm(draft => { draft[field] = value as any; });
  }

  function onTypeChange(value: string) {
    const type = value as StorageType;
    setForm(draft => {
      draft.type = type;
      draft.name = optionsText[type];

      match(type)
        .with(STORAGE_TYPES.LOCAL, () => {
          draft.config = { path: '' };
        })
        .with(STORAGE_TYPES.WEBDAV, () => {
          draft.config = {
            path: '/',
            url: '',
            username: '',
            password: ''
          };
        })
        .exhaustive();
    });
  }

  function onSubmit() {
    const result = StorageConfigBodySchema.safeParse(form);

    if (!result.success) {
      const message = result.error.issues.at(0)?.message;
      return toast.error(t('验证失败'), {
        description: message
      });
    }

    action({
      key: actionType === 'edit' ? `/api/storage/${storageId}` : '/api/storage',
      fetchOps: {
        method: actionType === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      },
      toastOps: {
        success() {
          mutate();
          setOpen(false);
          return actionType === 'create' ? t('创建成功') : t('编辑成功');
        },
        error: actionType === 'create' ? t('创建失败') : t('编辑失败')
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {actionType === 'create' ? (<><FolderPlusIcon />{t('添加')}</>) : t('编辑')}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="w-100"
        showCloseButton={false}
        onInteractOutside={e => e.preventDefault()}
      >
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle className="">{actionType === 'create' ? t('添加存储') : t('编辑存储')}</DialogTitle>
          <Select value={form.type} onValueChange={onTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.values(STORAGE_TYPES).map(value => (
                  <SelectItem key={value} value={value} disabled={actionType === 'edit'}>
                    {optionsText[value]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <DialogDescription className="sr-only">{t('添加存储驱动器')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <SettingInput
            id="storage-name"
            name="storage-name"
            placeholder={optionsText[form.type]}
            value={form.name}
            onChange={e => onChange('name', e.target.value)}
          >
            {t('名称')}
          </SettingInput>

          <SettingInput
            id="storage-desc"
            name="storage-desc"
            placeholder={t('Description')}
            value={form.description ?? ''}
            onChange={e => onChange('description', e.target.value)}
          >
            {t('备注')}
          </SettingInput>

          <SettingInput
            id="storage-priority"
            name="storage-priority"
            value={form.priority ?? 0}
            placeholder="/"
            onChange={e => {
              const val = Number.parseInt(e.target.value, 10);
              onChange('priority', Number.isNaN(val) ? 0 : val);
            }}
          >
            {t('优先级')}
          </SettingInput>

          <SettingInput
            id="storage-path"
            name="storage-path"
            value={(form.config as any).path ?? ''}
            placeholder="/"
            required
            onChange={e => onChange('config', {
              ...form.config,
              path: e.target.value
            })}
          >
            {t('路径')}
          </SettingInput>

          {/* WebDAV Config */}

          {form.type === STORAGE_TYPES.WEBDAV && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <SettingInput
                  id="storage-webdav-username"
                  name="storage-webdav-username"
                  value={(form.config as any).username ?? ''}
                  required
                  onChange={e => onChange('config', {
                    ...form.config,
                    username: e.target.value
                  })}
                >
                  {t('用户名')}
                </SettingInput>
                <SettingInput
                  id="storage-webdav-password"
                  name="storage-webdav-password"
                  type="password"
                  value={(form.config as any).password ?? ''}
                  required
                  onChange={e => onChange('config', {
                    ...form.config,
                    password: e.target.value
                  })}
                >
                  {t('密码')}
                </SettingInput>
              </div>

              <SettingInput
                id="storage-webdav-url"
                name="storage-webdav-url"
                value={(form.config as any).url ?? ''}
                required
                onChange={e => onChange('config', {
                  ...form.config,
                  url: e.target.value
                })}
              >
                URL
              </SettingInput>
            </>
          )}
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={isLoading}>{t('返回')}</Button>
          </DialogClose>
          <Button disabled={isLoading} onClick={onSubmit}>
            <Loading isLoading={isLoading} />
            {actionType === 'create' ? t('添加') : t('编辑')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
