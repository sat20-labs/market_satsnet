'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 创建单例QueryClient实例，避免重复创建
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // 失败重试2次
      retryDelay: 1000, // 重试间隔1秒
      refetchOnWindowFocus: false, // 窗口聚焦时不重新获取
      staleTime: 2 * 60 * 1000, // 2分钟内数据被认为是新鲜的
    },
  },
});

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: any;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <NextThemesProvider {...themeProps}>{children}</NextThemesProvider>
    </QueryClientProvider>
  );
}
