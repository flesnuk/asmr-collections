import { useTheme } from 'next-themes';
import { match } from 'ts-pattern';
import { MenubarRadioGroup, MenubarRadioItem, MenubarSub, MenubarSubContent, MenubarSubTrigger } from '~/components/ui/menubar';
import { DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '../ui/dropdown-menu';
import { useTranslation } from '~/lib/i18n';

const themeToText = {
  light: '亮色模式',
  dark: '暗色模式',
  system: '跟随系统'
} as const;

interface ThemeToggleProps {
  menuType: 'menubar' | 'dropdown'
}

export function ThemeToggle({ menuType }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { setTheme, theme } = useTheme();

  return match(menuType)
    .with('menubar', () => (
      <MenubarSub>
        <MenubarSubTrigger>
          {t('主题切换')}
        </MenubarSubTrigger>
        <MenubarSubContent>
          <MenubarRadioGroup
            value={theme}
            onValueChange={setTheme}
          >
            {(['light', 'dark', 'system'] as const)
              .map(_theme => (
                <MenubarRadioItem
                  key={_theme}
                  value={_theme}
                >
                  {t(themeToText[_theme])}
                </MenubarRadioItem>
              ))}
          </MenubarRadioGroup>
        </MenubarSubContent>
      </MenubarSub>
    ))
    .with('dropdown', () => (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          {t('主题切换')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={setTheme}
          >
            {(['light', 'dark', 'system'] as const)
              .map(_theme => (
                <DropdownMenuRadioItem
                  key={_theme}
                  value={_theme}
                >
                  {t(themeToText[_theme])}
                </DropdownMenuRadioItem>
              ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    ))
    .exhaustive();
}
