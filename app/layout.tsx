'use client';
import '@sat20/btc-connect/dist/style/index.css';
import '@/styles/globals.css';
import '@/styles/index.css';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import clsx from 'clsx';
import '@/locales';
import { useCommonStore } from '@/store';
import { SystemNoticeModal } from '@/components/SystemNoticeModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { appVersion } = useCommonStore();
  // const lang = i18nConfig.defaultLocale;
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>

        <title>Sat20 Market</title>
      </head>
      <body
        className={clsx(
          'min-h-screen',
          // fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: 'class', defaultTheme: 'dark' }}>
          {/* <AntdRegistry>
            <ConfigProvider
              theme={{
                // 1. 单独使用暗色算法
                algorithm: theme.darkAlgorithm,

                // 2. 组合使用暗色算法与紧凑算法
                // algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
              }}
            > */}
          <div className="relative flex flex-col h-screen">
            {/* <ParticleEffect /> Add the ParticleEffect component here */}
            <Header />
            {/* <SystemNoticeModal /> */}
            <main className="mx-auto w-full px-0 sm:px-4 flex-grow">
              {children}
            </main>
            <footer id="footer">
              <ul className="flex justify-center gap-4 items-center text-gray-500">
                <li>
                  <a href="https://twitter.com/sat20market/" target="_blank" rel="noopener noreferrer">
                    <Avatar>
                      <AvatarFallback>
                        <img src="/twitter.png" alt="sat20 twitter" className="w-full h-full object-cover" />
                      </AvatarFallback>
                    </Avatar>
                  </a>
                </li>
                <li className="text-sm">Copyrights&copy;2024</li>
                <li>V1.0.{appVersion}</li>
              </ul>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
