'use client';

import { Input, Button } from '@nextui-org/react';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-use';
import { ordx } from '@/api'
import { tryit } from 'radash';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useTranslation } from 'react-i18next';
// import { CopyButton } from '@/components/CopyButton';

interface InscribeRunesEtchProps {
  onNext?: () => void;
  onChange?: (data: any) => void;
  value?: any; // Add 'value' prop
}

export const InscribeRunesEtch = ({
  onNext,
  onChange,
  value,
}: InscribeRunesEtchProps) => {
  const { t } = useTranslation();
  const { address: currentAccount, network, connected } = useReactWalletStore();
  const [data, { set }] = useMap<any>({
    type: 'rune',
    action: 'etch',
    runeName: 'STESTETSETSETSETSET',
    amount: '1',
    cap: 0,
    symbol: '$',
    divisibility: 1,
    premine: 0,
    ...(value || {}), // Initialize with 'value' prop
  });

  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickBlurChecked, setTickBlurChecked] = useState(true);
  const [tickChecked, setTickChecked] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const nextHandler = async () => {
    setErrorText('');
    if (!tickChecked) {
      const checkStatus = await checkTick();

      if (!checkStatus) {
        return;
      }

      setTickChecked(true);
    } else {
      setLoading(true);

      setLoading(false);
      onNext?.();
    }
  };
  const checkTick = async () => {
    const { runeName } = data;
    const [err, res] = await tryit(ordx.getDeployInfo)({ asset: `runes:f:${runeName}`, network});
    console.log('checkTick', err, res);
    if (err || res.code !== 0) {
      setErrorText('rune is exisited');
      return false;
    }

    return true;
  };
  const tickChange = (value) => {
    value = value.replace(/[^a-zA-Z •]/g, '').toUpperCase();
    value = value.replace(' ', '•');
    set('runeName', value);
  };
  const addDot = () => {
    const { runeName } = data;
    set('runeName', `${runeName}•`);
  };
  const ontickBlur = async () => {
    setTickBlurChecked(false);
    // const cleanValue = data.runeName.replace(/[^\w\u4e00-\u9fa5]/g, '');
    // set('runeName', cleanValue);
    setTickBlurChecked(true);
  };

  useEffect(() => {
    setTickChecked(false);
    onChange?.(data);
  }, [data]);
  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center mb-4 gap-2">
          <div className="w-20 sm:w-52">{t('common.tick')}</div>
          <Input
            value={data.runeName}
            className="flex-1"
            endContent={
              <Button size="sm" onClick={addDot}>
                •
              </Button>
            }
            onChange={(e) => {
              tickChange(e.target.value);
            }}
            onBlur={() => {
              ontickBlur();
            }}
            maxLength={32}
            type="text"
            placeholder={`Enter 'AAAAA•AAAAA•AAAAA' or 'BBBBB BBBBB BBBBB' here`}
          />
        </div>
        <div className="flex mb-4 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-20 sm:w-52">Amount</div>
          <div className="flex-1">
            <Input
              type="number"
              value={data.amount.toString()}
              onChange={(e) =>
                set(
                  'amount',
                  isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                )
              }
              min={1}
            ></Input>
          </div>
        </div>
        <div className="flex mb-4 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-20 sm:w-52">Cap</div>
          <div className="flex-1">
            <Input
              type="number"
              value={data.cap.toString()}
              onChange={(e) =>
                set(
                  'cap',
                  isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                )
              }
              min={1}
            ></Input>
          </div>
        </div>
        <div className="flex mb-4 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-20 sm:w-52">Symbol</div>
          <div className="flex-1">
            <Input
              value={data.symbol}
              onChange={(e) =>
                set(
                  'symbol',
                  isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                )
              }
              min={1}
            ></Input>
          </div>
        </div>
        <div className="flex mb-4 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-20 sm:w-52">Premine</div>
          <div className="flex-1">
            <Input
              type="number"
              value={data.premine.toString()}
              onChange={(e) =>
                set(
                  'premine',
                  isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                )
              }
              min={1}
            ></Input>
          </div>
        </div>
        <div className="flex mb-4 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-20 sm:w-52">Divisibility</div>
          <div className="flex-1">
            <Input
              type="number"
              value={data.divisibility.toString()}
              onChange={(e) =>
                set(
                  'divisibility',
                  isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                )
              }
              min={1}
            ></Input>
          </div>
        </div>
      </div>
      <div className="w-60 mx-auto flex justify-center py-4">
        <WalletConnectBus>
          <Button
            isLoading={loading}
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
