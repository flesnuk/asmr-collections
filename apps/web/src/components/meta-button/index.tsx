import { match } from 'ts-pattern';
import { Button } from '../ui/button';
import { ImageIcon, MicIcon } from 'lucide-react';
import { cn } from '~/lib/utils';

interface MetaButtonProps extends React.ComponentProps<typeof Button> {
  metaType: 'artists' | 'illustrators'
}

export default function MetaButton({ metaType, children, ...props }: MetaButtonProps) {
  function renderIcon() {
    return match(metaType)
      .with('artists', () => <MicIcon />)
      .with('illustrators', () => <ImageIcon />)
      .exhaustive();
  }

  function renderChild() {
    if (props.asChild)
      return children;

    return (
      <>
        {renderIcon()}
        {children}
      </>
    );
  }

  return (
    <Button
      {...props}
      className={cn(
        metaType === 'artists' && 'bg-green-500 text-white hover:bg-green-500/90',
        metaType === 'illustrators' && 'bg-blue-500 text-white hover:bg-blue-500/90',
        props.className
      )}
    >
      {renderChild()}
    </Button>

  );
}
