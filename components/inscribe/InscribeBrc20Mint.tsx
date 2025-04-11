'use client';

import { Input, Slider, Button } from '@nextui-org/react';
import { notification } from 'antd';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-use';
import { clacTextSize } from '@/lib/inscribe';
import { useTranslation } from 'react-i18next';
import { ordx } from '@/api';
import { useUtxoStore } from '@/store';
import { useCommonStore } from '@/store';
import { tryit, min } from 'radash';
import { UtxoSelectTable } from './UtxoSelectTable';
import { useSearchParams } from 'next/navigation';

interface InscribeBrc20MintProps {
  onNext?: () => void;
  onChange?: (data: any) => void;
  value?: any;
}

const MAX_REPEAT = 1000;
export const InscribeBrc20Mint = ({
  onNext,
  onChange,
  value,
}: InscribeBrc20MintProps) => {
  const params = useSearchParams();
  const paramsTicker = (params.get('ticker') as string) || '';
  const { address: currentAccount, network, connected } = useReactWalletStore();
  const { btcHeight } = useCommonStore((state) => state);
  const { t } = useTranslation();
  const { selectUtxosByAmount } = useUtxoStore();

  const [data, { set }] = useMap<any>({
    type: 'mint',
    tick: paramsTicker,
    amount: 1,
    repeatMint: 1,
    ...(value || {}), // Initialize with 'value' prop
  });

  const [tickBlurLoading, setTickBlurLoading] = useState(false);
  const [tickBlurChecked, setTickBlurChecked] = useState(false);
  const [contentType, setContentType] = useState('');
  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickLoading, setTickLoading] = useState(false);
  const [tickChecked, setTickChecked] = useState(false);
  const [utxoList, setUtxoList] = useState<any[]>([]);

  const cleanTick = () => {
    const cleanValue = data.tick.replace(/[^\w\u4e00-\u9fa5]/g, '');
    set('tick', cleanValue);
    return cleanValue;
  };
  const checkTick = async () => {
    return true;
  };
  const nextHandler = async () => {
    setErrorText('');
    if (!tickChecked) {
      const checkStatus = await checkTick();
      setTickChecked(checkStatus);
    } else {
      setLoading(true);

      setLoading(false);
      onNext?.();
    }
  };
  const onTickBlur = async () => {
    const tick = cleanTick();
    if (!connected) {
      return;
    }
    if (tick) {
      setTickBlurChecked(false);
      setTickBlurChecked(true);
    }
  };
  const tickChange = async (value: string) => {
    setTickChecked(false);
    setErrorText('');
    setTickBlurChecked(false);
    set('amount', 1);
    set('repeatMint', 1);
    set('tick', value.trim());
  };

  const buttonDisabled = useMemo(() => {
    return !data.tick;
  }, [data]);
  const amountChange = (value: string) => {
    const amount = isNaN(Number(value)) ? 0 : Number(value);
    console.log('amount', amount);
    console.log('data.limit', data.limit);
    set('amount', Math.min(amount, data.limit));
    set('repeatMint', 1);
    setTickChecked(false);
  };
  const maxRepeat = useMemo(() => {
    return MAX_REPEAT;
  }, [data.isSpecial, data.utxos, data.amount]);

  useEffect(() => {
    setTickChecked(false);
  }, [data.repeatMint]);
  useEffect(() => {
    onChange?.(data);
  }, [data]);
  useEffect(() => {
    if (connected) {
      onTickBlur();
    }
  }, [connected, paramsTicker]);
  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center mb-4">
          <div className="w-20 sm:w-52">{t('common.tick')}</div>
          <Input
            value={data.tick}
            className="flex-1"
            onChange={(e) => {
              tickChange(e.target.value);
            }}
            onBlur={() => {
              onTickBlur();
            }}
            maxLength={32}
            type="text"
            placeholder={t('pages.inscribe.ordx.tick_placeholder')}
          />
        </div>
        <div className="flex items-center mb-4">
          <div className="w-20 sm:w-52">{t('common.amount')}</div>
          <Input
            type="number"
            className="flex-1"
            value={data.amount?.toString()}
            isDisabled={tickLoading || data.isSpecial}
            onChange={(e) => {
              amountChange(e.target.value);
            }}
            min={1}
          ></Input>
        </div>
        <div>
          <div className="flex items-center mb-4">
            <div className="w-52">{t('common.repeat_mint')}</div>
            <div className="flex-1">
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={data.repeatMint.toString()}
                  isDisabled={data.isSpecial}
                  onChange={(e) => {
                    set(
                      'repeatMint',
                      isNaN(Number(e.target.value))
                        ? 0
                        : Math.min(Number(e.target.value), maxRepeat),
                    );
                  }}
                  min={1}
                  max={maxRepeat}
                ></Input>
                <Slider
                  step={1}
                  maxValue={maxRepeat}
                  minValue={1}
                  isDisabled={data.isSpecial}
                  value={[data.repeatMint]}
                  className="max-w-md"
                  onChange={(e) => {
                    console.log(e);
                    set('repeatMint', isNaN(e[0]) ? 0 : e[0]);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-60 mx-auto flex justify-center py-4">
        <WalletConnectBus>
          <Button
            isLoading={loading || tickBlurLoading}
            isDisabled={buttonDisabled}
            color="default"
            className="w-full sm:w-60 btn-gradient"
            onClick={nextHandler}
          >
            {tickChecked ? t('buttons.next') : 'Check'}
          </Button>
        </WalletConnectBus>
      </div>
      {errorText && (
        <div className="mt-2 text-xl text-center text-red-500">{errorText}</div>
      )}
    </div>
  );
};
