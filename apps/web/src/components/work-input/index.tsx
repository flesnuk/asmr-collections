import { useMemo, useState } from 'react';

import { CheckIcon, XIcon } from 'lucide-react';

import { Spinner } from '../ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../ui/input-group';

import { cn } from '~/lib/utils';
import { useTranslation } from '~/lib/i18n';
import { parseWorkInput } from '@asmr-collections/shared';

type WorkInputProps = React.ComponentProps<typeof InputGroupInput> & {
  value: string
  onValueChange: (value: string) => void
  onButtonClick?: () => void
  validTip?: string
  initialTip?: string
  isLoading?: boolean
  tipIcon?: React.ReactNode
};

export function WorkInput(props: WorkInputProps) {
  const {
    value,
    onValueChange,
    onButtonClick,
    validTip,
    initialTip,
    isLoading,
    tipIcon,
    ...rest
  } = props;

  const [isFocused, setIsFocused] = useState(false);
  const { t } = useTranslation();

  const { validIds, isEmpty, isValid } = useMemo(() => parseWorkInput(value), [value]);

  const renderIcon = () => {
    if (tipIcon) return tipIcon;
    return isValid ? <CheckIcon /> : <XIcon />;
  };

  const renderTip = () => {
    if (initialTip && isEmpty)
      return initialTip;
    if (isValid)
      return validTip || `${t('识别到')} ${validIds.length} ${t('个有效 ID')}`;
    return t('ID 格式错误');
  };

  // 处于聚焦状态，并且非空或有初始提示，且不在加载中
  const open = isFocused && (!isEmpty || !!initialTip) && !isLoading;

  return (
    <InputGroup data-disabled={isLoading}>
      <InputGroupInput
        {...rest}
        disabled={isLoading}
        className={cn('placeholder:text-sm text-sm', rest.className)}
        value={value}
        onChange={e => onValueChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={e => {
          if (rest.onKeyDown)
            rest.onKeyDown(e);

          if (e.key === 'Escape')
            e.currentTarget.blur();
        }}
      />
      {isLoading && (
        <InputGroupAddon>
          <Spinner />
        </InputGroupAddon>
      )}
      <InputGroupAddon align="inline-end">
        <Tooltip open={open}>
          <TooltipTrigger asChild>
            <InputGroupButton size="icon-xs" onClick={onButtonClick}>
              {renderIcon()}
            </InputGroupButton>
          </TooltipTrigger>
          <TooltipContent>
            {renderTip()}
          </TooltipContent>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  );
}
