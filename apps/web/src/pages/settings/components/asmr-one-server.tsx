import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { useTranslation } from '~/lib/i18n';

import { SettingItem } from './setting-item';

interface Props {
  value: string
  onChange: (value: string) => void
}

const options = [
  { label: 'original', url: 'https://api.asmr.one' },
  { label: 'mirror-100', url: 'https://api.asmr-100.com' },
  { label: 'mirror-200', url: 'https://api.asmr-200.com' },
  { label: 'mirror-300', url: 'https://api.asmr-300.com' }
];

export function ASMRONEAPISettings({ value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <SettingItem
      id="asmr-one-api"
      name={t('ASMR.ONE API 地址')}
      description={t('选择用于获取 ASMR.ONE 数据的 API 地址')}
      action={
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.url} value={option.url}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {t('选择 ASMR.ONE API 地址')}
    </SettingItem>
  );
}
