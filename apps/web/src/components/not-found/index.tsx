import { useTranslation } from '~/lib/i18n';

export function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="mt-20 space-y-4">
      <h2 className="font-bold text-3xl">{t('页面不存在')}</h2>
      <p className="opacity-60">{t('前面的地区，以后再来探索吧。')}</p>
    </div>
  );
}
