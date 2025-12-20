import useSWR from 'swr';
import { fetcher } from '~/lib/fetcher';

export function PrefetchNextWorks({ swrKey }: { swrKey: string | null }) {
  useSWR(swrKey, fetcher);

  return null;
}
