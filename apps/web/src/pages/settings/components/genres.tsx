import { useTranslation } from '~/lib/i18n';
import { Button } from '~/components/ui/button';

import { SettingItem } from './setting-item';

import { useToastMutation } from '~/hooks/use-toast-fetch';
import { RefreshCwIcon } from 'lucide-react';

export function GenresSettings({ api }: { api: string }) {
  const { t } = useTranslation();
  const [action, isLoading] = useToastMutation('genres-sync');

  const onClick = () => {
    action({
      key: '/api/genres/sync',
      fetchOps: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api })
      },
      toastOps: {
        loading: t('正在同步标签...'),
        success: t('标签同步完成'),
        error: t('标签同步失败')
      }
    });
  };

  return (
    <SettingItem
      id="genres-sync-from-asmr-one"
      description={t('同步数据库的标签为和谐之前的名称')}
      action={
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onClick}
          disabled={isLoading}
        >
          <RefreshCwIcon />
        </Button>
      }
    >
      {t('同步标签')}
    </SettingItem>
  );
}
