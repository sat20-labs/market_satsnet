import { Input, Button, Slider } from '@nextui-org/react';
import { useEffect, useState, useMemo, use } from 'react';
import { useMap } from 'react-use';
import { notification } from 'antd';
import { ordx } from '@/api';
import { tryit } from 'radash';
import { useTranslation } from 'react-i18next';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';

interface InscribeTextProps {
  onNext?: () => void;
  onChange?: (data: any) => void;
  value?: any; // Add 'value' prop
}
export const InscribeRunesMint = ({
  onNext,
  onChange,
  value = {},
}: InscribeTextProps) => {
  const { t } = useTranslation();
  const { network } = useReactWalletStore();
  const [errorText, setErrorText] = useState('');
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removeArr, setRemoveArr] = useState<string[]>([]);
  const [tickBlurChecked, setTickBlurChecked] = useState(true);
  const [tickChecked, setTickChecked] = useState(false);
  const [data, { set }] = useMap<any>({
    type: 'rune',
    action: 'mint',
    runeId: '',
    runeName: '',
    amount: '1',
    repeat: 1,
    ...(value || {}), // Initialize with 'value' prop
  });
  const maxRepeat = 24;

  const checkTick = async () => {
    const { runeName } = data;
    const [err, res] = await tryit(ordx.getTickInfo)({
      asset: `runes:f:${runeName.replace(':', '_')}`,
      network,
    });
    console.log('checkTick', err, res);
    if (err || res.code !== 0) {
      setErrorText('rune is not exisited');
      return false;
    }
    const { displayname, name, limit, maxSupply, totalMinted } = res.data ?? {};
    const currentMint = Number(data.repeat) * Number(limit);
    if (Number(totalMinted) + currentMint > Number(maxSupply)) {
      setErrorText('Mint amount exceeds the maximum supply');
      return false;
    }
    set('runeId', name?.Ticker?.replace('_', ':'));
    set('runeName', displayname);
    set('amount', limit);
    return true;
  };
  const onTickChange = (value) => {
    value = value.replace(/[^a-zA-Z •]/g, '').toUpperCase();
    value = value.replace(' ', '•');
    set('runeName', value);
  };
  const nextHandler = async () => {
    setErrorText('');
    if (!tickChecked) {
      const checkStatus = await checkTick();

      if (!checkStatus) {
        return;
      }
      setTimeout(() => {
        setTickChecked(true);
      }, 100);
    } else {
      setLoading(true);

      setLoading(false);
      onNext?.();
    }
  };

  console.log('checkStatus', tickChecked);

  const ontickBlur = async () => {
    setTickBlurChecked(false);
    if (data.runeName) {
      await checkTick();
    }
    setTickBlurChecked(true);
  };
  const addDot = () => {
    const { runeName } = data;
    set('runeName', `${runeName}•`);
  };
  useEffect(() => {
    setTickChecked(false);
    onChange?.(data);
  }, [data]);

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center mb-4">
          <div className="w-20 sm:w-52">{t('common.tick')}</div>
          <Input
            value={data.runeName}
            className="flex-1"
            maxLength={32}
            type="text"
            placeholder={`Enter 'AAAAA•AAAAA•AAAAA' or 'BBBBB BBBBB BBBBB' here`}
            onBlur={ontickBlur}
            endContent={
              <Button size="sm" onClick={addDot}>
                •
              </Button>
            }
            onChange={(e) => {
              onTickChange(e.target.value);
            }}
          />
        </div>
        <div className="flex items-center mb-4">
          <div className="w-20 sm:w-52">{t('common.amount')}</div>
          <Input
            type="number"
            className="flex-1"
            readOnly
            value={data.amount}
            min={1}
            onChange={(e) => {
              set(
                'amount',
                isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
              );
            }}
          ></Input>
        </div>
        <div>
          <div className="flex items-center mb-4">
            <div className="w-52">{t('common.repeat_mint')}</div>
            <div className="flex-1">
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={data.repeat.toString()}
                  isDisabled={data.isSpecial}
                  onChange={(e) => {
                    set(
                      'repeat',
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
                  value={[data.repeat]}
                  className="max-w-md"
                  onChange={(e) => {
                    console.log(e);
                    set('repeat', isNaN(e[0]) ? 0 : e[0]);
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
            isLoading={loading}
            color="default"
            isDisabled={!data.runeName}
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
