import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger } from '~/components/ui/context-menu';

import { Link } from '~/components/link';

import { FolderClosed } from 'lucide-react';
import { useTranslation } from '~/lib/i18n';

import type { Track, Tracks } from '@asmr-collections/shared';

interface FolderItemProps {
  searchPath: string[] | undefined
  track: Track
  enqueueTracks: (tracks: Tracks | undefined) => void
  disabled: boolean
}

export function FolderItem({ searchPath, track, enqueueTracks, disabled }: FolderItemProps) {
  const { t } = useTranslation();
  return (
    <ContextMenu>
      <ContextMenuTrigger title={track.title} asChild>
        <Link
          from="/work-details/$id"
          search={{ path: (searchPath ?? []).concat(track.title) }}
          className="flex items-center py-1"
        >
          <FolderClosed className="shrink-0 size-8 mx-4" color="#56CBFC" />
          <div>
            <p className="line-clamp-2">{track.title}</p>
            <small className="opacity-70">{track.children?.length ?? 0} {t('项目')}</small>
          </div>
        </Link>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>{t('操作')}</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={disabled} onClick={() => enqueueTracks(track.children)}>
          {t('添加到播放列表')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
