import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';

import Link from '~/components/link';

import { useState } from 'react';

import { externalUrl, writeClipboard } from '~/utils';
import type { RootSearchParams } from '~/providers/router';

interface Props {
  search: RootSearchParams
  variant: 'green' | 'blue'
  icon: React.ReactNode
  text: string
  isFilter?: boolean
}

export function BadgeMenu({ search, variant, icon, text, isFilter }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} key={String(open) /** 筛选只是添加了 url search，虽然有设置 open false，但是没用 */}>
      <DropdownMenuTrigger asChild>
        <Button
          onPointerDown={e => e.preventDefault()}
          onClick={() => setOpen(p => !p)}
          variant={variant}
          size="sm"
          className="text-xs"
        >
          {icon}
          {text}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40" onInteractOutside={() => setOpen(false)}>
        <DropdownMenuItem asChild>
          <Link disabled={isFilter} to="/" search={search} onClick={() => setOpen(false)}>筛选</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            writeClipboard(text);
            setOpen(false);
          }}
        >
          复制名称
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={externalUrl.dlsiteKeyword(text)} isExternal showAnchorIcon>
            在 DLsite 上查看
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
