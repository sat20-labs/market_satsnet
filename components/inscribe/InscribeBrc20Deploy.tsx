'use client';

import { Input, Button } from '@nextui-org/react';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-use';
import { useTranslation } from 'react-i18next';
// import { CopyButton } from '@/components/CopyButton';

interface InscribeBrc20Props {
  onNext?: () => void;
  onChange?: (data: any) => void;
  value?: any; // Add 'value' prop
}

export const InscribeBrc20Deploy = ({
  onNext,
  onChange,
  value,
}: InscribeBrc20Props) => {
  const { t } = useTranslation();

  const [data, { set }] = useMap<any>({
    type: 'deploy',
    tick: '',
    limitPerMint: 10000,
    max: '',
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
    return true;
  };
  const tickChange = async (value: string) => {
    set('tick', value.trim());
  };
  const ontickBlur = async () => {
    setTickBlurChecked(false);
    const cleanValue = data.tick.replace(/[^\w\u4e00-\u9fa5]/g, '');
    set('tick', cleanValue);
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
            value={data.tick}
            className="flex-1"
            onChange={(e) => {
              tickChange(e.target.value);
            }}
            onBlur={() => {
              ontickBlur();
            }}
            maxLength={32}
            type="text"
            placeholder={t('pages.inscribe.ordx.tick_placeholder')}
          />
        </div>
        <div className="flex mb-4 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-20 sm:w-52">{t('common.deploy_max')}</div>
          <div className="flex-1">
            <Input
              type="number"
              value={data.max.toString()}
              onChange={(e) =>
                set(
                  'max',
                  isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                )
              }
              min={1}
            ></Input>
          </div>
        </div>
        <div className="flex mb-4 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-20 sm:w-52">{t('common.limit_per_mint')}</div>
          <div className="flex-1">
            <Input
              type="number"
              value={data.limitPerMint.toString()}
              onChange={(e) =>
                set(
                  'limitPerMint',
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
