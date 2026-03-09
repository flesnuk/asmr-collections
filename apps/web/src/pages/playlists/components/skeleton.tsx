/* eslint-disable @eslint-react/no-array-index-key -- ignore */

import { Image } from '~/components/image';

import { Skeleton } from '~/components/ui/skeleton';
import { Item, ItemContent, ItemGroup, ItemHeader } from '~/components/ui/item';

export function PlaylistSkeleton() {
  return (
    <ItemGroup className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-4">
      {Array.from({ length: 12 }).map((_, index) => (
        <Item key={index}>
          <ItemHeader>
            <Image
              alt="cover"
              classNames={{ wrapper: 'aspect-4/3 rounded-md' }}
            />
          </ItemHeader>
          <ItemContent>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}
