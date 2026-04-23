import { MenubarItem } from '~/components/ui/menubar';

import { noop } from 'swr/_internal';
import { useNavigate } from '@tanstack/react-router';

import { useToastMutation } from '~/hooks/use-toast-fetch';
import { useTranslation } from '~/lib/i18n';

export function RandomWork() {
  const { t } = useTranslation();
  const [action, loading] = useToastMutation<{ id: string }>('random');

  const navigate = useNavigate();

  const handleClick = () => {
    action({ key: '/api/work/random', toastOps: { loading: t('正在跳转...'), error: t('跳转失败') } })
      .unwrap()
      .then(({ id }) => {
        navigate({ to: '/work-details/$id', params: { id } });
      })
      .catch(noop);
  };

  return (
    <MenubarItem onClick={handleClick} disabled={loading}>
      {t('随心听')}
    </MenubarItem>
  );
}
