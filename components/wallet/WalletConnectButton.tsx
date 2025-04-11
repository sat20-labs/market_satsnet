'use client';

import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Snippet,
} from '@nextui-org/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import {
  WalletConnectReact,
  useReactWalletStore,
} from '@sat20/btc-connect/dist/react';
import { Icon } from '@iconify/react';
import { useAssets } from '@/lib/hooks';
import { usePlainUtxo } from '@/lib/hooks/usePlainUtxo';
import { useTheme } from 'next-themes';
import { hideStr, satsToBitcoin, formatBtcAmount } from '@/lib/utils';
import { message } from '@/lib/wallet-sdk';
import { notification } from 'antd';
import { useTranslation } from 'react-i18next';
import { useCommonStore } from '@/store';
import { generateMempoolUrl } from '@/lib/utils';
import { useUtxoStore } from '@/store';
const WalletConnectButton = () => {
  // const { loading } = useAssets();
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const {
    connected,
    check,
    address,
    publicKey,
    disconnect,
    btcWallet,
    network,
  } = useReactWalletStore((state) => state);
  usePlainUtxo();
  const { reset, getUnspendUtxos, list: UtxoList } = useUtxoStore();
  const { setSignature, signature } = useCommonStore((state) => state);
  const [utxoAmount, setUtxoAmount] = useState(0);

  const initCheck = async () => {
    await check();
    // await checkSignature();
  };
  useEffect(() => {
    initCheck();
  }, []);
  useEffect(() => {
    const unspendUtxos = getUnspendUtxos();
    const amount = unspendUtxos.reduce((acc, cur) => acc + cur.value, 0);
    setUtxoAmount(amount);
  }, [UtxoList]);
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
    notification.error({
      message: 'Connect Wallet Failed',
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
  };
  const accountAndNetworkChange = async () => {
    console.log('accountAndNetworkChange');
    console.log('connected', connected);
    reset();
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
            }
          } else {
            handlerDisconnect();
          }
        } catch (error) {
          await handlerDisconnect();
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const showAmount = useMemo(() => {
    const btcValue = satsToBitcoin(utxoAmount);
    return formatBtcAmount(btcValue);
  }, [utxoAmount]);
  const checkSignature = async () => {
    if (signature && publicKey) {
      console.log('checkSignature', signature);

      try {
        const bol = message.verifyMessageOfECDSA(
          publicKey,
          process.env.NEXT_PUBLIC_SIGNATURE_TEXT,
          signature,
        );
        console.log('publicKey', publicKey);
        console.log('bol', bol);

        if (!bol) {
          notification.warning({
            message: 'Signature Verification Failed',
            description: 'Please check your signature and try connect again',
          });
          handlerDisconnect();
        }
      } catch (error) {
        console.log('checkSignature', error);
        notification.warning({
          message: 'Signature Verification Failed',
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
      }, 2000);
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
  }, [connected]);
  return (
    <WalletConnectReact
      config={{
        network: 'livenet' as any,
      }}
      theme={theme === 'dark' ? 'dark' : 'light'}
      onConnectSuccess={onConnectSuccess}
      onConnectError={onConnectError}
    >
      <>
        <Popover placement="bottom">
          <PopoverTrigger>
            <Button
              className="px-0 bg-[#181819]"
              endContent={
                <div className="px-2 h-full flex justify-center items-center text-gray-300 bg-[#282828]">
                 {/* <Icon icon="mdi-light:wallet" className="w-5 h-5 text-gray-400" /> */}
                 {address?.slice(-4)}<Icon icon="mdi-light:chevron-down" className=" text-gray-400 text-sm" />
                </div>
              }
            >
              <div className="flex items-center gap-1 pl-2">
                <Icon icon="cryptocurrency-color:btc" className="w-4 h-4" />
                <span className='text-gray-200 text-xs sm:text-sm'>{showAmount}</span> 
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-2">
            <div className="flex flex-col gap-2">
              <div>
                <Snippet
                  codeString={address}
                  className="bg-transparent text-lg md:text-2xl font-thin items-center"
                  symbol=""
                  variant="flat"
                >
                  <span className="text-base font-thin text-slate-400">
                    {hideStr(address, 4)}
                  </span>
                </Snippet>
              </div>
              <Button className="w-full" onClick={toHistory}>
                {t('buttons.to_history')}
              </Button>
              <Button
                color="danger"
                variant="ghost"
                onClick={handlerDisconnect}
              >
                {t('buttons.disconnect')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </>
    </WalletConnectReact>
  );
};

export default WalletConnectButton;
