'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: any;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <NextThemesProvider {...themeProps}>{children}</NextThemesProvider>
    </QueryClientProvider>
  );
}
