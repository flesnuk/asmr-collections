import { useState } from 'react';
import { useAtomValue } from 'jotai';

import { hiddenImageAtom } from '~/hooks/use-hidden-image';

import { cn } from '~/lib/utils';

interface ImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'className'> {
  disableHidden?: boolean
  duration?: number
  showLoadingIndicator?: boolean
  classNames?: {
    wrapper?: string
    img?: string
  }
}

function setupImg(img: HTMLImageElement, onLoaded: () => void) {
  if (img.complete)
    onLoaded();
  else
    img.style.opacity = '0';

  function onLoad() {
    img.style.opacity = '1';
    onLoaded();
  }

  img.addEventListener('load', onLoad);

  return () => {
    img.removeEventListener('load', onLoad);
  };
}

export function Image({
  classNames,
  duration = 150,
  disableHidden = false,
  showLoadingIndicator = true,
  ...props
}: ImageProps) {
  const isHiddenImage = useAtomValue(hiddenImageAtom);
  const [isLoading, setIsLoading] = useState(true);

  function onLoaded() {
    setIsLoading(false);
  }

  return (
    <div className={cn('relative overflow-hidden size-full bg-zinc-300 dark:bg-zinc-700', classNames?.wrapper)}>
      {showLoadingIndicator && isLoading && (
        <div className="absolute inset-0 size-full animate-pulse flex items-center justify-center">
          <svg
            className="size-12 text-zinc-400 dark:text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}

      <img
        {...props}
        ref={el => {
          if (el) return setupImg(el, onLoaded);
        }}
        alt={props.alt}
        className={cn(
          'object-cover object-center absolute inset-0 size-full',
          'transition-opacity',
          isHiddenImage && !disableHidden && 'blur-xl',
          classNames?.img
        )}
        style={{
          transitionDuration: `${duration}ms`,
          ...props.style
        }}
      />
    </div>
  );
}
