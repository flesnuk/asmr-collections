import useSWR from 'swr';
import { fetcher } from '~/lib/fetcher';

export function PreloadNextPlayback({ swrKey }: { swrKey: string | null }) {
  useSWR(swrKey, fetcher);

  return null;
}
