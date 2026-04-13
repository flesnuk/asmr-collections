import { useState, useMemo, useCallback } from 'react';
import { match } from 'ts-pattern';
import { motion } from 'framer-motion';

import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { Checkbox } from '~/components/ui/checkbox';
import { Label } from '~/components/ui/label';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

import { CheckIcon, ChevronRightIcon, FolderIcon, FileTextIcon, Loader2, ArrowLeftIcon } from 'lucide-react';

import { BatchLogs } from '../other-menu/batch-logs';

import { useVttTranslate } from '~/hooks/use-vtt-translate';
import { usePreventAutoFocus } from '~/hooks/use-prevent-auto-focus';
import { useTranslation } from '~/lib/i18n';

// ── Track tree item type (matches server response) ───────────────────────────

interface TrackItem {
  type: 'folder' | 'audio' | 'image' | 'text' | 'other';
  title: string;
  children?: TrackItem[];
}

// ── Helper: count VTT files in a folder ──────────────────────────────────────

function getSubCounts(items: TrackItem[]): { vtt: number; lrc: number } {
  let vtt = 0;
  let lrc = 0;
  for (const item of items) {
    if (item.type === 'text') {
      if (item.title.toLowerCase().endsWith('.vtt')) vtt++;
      else if (item.title.toLowerCase().endsWith('.lrc')) lrc++;
    }
  }
  return { vtt, lrc };
}

// ── Folder browser component ─────────────────────────────────────────────────

function FolderBrowser({
  tracks,
  onSelect
}: {
  tracks: TrackItem[];
  onSelect: (path: string[]) => void;
}) {
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  const currentItems = useMemo(() => {
    let items = tracks;
    for (const segment of currentPath) {
      const folder = items.find(i => i.type === 'folder' && i.title === segment);
      if (!folder?.children) return [];
      items = folder.children;
    }
    return items;
  }, [tracks, currentPath]);

  const folders = useMemo(
    () => currentItems.filter(i => i.type === 'folder'),
    [currentItems]
  );

  const subCounts = useMemo(
    () => getSubCounts(currentItems),
    [currentItems]
  );
  const totalSubs = subCounts.vtt + subCounts.lrc;

  const goBack = useCallback(() => {
    setCurrentPath(p => p.slice(0, -1));
  }, []);

  const enterFolder = useCallback((name: string) => {
    setCurrentPath(p => [...p, name]);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium">{t('路径')}:</span>
        <span className="font-mono text-xs">
          /{currentPath.join('/')}
        </span>
      </div>

      <ScrollArea className="h-60 border rounded-md">
        <div className="p-2 space-y-1">
          {currentPath.length > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted/60 transition-colors text-sm text-left"
            >
              <ArrowLeftIcon className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">..</span>
            </button>
          )}

          {folders.map(folder => {
            const childCounts = folder.children ? getSubCounts(folder.children) : { vtt: 0, lrc: 0 };
            const childTotal = childCounts.vtt + childCounts.lrc;
            const label = childCounts.lrc > 0 && childCounts.vtt > 0 ? 'VTT+LRC' : childCounts.lrc > 0 ? 'LRC' : 'VTT';
            
            return (
              <button
                key={folder.title}
                type="button"
                onClick={() => enterFolder(folder.title)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted/60 transition-colors text-sm text-left group"
              >
                <FolderIcon className="size-4 text-amber-500 shrink-0" />
                <span className="flex-1 truncate">{folder.title}</span>
                {childTotal > 0 && (
                  <span className="text-xs text-emerald-500 font-medium">{childTotal} {label}</span>
                )}
                <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}

          {currentItems.filter(i => i.type === 'text' && (i.title.toLowerCase().endsWith('.vtt') || i.title.toLowerCase().endsWith('.lrc'))).map(file => (
            <div
              key={file.title}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground"
            >
              <FileTextIcon className="size-4 text-blue-400 shrink-0" />
              <span className="truncate">{file.title}</span>
            </div>
          ))}

          {folders.length === 0 && totalSubs === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              {t('无结果')}
            </div>
          )}
        </div>
      </ScrollArea>

      {totalSubs > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            {totalSubs} {subCounts.lrc > 0 && subCounts.vtt > 0 ? 'VTT+LRC' : subCounts.lrc > 0 ? 'LRC' : 'VTT'} {t('文件在此文件夹')}
          </span>
          <Button onClick={() => onSelect(currentPath)} size="sm">
            {t('选择此文件夹')}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ── Main dialog ──────────────────────────────────────────────────────────────

export function VttTranslateDialog({
  open,
  setOpen,
  workId
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  workId: string;
}) {
  const { t } = useTranslation();
  const prevent = usePreventAutoFocus();

  const {
    phase,
    resolveData,
    isProcessing,
    logs,
    progress,
    errorMessage,
    useLocal,
    setUseLocal,
    sourceLang,
    setSourceLang,
    resolve,
    startTranslation,
    cancel,
    reset
  } = useVttTranslate(workId);

  const handleOpenChange = (val: boolean) => {
    if (!val && isProcessing) {
      return;
    }
    if (!val) {
      reset();
    }
    setOpen(val);
  };

  const handleStart = () => {
    resolve();
  };

  const copyLogs = () => {
    const errorData = logs.filter(({ type }) => type === 'error' || type === 'warning');
    if (errorData.length > 0) {
      navigator.clipboard.writeText(JSON.stringify(errorData, null, 2));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        {...prevent}
        onInteractOutside={e => e.preventDefault()}
        className="rounded-lg max-w-[90%] sm:max-w-4xl"
      >
        <DialogHeader>
          <DialogTitle>
            {t('从 ASMR.ONE 获取 VTT')}
          </DialogTitle>
          <DialogDescription>
            {match(phase)
              .with('idle', () => t('下载中文字幕并翻译为英文'))
              .with('resolving', () => t('正在查找中文版本...'))
              .with('select-folder', () => `${resolveData?.title ?? ''} — ${t('选择包含 VTT 的文件夹')}`)
              .with('translating', () => t('正在下载和翻译 VTT 文件...'))
              .with('done', () => t('翻译完成'))
              .with('error', () => errorMessage || t('操作失败'))
              .exhaustive()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Phase: idle → show start button */}
          {phase === 'idle' && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                {t('将从 ASMR.ONE 下载中文 VTT 字幕，翻译为英文，然后上传到数据库')}
              </p>

              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="use-local-api"
                    checked={useLocal}
                    onCheckedChange={(checked) => setUseLocal(checked === true)}
                  />
                  <Label htmlFor="use-local-api" className="text-sm cursor-pointer">
                    {t('使用本地 API')}
                  </Label>
                </div>

                {useLocal && (
                  <Select value={sourceLang} onValueChange={setSourceLang}>
                    <SelectTrigger className="w-[180px]" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simplified-chinese">{t('简体中文')}</SelectItem>
                      <SelectItem value="traditional-chinese">{t('繁體中文')}</SelectItem>
                      <SelectItem value="japanese">{t('日本語')}</SelectItem>
                      <SelectItem value="korean">{t('한국어')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button onClick={handleStart}>
                {t('开始')}
              </Button>
            </div>
          )}

          {/* Phase: resolving → loading */}
          {phase === 'resolving' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">{t('正在查找中文版本...')}</span>
            </div>
          )}

          {/* Phase: select-folder → folder browser */}
          {phase === 'select-folder' && resolveData && (
            <FolderBrowser
              tracks={resolveData.tracks}
              onSelect={startTranslation}
            />
          )}

          {/* Phase: translating / done → progress + logs */}
          {(phase === 'translating' || phase === 'done') && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t('进度')} ({progress.current}/{progress.total})</span>
                  <span>{progress.percent}%</span>
                </div>
                <Progress value={progress.percent} className="h-2" />
              </div>

              <BatchLogs isProcessing={isProcessing} logs={logs} onClick={copyLogs} />
            </>
          )}

          {/* Phase: error → show error and retry */}
          {phase === 'error' && (
            <div className="text-center py-6">
              <p className="text-sm text-red-500 mb-4">{errorMessage}</p>
              <Button onClick={handleStart} variant="outline">
                {t('重试')}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          <div className="flex items-center text-sm text-muted-foreground mr-auto">
            {match(phase)
              .with('translating', () => (
                <span className="flex items-center gap-2 text-blue-500">
                  <Loader2 className="size-4 animate-spin" />{t('正在运行')}
                </span>
              ))
              .with('done', () => (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckIcon className="size-4" />{t('翻译完成')}
                </span>
              ))
              .otherwise(() => (
                <span>{t('等待开始')}</span>
              ))}
          </div>
          <div className="flex gap-2">
            {isProcessing && (
              <Button variant="destructive" onClick={cancel}>{t('停止')}</Button>
            )}
            {phase === 'done' && (
              <Button onClick={() => handleOpenChange(false)}>{t('关闭')}</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
