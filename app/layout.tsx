'use client';
import '@/styles/globals.css';
import '@/styles/index.css';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import clsx from 'clsx';
import '@/locales';
import { useCommonStore } from '@/store';
import { SystemNoticeModal } from '@/components/SystemNoticeModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { appVersion } = useCommonStore();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'cn';
  // const lang = i18nConfig.defaultLocale;
  return (
    <html lang={lang} suppressHydrationWarning className="dark">
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
            <ul className="flex flex-wrap justify-center h-auto min-h-16 gap-1 items-center border-t border-zinc-700/50 text-gray-500 px-2 py-2 mb-2">
                <li>
                  <a href="https://x.com/SATSWAPMarket/" target="_blank" rel="noopener noreferrer">  
                    <Avatar>
                      <AvatarFallback>
                        {/* <img src="/twitter.png" alt="sat20 twitter" className="w-full h-full object-cover" /> */}
                        <Icon icon="fa6-brands:x-twitter" className="text-base text-zinc-200/50 hover:text-purple-500" />
                      </AvatarFallback>
                    </Avatar>
                  </a>
                </li>
                
                <li className="text-sm">Copyrights&copy;2025</li>
                <li>V1.0.{appVersion}</li>
                
                 {/* 一起换行显示 */}
                <li className="flex w-full sm:w-auto sm:flex-row justify-center items-center gap-2 px-4 text-center">
                <span>
                  <a
                    href={`https://app.ordx.market/privacy/${lang === 'en' ? 'en' : 'zh'}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-purple-500 transition-colors"
                  >
                    {t('footer.legal.privacy', { defaultValue: 'Privacy Policy' })}
                  </a>
                  </span>
                  <span className='border-l-2 border-zinc-600/80'>
                  <a
                    href={`/files/SAT20_Wallet_User_Guide_${lang}.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-purple-500 transition-colors ml-2"
                  >
                    {t('footer.help.title', { defaultValue: 'Wallet Guide' })}
                  </a>
                  </span>
                  <span className='border-l-2 border-zinc-600/80'>
                  <a
                    href={`/files/LaunchPool_User_Guide_${lang}.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-purple-500 transition-colors ml-2"
                  >
                    {t('footer.help.title', { defaultValue: 'LaunchPool Guide' })}
                  </a>
                  </span>
                </li>
              </ul>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
