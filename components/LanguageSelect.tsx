'use client';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';

export const LanguageSelect = () => {
  const { i18n } = useTranslation();
  const items = [
    { key: 'en', label: 'English' },
    { key: 'zh-CN', label: '中文' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="capitalize bg-zinc-600/50">
          <Icon icon="iconoir:language" className="text-xl w-10 h-10" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.key}
            onSelect={() => i18n.changeLanguage(item.key)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
