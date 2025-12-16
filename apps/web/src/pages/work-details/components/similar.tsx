import { WorkCard } from '~/components/work-card';
import { Carousel, CarouselContent, CarouselItem } from '~/components/ui/carousel';

import { memo, useRef } from 'react';
import { useSimilar } from '~/hooks/use-similar';

import Autoplay from 'embla-carousel-autoplay';

import { cn } from '~/lib/utils';

import type { Work } from '@asmr-collections/shared';

interface SimilarWorksProps {
  work: Work
  exists: boolean | undefined
}

export const SimilarWorks = memo(({ work, exists }: SimilarWorksProps) => {
  const plugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: true }));
  const { data } = useSimilar(work.id, !!exists);

  if (!data || data.length === 0)
    return null;

  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold mb-4">相似作品</h2>
      <Carousel
        opts={{
          align: 'start',
          skipSnaps: true
        }}
        plugins={[plugin.current]}
      >
        <CarouselContent>
          {
            data.map(similarWork => (
              <CarouselItem
                className={cn(
                  'min-w-0 select-none cursor-grab',
                  'flex-[0_0_20%]',
                  'max-[440px]:flex-[0_0_100%]',
                  'max-[650px]:flex-[0_0_50%]',
                  'max-[780px]:flex-[0_0_33%]',
                  'md:flex-[0_0_25%]'
                )}
                key={similarWork.id}
              >
                <WorkCard work={similarWork} showMenus={false} showImageBadge={false} />
              </CarouselItem>
            ))
          }
        </CarouselContent>
      </Carousel>
    </section>
  );
});
