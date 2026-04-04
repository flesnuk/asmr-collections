import { Button } from '~/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '~/components/ui/drawer';

import { useTranslation } from '~/lib/i18n';

import { WorkPreview } from '../work-preview';

import { useState } from 'react';

export function AuditionDrawer({ workId, originalId }: { workId: string, originalId?: string | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="lg">{t('试听')}</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="sr-only">
          <DrawerTitle>{t('试听')}</DrawerTitle>
          <DrawerDescription>{t('试听DLsite作品音频')}</DrawerDescription>
        </DrawerHeader>
        {open && <WorkPreview workId={workId} originalId={originalId} className="min-h-64" />}
      </DrawerContent>
    </Drawer>
  );
}
