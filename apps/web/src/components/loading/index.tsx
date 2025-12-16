import { Spinner } from '../ui/spinner';
import { cn } from '~/lib/utils';

export function Loading({ isLoading, className }: { isLoading: boolean, className?: string }) {
  return isLoading && <Spinner className={cn('size-4', className)} />;
}
