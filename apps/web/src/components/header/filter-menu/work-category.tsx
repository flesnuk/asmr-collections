import { MenubarCheckboxItem, MenubarSub, MenubarSubContent, MenubarSubTrigger } from '~/components/ui/menubar';

import { useNavigate } from '@tanstack/react-router';
import { useGenerateSearch } from '~/hooks/use-generate-search';

import { cn } from '~/lib/utils';

type WorkType = 'RJ' | 'BJ' | 'VJ';

const TYPE_OPTIONS: WorkType[] = ['RJ', 'BJ', 'VJ'];

export function WorkCategory() {
  const { search, exclude } = useGenerateSearch();
  const navigate = useNavigate();

  const getCheckedState = (type: WorkType) => {
    return search.workType === type;
  };

  const handleSelect = (type: WorkType) => {
    if (search.workType === type)
      navigate({ to: '/', search: exclude(['page', 'keyword', 'workType']) });
    else
      navigate({ to: '/', search: exclude(['page', 'keyword'], { workType: type }) });
  };

  return (
    <MenubarSub>
      <MenubarSubTrigger className={cn('transition-opacity', search.workType ? 'opacity-100' : 'opacity-60')}>
        作品类型
      </MenubarSubTrigger>
      <MenubarSubContent>
        {TYPE_OPTIONS
          .map(type => (
            <MenubarCheckboxItem
              key={type}
              checked={getCheckedState(type)}
              onCheckedChange={() => handleSelect(type)}
              onSelect={e => e.preventDefault()}
              className="font-mono"
            >
              {type}
            </MenubarCheckboxItem>
          ))}
      </MenubarSubContent>
    </MenubarSub>
  );
}
