import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';

import { CheckIcon, Loader2 } from 'lucide-react';

import { WorkInput } from '~/components/work-input';

import { BatchLogs } from './batch-logs';

import { useBatchOperation } from '~/hooks/use-batch-operation';
import { useTranslation } from '~/lib/i18n';

export function BatchAddDialog({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const {
    copyLogs,
    handleCancel,
    handleOpenChange,
    handleStart,
    isProcessing,
    logs,
    progress,
    createIds,
    setCreateIds
  } = useBatchOperation('create', setOpen);

  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        onInteractOutside={e => e.preventDefault()}
        className="rounded-lg max-w-[90%] sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>
            {t('批量添加收藏信息')}
          </DialogTitle>
          <DialogDescription>
            {t('从 DLsite 添加作品')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <WorkInput
            initialTip={t('自动捕获符合格式的 ID')}
            value={createIds}
            onValueChange={setCreateIds}
          />

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
                ? <span className="flex items-center gap-2 text-green-600"><CheckIcon className="size-4" />{t('添加完成')}</span>
                : <span>{t('等待开始')}</span>
              )}
          </div>
          <div className="flex gap-2">
            {isProcessing ? (
              <Button variant="destructive" onClick={handleCancel}>{t('停止')}</Button>
            ) : (
              <Button onClick={handleStart}>{progress.percent > 0 && progress.percent < 100 ? t('重试') : t('开始添加')}</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
