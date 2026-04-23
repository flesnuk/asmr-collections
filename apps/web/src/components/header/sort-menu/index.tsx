import { MenubarContent, MenubarGroup, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarTrigger } from '~/components/ui/menubar';

import { useNavigate } from '@tanstack/react-router';
import { useGenerateSearch } from '~/hooks/use-generate-search';

import { setStoredValue } from '~/providers/router/utils';

import { useTranslation } from '~/lib/i18n';

export function SortMenu() {

  const { t } = useTranslation();
  const { search, exclude } = useGenerateSearch();
  const navigate = useNavigate();

  const sortOptions = [
    {
      label: t('售价'),
      value: 'price'
    },
    {
      label: t('销量'),
      value: 'sales'
    },
    {
      label: t('评分'),
      value: 'rate'
    },
    {
      label: t('评分人数'),
      value: 'rateCount'
    },
    {
      label: t('收藏人数'),
      value: 'wishlistCount'
    },
    {
      label: t('评论人数'),
      value: 'reviewCount'
    },
    {
      label: t('收藏时间'),
      value: 'createdAt'
    },
    {
      label: t('更新时间'),
      value: 'updatedAt'
    },
    {
      label: t('发售时间'),
      value: 'releaseDate'
    },
    {
      label: t('随机排序'),
      value: 'random'
    },
    {
      label: t('回放次数'),
      value: 'playCount'
    }
  ];

  return (
    <MenubarMenu>
      <MenubarTrigger>
        {t('排序')}
      </MenubarTrigger>
      <MenubarContent align="center">
        <MenubarRadioGroup
          value={search.order}
          onValueChange={value => {
            if (search.order === value) return;
            const newValue = value as 'asc' | 'desc';
            // 得在更新 url 之前存储，之后的话路由获取的就是旧值
            setStoredValue('__sort-options__', { order: newValue, sortBy: search.sort });
            navigate({ to: '/', search: exclude(['page', 'keyword'], { order: newValue }) });
          }}
        >
          {([{ label: t('正序'), value: 'asc' }, { label: t('倒序'), value: 'desc' }]).map(({ label, value }) => (
            <MenubarRadioItem
              key={value}
              value={value}
              onSelect={e => e.preventDefault()}
            >
              {label}
            </MenubarRadioItem>
          ))}
        </MenubarRadioGroup>
        <MenubarSeparator />
        <MenubarGroup>
          <MenubarRadioGroup
            value={search.sort}
            onValueChange={value => {
              if (search.sort === value) return;
              setStoredValue('__sort-options__', { order: search.order, sortBy: value });
              navigate({ to: '/', search: exclude(['page', 'keyword'], { sort: value }) });
            }}
          >
            {sortOptions.map(({ label, value }) => (
              <MenubarRadioItem key={value} value={value} onSelect={e => e.preventDefault()}>{label}</MenubarRadioItem>
            ))}
          </MenubarRadioGroup>
        </MenubarGroup>
      </MenubarContent>
    </MenubarMenu>
  );
}
