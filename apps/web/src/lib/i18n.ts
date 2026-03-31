import { useAtomValue } from 'jotai';
import { settingOptionsAtom } from '~/hooks/use-setting-options';

import ja from '../i18n/ja';
import en from '../i18n/en';

const dicts = { ja, en };

export function useTranslation() {
  const settings = useAtomValue(settingOptionsAtom);
  const lang = settings.language || 'zh';

  function t(key: string, values?: Record<string, string | number>) {
    // Chinese is the default keys in code
    let str = (lang === 'zh' ? key : (dicts[lang as keyof typeof dicts] as Record<string, string>)?.[key]) || key;

    if (values) {
      Object.entries(values).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  }

  return { t, lang };
}
