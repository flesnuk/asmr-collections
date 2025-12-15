import { useAtomValue } from 'jotai';
import { hiddenImageAtom } from '~/hooks/use-hidden-image';
import { cn } from '~/lib/utils';

interface ImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'className'> {
  disableHidden?: boolean
  duration?: number
  classNames?: {
    wrapper?: string
    img?: string
  }
}

function setupImg(img: HTMLImageElement) {
  if (!img.complete)
    img.style.opacity = '0';

  function onLoad() {
    img.style.opacity = '1';
  }

  img.addEventListener('load', onLoad);

  return () => {
    img.removeEventListener('load', onLoad);
  };
}

export default function Image({
  classNames,
  duration = 150,
  disableHidden = false,
  ...props
}: ImageProps) {
  const isHiddenImage = useAtomValue(hiddenImageAtom);

  return (
    <div className={cn('relative overflow-hidden size-full bg-zinc-300 dark:bg-zinc-700', classNames?.wrapper)}>
      <img
        {...props}
        ref={setupImg}
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
