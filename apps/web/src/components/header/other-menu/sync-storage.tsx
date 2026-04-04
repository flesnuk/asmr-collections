import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';

import { BatchLogs } from './batch-logs';

import { CheckIcon, Loader2 } from 'lucide-react';

import { useBatchOperation } from '~/hooks/use-batch-operation';
import { useTranslation } from '~/lib/i18n';

export function SyncStorageDialog({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const {
    copyLogs,
    handleCancel,
    handleOpenChange,
    handleStart,
    isProcessing,
    logs,
    progress
  } = useBatchOperation('create', setOpen, true);

  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        onInteractOutside={e => e.preventDefault()}
        onOpenAutoFocus={e => e.preventDefault()}
        className="rounded-lg max-w-[90%] sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>
            {t('同步音声库')}
          </DialogTitle>
          <DialogDescription>
            {t('将本地的音声作品同步至数据库中')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t('进度')} ({progress.current}/{progress.total})</span>
              <span>{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} className="h-2" />
          </div>

          <BatchLogs isProcessing={isProcessing} logs={logs} onClick={copyLogs} />
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          <div className="flex items-center text-sm text-muted-foreground mr-auto">
            {isProcessing ? <span className="flex items-center gap-2 text-blue-500"><Loader2 className="size-4 animate-spin" />{t('正在运行')}</span>
              : (progress.percent === 100
                ? <span className="flex items-center gap-2 text-green-600"><CheckIcon className="size-4" />{t('同步完成')}</span>
                : <span>{t('等待开始')}</span>
              )}
          </div>
          <div className="flex gap-2">
            {isProcessing ? (
              <Button variant="destructive" onClick={handleCancel}>{t('停止')}</Button>
            ) : (
              <Button onClick={handleStart}>{progress.percent > 0 && progress.percent < 100 ? t('重试') : t('开始同步')}</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
