'use client';

import {
  Button,
} from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { useEffect, useMemo, useState } from 'react';
import {
  WalletConnectReact,
  useReactWalletStore,
} from '@sat20/btc-connect/dist/react';
import { Copy, ChevronDown, Bitcoin } from 'lucide-react';
import { useTheme } from 'next-themes';
import { hideStr, satsToBitcoin, formatBtcAmount } from '@/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useCommonStore, useAssetStore, useUtxoStore, useWalletStore } from '@/store';
import { generateMempoolUrl } from '@/utils';
import { usePlainUtxo } from '@/lib/hooks';
import { useQueryClient } from '@tanstack/react-query';


const WalletConnectButton = () => {

  const { network } = useCommonStore();
  const { list: utxoList } = useUtxoStore();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const {
    connected,
    check,
    address,
    publicKey,
    disconnect,
    btcWallet,
  } = useReactWalletStore((state) => state);
  const { getBalance, balance } = useWalletStore();
  const { loadSummaryData } = useAssetStore();
  const { data: plainUtxos } = usePlainUtxo();
  const [isCopied, setIsCopied] = useState(false);
  const { setSignature, signature } = useCommonStore((state) => state);
  const queryClient = useQueryClient();

  const utxoAmount = useMemo(() => {
    return utxoList.reduce((acc, cur) => acc + cur.value, 0);
  }, [utxoList]);
  useEffect(() => {
    if (address && connected) {
      loadSummaryData();
    }
  }, [address, connected]);
  const initCheck = async () => {
    await check();
  };

  useEffect(() => {
    initCheck();
  }, []);

  const onConnectSuccess = async (wallet: any) => {
    if (!signature) {
      console.log('signature text', process.env.NEXT_PUBLIC_SIGNATURE_TEXT);
      try {
        const _s = await wallet.signMessage(
          process.env.NEXT_PUBLIC_SIGNATURE_TEXT,
        );
        setSignature(_s);
      } catch (error) {
        await disconnect();
      }
    }
  };
  const onConnectError = (error: any) => {
    console.error('Connect Wallet Failed', error);
    toast.error('Connect Wallet Failed', {
      description: error.message,
    });
  };
  const toHistory = () => {
    const url = generateMempoolUrl({
      network,
      path: `address/${address}`,
    });
    window.open(url, '_blank');
  };
  const handlerDisconnect = async () => {
    console.log('disconnect success');
    setSignature('');
    await disconnect();
    queryClient.invalidateQueries({ queryKey: ['utxos'] });
    queryClient.removeQueries({ queryKey: ['utxos'] });
  };
  const accountAndNetworkChange = async () => {
    console.log('accountAndNetworkChange');
    console.log('connected', connected);
    queryClient.invalidateQueries({ queryKey: ['utxos'] });

    const windowState =
      document.visibilityState === 'visible' || !document.hidden;
    try {
      await check();
      if (process.env.NEXT_PUBLIC_SIGNATURE_TEXT && connected) {
        try {
          console.log('checkSignature');
          console.log(windowState);
          if (windowState) {
            const _s = await btcWallet?.signMessage(
              process.env.NEXT_PUBLIC_SIGNATURE_TEXT,
            );
            if (_s) {
              setSignature(_s);
            } else {
              await handlerDisconnect();
            }
          } else {
            handlerDisconnect();
          }
        } catch (error) {
          await handlerDisconnect();
        }
      }
    } catch (error) {
      console.log('Account/Network change check error:', error);
    }
  };
  const showAmount = useMemo(() => {
    const btcValue = satsToBitcoin(balance.availableAmt);
    return formatBtcAmount(btcValue);
  }, [balance]);
  const checkSignature = async () => {
    if (signature && publicKey) {
      console.log('checkSignature', signature);

      try {
        // const bol = message.verifyMessageOfECDSA(
        //   publicKey,
        //   process.env.NEXT_PUBLIC_SIGNATURE_TEXT,
        //   signature,
        // );
        // console.log('publicKey', publicKey);
        // console.log('bol', bol);

        // if (!bol) {
        //   notification.warning({
        //     message: 'Signature Verification Failed',
        //     description: 'Please check your signature and try connect again',
        //   });
        //   handlerDisconnect();
        // }
      } catch (error) {
        console.log('checkSignature', error);
        toast.warning('Signature Verification Failed', {
          description: 'Please check your signature and try connect again',
        });
        handlerDisconnect();
      }
    }
  };
  useEffect(() => {
    console.log('connected', connected);
    if (connected) {
      setTimeout(() => {
        checkSignature();
        getBalance();
      }, 1000);
      btcWallet?.on('accountsChanged', accountAndNetworkChange);
      btcWallet?.on('networkChanged', accountAndNetworkChange);
    } else {
      btcWallet?.removeListener('accountsChanged', accountAndNetworkChange);
      btcWallet?.removeListener('networkChanged', accountAndNetworkChange);
    }
    return () => {
      btcWallet?.removeListener('accountsChanged', accountAndNetworkChange);
      btcWallet?.removeListener('networkChanged', accountAndNetworkChange);
    };
  }, [connected, address, network, publicKey, signature]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    }
  };

  return (
    <WalletConnectReact
  
      config={{
        network: 'mainnet' as any,
      }}
      ui={{
        connectClass: 'bg-[#181819] border-[#282828] hover:bg-[#1f1f20] text-red-500 focus:ring-0 focus-visible:ring-0',
      }}
      theme={theme === 'dark' ? 'dark' : 'light'}
      onConnectSuccess={onConnectSuccess}
      onConnectError={onConnectError}
    >
      <>
        {connected && address ? (
          <Popover>
            <div className="relative">
              <PopoverTrigger>
                <Button
                  variant="outline"
                  className="px-0 bg-[#181819] border-[#282828] hover:bg-[#1f1f20] text-gray-200 focus:ring-0 focus-visible:ring-0"
                >
                  <div className="flex items-center gap-1 pl-2">
                    <Bitcoin className="w-4 h-4 text-orange-400" />
                    <span className='text-gray-200 text-xs sm:text-sm'>
                      {showAmount}
                    </span>
                  </div>
                  <div className="px-2 h-full flex justify-center items-center text-gray-300 bg-transparent ml-2">
                    {address?.slice(-4)}
                    <ChevronDown className="text-gray-400 text-sm w-4 h-4 ml-1" />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 bg-background border-border z-[100]">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted">
                     <span className="text-base font-thin text-muted-foreground">
                        {hideStr(address, 4)}
                      </span>
                     <Button variant="ghost" size="icon" onClick={copyAddress} className="h-6 w-6">
                       <Copy className="h-4 w-4" />
                     </Button>
                  </div>
                  <Button variant="outline" className="w-full" onClick={toHistory}>
                    {t('buttons.to_history')}
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handlerDisconnect}
                  >
                    {t('buttons.disconnect')}
                  </Button>
                </div>
              </PopoverContent>
            </div>
          </Popover>
        ) : (
          <Button>{t('buttons.connect_wallet')} 12</Button>
        )}
      </>
    </WalletConnectReact>
  );
};

export default WalletConnectButton;
