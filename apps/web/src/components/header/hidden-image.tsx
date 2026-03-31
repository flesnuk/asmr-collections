import { match } from 'ts-pattern';
import { MenubarCheckboxItem, MenubarShortcut } from '../ui/menubar';

import { useHiddenImage } from '~/hooks/use-hidden-image';
import { DropdownMenuCheckboxItem, DropdownMenuShortcut } from '../ui/dropdown-menu';
import { useTranslation } from '~/lib/i18n';

interface HiddenImageProps {
  menuType: 'menubar' | 'dropdown'
}

export function HiddenImage({ menuType }: HiddenImageProps) {
  const [isHidden, setIsHidden] = useHiddenImage();
  const { t } = useTranslation();

  return match(menuType)
    .with('menubar', () => (
      <MenubarCheckboxItem checked={isHidden} onCheckedChange={() => setIsHidden(p => !p)}>
        {t('无图模式')}
        <MenubarShortcut>⌘K</MenubarShortcut>
      </MenubarCheckboxItem>
    ))
    .with('dropdown', () => (
      <DropdownMenuCheckboxItem checked={isHidden} onCheckedChange={() => setIsHidden(p => !p)}>
        {t('无图模式')}
        <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
      </DropdownMenuCheckboxItem>
    ))
    .exhaustive();
}
