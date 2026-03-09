import type { Playlist } from '@asmr-collections/shared';
import { Image } from '~/components/image';
import { Link } from '~/components/link';
import { Item, ItemContent, ItemDescription, ItemHeader, ItemTitle } from '~/components/ui/item';

interface Props {
  playlist: Playlist
}

export function PlaylistItem({ playlist }: Props) {
  return (
    <Item className="p-0">
      <ItemHeader className="relative aspect-4/3">
        <Link to="/playlists/$id" params={{ id: playlist.id }} title={playlist.name}>
          <Image
            src={playlist.cover || 'placeholder'}
            alt={playlist.name}
            classNames={{ wrapper: 'absolute inset-0 rounded-md' }}
          />
        </Link>
      </ItemHeader>
      <ItemContent>
        <ItemTitle>
          <Link to="/playlists/$id" params={{ id: playlist.id }} title={playlist.name}>
            {playlist.name}
          </Link>
        </ItemTitle>
        <ItemDescription>{playlist.description}</ItemDescription>
      </ItemContent>
    </Item>
  );
}
