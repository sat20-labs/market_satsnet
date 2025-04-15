'use client';

import { FC } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';

import { SunFilledIcon, MoonFilledIcon } from '@/components/icons';

export interface ThemeSwitchProps {
  className?: string;
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({ className }) => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const effectiveTheme = theme ?? 'light';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={clsx('transition-opacity hover:opacity-80', className)}
      aria-label={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {effectiveTheme === 'light' ? (
        <SunFilledIcon size={22} />
      ) : (
        <MoonFilledIcon size={22} />
      )}
    </Button>
  );
};
