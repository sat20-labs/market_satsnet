'use client';
import '@sat20/btc-connect/dist/style/index.css';
import '@/styles/globals.css';
import '@/styles/index.css';
import { Providers } from './providers';
import { Navbar } from '@/components/navbar';
import clsx from 'clsx';
import '@/locales';
import { useCommonStore } from '@/store';
import { SystemNoticeModal } from '@/components/SystemNoticeModal';
import { Avatar, Image, Link } from '@nextui-org/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { appVersion } = useCommonStore();
  const contentList = [
    'https://ord-testnet4.ordx.space/content/68bcab296d2d81537f8e1032cd75043a54c9d14ddb468283fc78b24c7101b105i0?seed=85f086ce2d0de811',
    'https://ord-testnet4.ordx.space/content/0d8c75aa700204623dbf763632a0ff2f6be67d036ce36a793a060da4d1885104i0',
    'https://ord-testnet4.ordx.space/content/3c470c76ffd2a3297359515de5e0be346c99bf5341b6947c5784d79bfeaa7064i0',
    'https://ord-testnet4.ordx.space/content/6b10b685db67c812a82ca2b3a69599730385c5783113dce4f11828791d0f5f7ei0',
    'https://ord-testnet4.ordx.space/content/99c8a13d6de4ee96d3949d45f494119f57f3ae92554adb2f20d0854380765465i0',
    'https://ord-testnet4.ordx.space/content/114fc89be175aabc854c95f55c769c25c045620bd93b9f11b09bc0fe47e1bc8ci0',
    'https://ord-testnet4.ordx.space/content/829ff79163eaf84ea2b81434ba50e089bff7dfaaf7366f1e6aae41aac2058a3fi0',

    'https://ord-mainnet.ordx.space/content/4bd30e1f3877ebe25f8adc3f05229c4a3d02d05207d6064be85529a6dce7149bi0',
    'https://ord-mainnet.ordx.space/content/645c642e818d3e874535315213f914ef7372d5ab92e1733d55ceb1b8b0914a07i0',
    'https://ord-mainnet.ordx.space/content/fb13c2ef50866951b1fd064a355125dd228daa1e84d4ee13bc612a1c96042b6ci0',
    'https://ord-mainnet.ordx.space/content/d5e65e2613fdeff85d40c2fe209c9c9d2e78cd3cf251fd3bc53236882a90f480i0',
    'https://ord-mainnet.ordx.space/content/63d3feee80ddfc0325ced9abc0ded7878b8447077c1aa2264749d2ce9a0bcab7i0',
  ];
  // const lang = i18nConfig.defaultLocale;
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        {contentList.map((content, index) => (
          <link key={index} rel="preload" href={content} as="script" />
        ))}

        {/* <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
          integrity="sha384-k6RqeWeci5ZR/Lv4MR0sA0FfDOMU+keDJ9i4xOX9U+Vgk5R5gBq5H+K6Jr9MxGxV"
          crossOrigin="anonymous"
        /> */}

        <title>Sat20 Market</title>
      </head>
      <body
        className={clsx(
          'min-h-screen bg-background font-sans antialiased dark:text-white text-black',
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
            <Navbar />
            {/* <SystemNoticeModal /> */}
            <main className="mx-auto w-full px-0 md:px-4 flex-grow">
              {children}
            </main>
            <footer id="footer">
              <ul className="flex justify-center gap-4 items-center text-gray-500">
                <li>
                  <Link href="https://twitter.com/sat20market/" target="_blank">
                    <Avatar
                      showFallback
                      fallback={
                        <Image src="/twitter.png" alt="sat20 twitter" />
                      }
                    />
                  </Link>
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
