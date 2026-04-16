import { AnimatePresence, motion } from 'framer-motion';

import { useActiveCue } from '../../hooks/use-active-cue';
import { cn } from '~/lib/utils';

export function InlineCaptions() {
  const { activeCue, textTrackState } = useActiveCue();

  if (!textTrackState) return null;

  return (
    <div
      id="inline-captions"
      className={cn(
        'w-full h-[4.5rem] sm:h-14 flex items-center justify-center',
        'px-3 py-2'
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={activeCue?.text || 'empty'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn(
            'text-center text-pretty leading-snug m-0',
            'text-lg sm:text-base font-medium',
            'text-blue-500 dark:text-blue-400'
          )}
        >
          {activeCue?.text || ''}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
