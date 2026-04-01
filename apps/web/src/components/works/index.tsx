import { WorkCard } from '../work-card';

import { cn } from '~/lib/utils';
import type { Work } from '@asmr-collections/shared';
import { useTranslation } from '~/lib/i18n';

interface Props {
  data: Work[]
  className?: string
}

export function Works({ data, className }: Props) {
  const { t } = useTranslation();
  if (data.length === 0)
    return <div className="flex justify-center opacity-70 mt-[10%]">{t('没有更多惹...')}</div>;

  return (
    <div className={cn('grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-4', className)}>
      {data.map(work => (
        <div key={work.id}>
          <WorkCard work={work} />
        </div>
      ))}
    </div>
  );
}
