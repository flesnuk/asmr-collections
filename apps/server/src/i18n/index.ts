import en from './en';
import ja from './ja';

const dicts = { en, ja } as Record<string, Record<string, string>>;

/**
 * Returns a translator function `t` for the given locale cookie value.
 * Locale should be one of: 'zh-cn', 'en-us', 'ja-jp'.
 * Chinese is the default (keys are Chinese strings).
 */
export function getT(locale: string) {
  const lang = locale.startsWith('en') ? 'en'
    : locale.startsWith('ja') ? 'ja'
      : 'zh';

  const dict = dicts[lang];

  return function t(key: string, values?: Record<string, string | number>): string {
    let str = (lang === 'zh' ? key : dict?.[key]) || key;

    if (values) {
      for (const [k, v] of Object.entries(values)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }

    return str;
  };
}
