/* eslint-disable @eslint-react/no-array-index-key -- ignore */

import { Image } from '~/components/image';
import { WorkSkeleton } from '~/components/works/skeleton';

import { Skeleton } from '~/components/ui/skeleton';
import { Item, ItemContent, ItemGroup, ItemHeader } from '~/components/ui/item';

export function PlaylistsSkeleton() {
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

export function PlaylistSkeleton() {
  const works = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="mb-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4 gap-4">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-31" />
        </div>
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
        {works.map(key => (
          <WorkSkeleton key={key} />
        ))}
      </div>
    </div>
  );
}
