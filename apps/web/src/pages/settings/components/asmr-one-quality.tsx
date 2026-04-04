import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { useTranslation } from '~/lib/i18n';

import { SettingItem } from './setting-item';

interface Props {
  value: 'high' | 'low'
  onChange: (value: 'high' | 'low') => void
}

export function ASMRONEQualitySettings({ value, onChange }: Props) {
  const { t } = useTranslation();

  const options = [
    { label: t('质量优先'), value: 'high' },
    { label: t('体积优先'), value: 'low' }
  ];

  return (
    <SettingItem
      id="asmr-one-quality"
      name={t('ASMR.ONE 音质')}
      description={t('获取音频时的质量偏好')}
      action={
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {t('选择 ASMR.ONE 音质')}
    </SettingItem>
  );
}
