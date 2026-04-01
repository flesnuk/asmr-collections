import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger } from '~/components/ui/context-menu';

import { FileMusic } from 'lucide-react';
import { useTranslation } from '~/lib/i18n';

import { formatDuration } from '@asmr-collections/shared';

import type { Track } from '@asmr-collections/shared';

interface AudioItemProps {
  track: Track
  onPlay: () => void
  enqueueTrack: (track: Track) => void
  disableEnqueue: boolean
}

export function AudioItem({ disableEnqueue, track, onPlay, enqueueTrack }: AudioItemProps) {
  const { t } = useTranslation();
  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex items-center py-1 w-full cursor-pointer select-none" onClick={onPlay} title={track.title}>
        <FileMusic className="min-size-8 mx-4" color="#4083e7" />
        <div>
          <p className="line-clamp-2">{track.title}</p>
          {track.duration ? <small className="opacity-70">{formatDuration(track.duration)}</small> : null}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>{t('操作')}</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onPlay}>{t('播放')}</ContextMenuItem>
        <ContextMenuItem disabled={disableEnqueue} onClick={() => enqueueTrack(track)}>{t('添加到播放列表')}</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
