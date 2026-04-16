import { useAtomValue } from 'jotai';
import { mediaStateAtom } from '~/hooks/use-media-state';

import { PlayerPageActions } from './actions';

import { Time, TimeSlider } from '@vidstack/react';

import { useTranslation } from '~/lib/i18n';

export function PlayerPageMain() {
  const { t } = useTranslation();
  const mediaState = useAtomValue(mediaStateAtom);

  const title = mediaState.currentTrack?.title || t('未知曲目');
  const workTitle = mediaState.work?.name || t('未知作品');



  return (
    <div className="w-full flex flex-col sm:gap-2 gap-6">
      <div id="track-info" className="text-center">
        <div id="track-title" className="font-semibold sm:text-sm line-clamp-2">
          {title}
        </div>
        <div id="work-title" className="mt-2 text-xs opacity-60 line-clamp-2">
          {workTitle}
        </div>
      </div>
      <div id="progress-bar" onPointerDown={e => e.stopPropagation()} className="touch-auto sm:mt-4">
        <TimeSlider.Root className="group relative w-full cursor-pointer touch-none select-none items-center outline-none aria-hidden:hidden before:absolute before:inset-0 before:-top-2 before:-bottom-2 before:content-['']">
          <TimeSlider.Preview offset={5} className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-data-dragging:opacity-100">
            <TimeSlider.Value className="px-2 py-1 bg-background/80 backdrop-blur-sm text-xs rounded-md border border-border/50" />
          </TimeSlider.Preview>
          <TimeSlider.Track className="relative z-0 h-1 w-full rounded-full bg-foreground/20 transition-colors group-data-focus:bg-foreground/25 group-hover:bg-foreground/25">
            <TimeSlider.Progress className="absolute h-full w-(--slider-progress) rounded-sm bg-white/30 will-change-[width]" />
            <TimeSlider.TrackFill className="absolute h-full w-(--slider-fill) rounded-full bg-[linear-gradient(to_right,#f03_80%,#ff2791_100%)] will-change-[width]" />
          </TimeSlider.Track>
          <TimeSlider.Thumb className="absolute left-(--slider-fill) top-1/2 z-20 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(to_right,#f03_80%,#ff2791_100%)] shadow-lg transition-opacity duration-150 group-data-[dragging]:scale-125 group-data-[dragging]:shadow-xl will-change-[left,transform,opacity]" />
        </TimeSlider.Root>
        <div className="flex items-center justify-between text-sm font-medium opacity-60 mt-2">
          <Time className="time" type="current" />
          <Time className="time" type="duration" />
        </div>
      </div>
      <div id="actions" className="flex justify-center items-center">
        <PlayerPageActions />
      </div>

    </div>
  );
}
