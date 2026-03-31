import { MenubarCheckboxItem, MenubarContent, MenubarGroup, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarTrigger } from '~/components/ui/menubar';

import { WorkCategory } from './work-category';
import { AgeCategory } from './age-category';
import { GenresFilter } from './genres-filter';
import { CircleFilter } from './circle-filter';
import { SeriesFilter } from './series-filter';
import { ArtistsFilter } from './artists-filter';
import { IllustratorsFilter } from './illustrators-filter';

import { Activity } from 'react';
import { useAtomValue } from 'jotai';
import { useNavigate } from '@tanstack/react-router';
import { useGenerateSearch } from '~/hooks/use-generate-search';
import { storageOptionsAtom } from '~/hooks/use-setting-options';
import { useTranslation } from '~/lib/i18n';

export function FilterMenu() {
  const { t } = useTranslation();
  const { search, exclude } = useGenerateSearch();
  const navigate = useNavigate();

  const settings = useAtomValue(storageOptionsAtom);

  return (
    <MenubarMenu>
      <MenubarTrigger>
        {t('筛选')}
      </MenubarTrigger>
      <MenubarContent className="max-[400px]:min-w-40">
        <MenubarGroup>
          <AgeCategory />
          <WorkCategory />
          <MenubarShortcut />
          <MenubarSeparator />
          <MenubarCheckboxItem
            checked={search.multilingual}
            onCheckedChange={checked => {
              if (checked)
                navigate({ to: '/', search: exclude(['keyword', 'page'], { multilingual: true }) });
              else
                navigate({ to: '/', search: exclude(['keyword', 'page', 'multilingual']) });
            }}
            onSelect={e => e.preventDefault()}
          >
            {t('多语言')}
          </MenubarCheckboxItem>
          <MenubarCheckboxItem
            checked={search.subtitles}
            onCheckedChange={checked => {
              if (checked)
                navigate({ to: '/', search: exclude(['keyword', 'page'], { subtitles: true }) });
              else
                navigate({ to: '/', search: exclude(['keyword', 'page', 'subtitles']) });
            }}
            onSelect={e => e.preventDefault()}
          >
            {t('带字幕')}
          </MenubarCheckboxItem>
          <Activity mode={settings.enabled ? 'visible' : 'hidden'}>
            <MenubarCheckboxItem
              checked={search.storageFilter === 'exclude' ? 'indeterminate' : !!search.storageFilter}
              onCheckedChange={() => {
                if (!search.storageFilter)
                  navigate({ to: '/', search: exclude(['keyword', 'page'], { storageFilter: 'only' }) });
                else if (search.storageFilter === 'only')
                  navigate({ to: '/', search: exclude(['keyword', 'page'], { storageFilter: 'exclude' }) });
                else
                  navigate({ to: '/', search: exclude(['keyword', 'page', 'storageFilter']) });
              }}
              onSelect={e => e.preventDefault()}
            >
              本地{search.storageFilter === 'exclude' ? '没' : ''}有
            </MenubarCheckboxItem>
          </Activity>
          <MenubarSeparator />
          <MenubarRadioGroup
            value={search.filterOp}
            onValueChange={value => {
              if (search.filterOp === value) return;
              navigate({ to: '/', search: exclude(['keyword', 'page'], { filterOp: value as 'and' | 'or' }) });
            }}
          >
            <MenubarRadioItem value="and" onSelect={e => e.preventDefault()}>
              {t('与')}
            </MenubarRadioItem>
            <MenubarRadioItem value="or" onSelect={e => e.preventDefault()}>
              {t('或')}
            </MenubarRadioItem>
          </MenubarRadioGroup>
          <MenubarSeparator />
          <ArtistsFilter />
          <IllustratorsFilter />
          <GenresFilter />
          <CircleFilter />
          <SeriesFilter />
        </MenubarGroup>
      </MenubarContent>
    </MenubarMenu>
  );
}
