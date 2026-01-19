import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

import { SettingItem } from './setting-item';

interface Props {
  value: 'high' | 'low'
  onChange: (value: 'high' | 'low') => void
}

const options = [
  { label: '质量优先', value: 'high' },
  { label: '流畅优先', value: 'low' }
];

export function ASMRONEQualitySettings({ value, onChange }: Props) {
  return (
    <SettingItem
      id="asmr-one-quality"
      name="ASMR.ONE 音质"
      description="获取音频时的质量偏好"
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
      选择 ASMR.ONE 音质
    </SettingItem>
  );
}
