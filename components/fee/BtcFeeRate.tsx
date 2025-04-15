import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useState, useMemo, useEffect } from 'react';
import { BtcFeeRateItem } from './BtcFeeRateItem';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useTranslation } from 'react-i18next';

interface BtcFeeRate {
  onChange?: ({ value, type }: { value: number; type: string }) => void;
  feeRateData?: {
    fastestFee?: number;
    halfHourFee?: number;
    hourFee?: number;
    economyFee?: number;
    minimumFee?: number;
  };
  value?: number;
  feeType?: string;
}
export const BtcFeeRate = ({
  onChange,
  feeRateData,
  value,
  feeType,
}: BtcFeeRate) => {
  const { t, i18n } = useTranslation();
  const { network } = useReactWalletStore((state) => state);
  const [type, setType] = useState('Normal');
  const [customValue, setCustomValue] = useState(1);
  const [economyValue, setEconomyValue] = useState(1);
  const [normalValue, setNormalValue] = useState(1);
  const [minFee, setMinFee] = useState(1);
  const [maxFee, setMaxFee] = useState(500);

  //   {
  //     "fastestFee": 4,
  //     "halfHourFee": 4,
  //     "hourFee": 4,
  //     "economyFee": 2,
  //     "minimumFee": 1
  // }
  const clickHandler = (_type: string, value: number) => {
    if (type === _type) {
      return;
    }
    setType(_type);
    onChange?.({
      type: _type,
      value,
    });
  };
  const setRecommendFee = () => {
    console.log('setRecommendFee', feeRateData);
    const defaultFee = network === 'testnet' ? 1 : 10;
    setEconomyValue(feeRateData?.economyFee ?? defaultFee);
    setNormalValue(feeRateData?.halfHourFee ?? defaultFee);
    setCustomValue(feeRateData?.fastestFee ?? defaultFee);
    setMinFee(feeRateData?.minimumFee ?? 1);

    setType('Normal');
  };
  const list = useMemo(() => {
    return [
      {
        label: 'Economy',
        name: t('common.fee_economy'),
        value: economyValue,
      },
      {
        label: 'Normal',
        name: t('common.fee_normal'),
        value: normalValue,
      },
      {
        label: 'Custom',
        name: t('common.fee_custom'),
        value: customValue,
      },
    ];
  }, [economyValue, normalValue, customValue, i18n.language, t]);

  useEffect(() => {
    setRecommendFee();
  }, [feeRateData]);

  useEffect(() => {
    if (type === 'Custom') {
      onChange?.({ value: customValue, type: 'Custom' });
    }
  }, [customValue, type, onChange]);

  useEffect(() => {
    if (feeType === 'Custom' && value !== undefined) {
      setCustomValue(value);
      setType(feeType);
    } else if (feeType) {
      setType(feeType);
    }
  }, [feeType, value]);
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-2">
        {list.map((item) => (
          <BtcFeeRateItem
            className={
              type === item.label ? 'border-[#8000cc] bg-gray-800/90' : 'border-gray-800 bg-gray-800/90'
            }
            key={item.label}
            label={item.name}
            value={item.value}
            onClick={() => clickHandler(item.label, item.value)}
          />
        ))}
      </div>
      {/* {economyValue > 100 && (
        <div className="text-sm text-orange-400 mb-2">
          {t("pages.inscribe.fee.high_hint")}
        </div>
      )} */}
      {type === 'Custom' && (
        <div className="flex items-center gap-4">
          <Input
            type="number"
            className="w-30"
            placeholder="1"
            value={customValue.toString()}
            onChange={(e) => {
                const numValue = Number(e.target.value);
                setCustomValue(isNaN(numValue) ? 0 : numValue);
            }}
            min={minFee}
            max={maxFee}
          />
          <Slider
            step={1}
            max={maxFee}
            min={minFee}
            className="flex-1"
            value={[customValue]}
            onValueChange={(value) => {
              console.log(value);
              setCustomValue(isNaN(value[0]) ? 0 : value[0]);
            }}
          />
        </div>
      )}
    </div>
  );
};
