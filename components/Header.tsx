'use client';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import NextImage from 'next/image';
import { LanguageSelect } from '@/components/LanguageSelect';
import NextLink from 'next/link';
import { UpdateVersionModal } from './UpdateVersionModal';
import { FeerateSelectButton } from '@/components/fee/FeerateSelectButton';
import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientApi, marketApi } from '@/api';
import { useCommonStore } from '@/store';
import { Icon } from '@iconify/react';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { ChainSelect } from '@/components/ChainSelect';
import { NetworkSelect } from '@/components/NetworkSelect';
import WalletConnectButton from '@/components/wallet/WalletConnectButton';

export const Header = () => {
  const { address, network } = useReactWalletStore();
  const { setHeight, setBtcPrice, runtimeEnv, setEnv, chain } = useCommonStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const walletUrl = 'https://github.com/sat20-labs/sat20wallet/raw/refs/heads/main/client/release/sat20wallet-chrome.zip';
  const { data: btcData } = useQuery({
    queryKey: ['btcPrice'],
    queryFn: marketApi.getBTCPrice,
  });
  useEffect(() => {
    if (btcData?.data?.amount) {
      setBtcPrice(btcData?.data?.amount);
    }
  }, [btcData, setBtcPrice]);

  const isActive = (href: string) => {
    if (href.startsWith('http')) {
        return false;
    }
    return pathname === href;
  };
  const navMenus = useMemo(() => {
    const menus = [
      {
        label: t('pages.market.title'),
        href: '/market',
      },
      {
        label: t('pages.explorer.title'),
        href: network === 'testnet' ? 'https://testnet.sat20.org/browser/app/' : 'https://mainnet.sat20.org/browser/app/',
        target: '_blank',
      },
      {
        label: t('pages.my_assets.title'),
        href: '/account',
      },
      {
        label: (
          <>
            Wallet
            <Icon icon="mdi:download" className="ml-1 text-sm text-zinc-400" />
          </>
        ),
        href:  walletUrl,
        target: '_blank',
      },
    ];
    return menus;
  }, [i18n.language, network, t]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (location.hostname.startsWith('test')) {
        setEnv('test');
      } else if (location.hostname.includes('ordx')) {
        setEnv('prod');
      }
    }
  }, [setEnv]);

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 items-center space-x-2 px-2 sm:px-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-2 sm:gap-4 items-center">
          <div className="flex items-center gap-[2px] sm:gap-2 mr-4">
            <NextLink
              href="https://ordx.market/"
              className="flex items-center justify-start gap-1"
            >
              <NextImage
                src="/logo.png"
                alt="logo"
                width={56}
                height={56}
                className="w-14 h-14 min-w-14"
              />
              <p className="font-bold text-xl bg-gradient-to-tr from-[#8000cc] to-[#cc098b] bg-clip-text text-transparent hidden md:block">
                SATSWAP
              </p>
            </NextLink>
          </div>

          {/* <div className="sm:hidden flex">
            <FeerateSelectButton />
          </div> */}

          <ul className="hidden lg:flex gap-4 items-center">
            {navMenus.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href} className="relative group py-2">
                  <NextLink
                    href={item.href}
                    target={item.target}
                    className={`flex items-center text-sm font-medium transition-colors ${
                      active ? 'text-foreground' : 'text-muted-foreground'
                    } hover:text-foreground/80`}
                  >
                    {item.label}
                    <span
                      className={`absolute left-0 bottom-0 h-[1.5px] w-full bg-gradient-to-r from-[#8000cc] to-[#a0076d] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ${
                        active ? 'scale-x-100' : ''
                      }`}
                    ></span>
                  </NextLink>
                </li>
              );
            })}
          </ul>
          <div><a href={walletUrl} title='wallet download'></a></div>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
          <div className="hidden sm:flex items-center gap-2">
             <NetworkSelect />
             <ChainSelect />
             <FeerateSelectButton />
             <LanguageSelect />
          </div>

          <div className="">
            <WalletConnectButton />
          </div>

          <div className="lg:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Icon icon="lucide:menu" className="h-6 w-6" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-xs sm:max-w-sm">
                <div className="flex flex-col gap-4 pt-8 h-full">
                  <div className="flex flex-col gap-3 px-4">
                     <p className="text-sm font-medium text-muted-foreground">{t('settings')}</p>
                     <div className="flex items-center gap-3">
                       <NetworkSelect />
                       <ChainSelect />
                     </div>
                     <div className="flex items-center gap-3 w-full">
                        <FeerateSelectButton />
                        <LanguageSelect />
                     </div>                     
                  </div>
                  <Separator className="my-1"/>
                  <nav className="flex-1 px-4 space-y-1">
                    {navMenus.map((item) => {
                     const active = isActive(item.href);
                     return (
                       <NextLink
                          key={item.href}
                          href={item.href}
                          target={item.target}
                          className={`flex items-center rounded-md px-3 py-2 mb-4 border-b border-zinc-700/50 text-sm font-medium transition-colors ${
                            active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                          }`}
                          onClick={() => setIsMenuOpen(false)}
                       >
                        <Icon icon="mdi:chevron-right-circle-outline" className="text-base text-zinc-500 mr-2" />  {item.label}
                       </NextLink>
                     )
                   })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      <UpdateVersionModal />
    </nav>
  );
};
