import { Input, Slider } from '@nextui-org/react';
import { useState, useMemo, useEffect, use } from 'react';
import { BtcFeeRateItem } from './BtcFeeRateItem';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useTranslation } from 'react-i18next';

interface BtcFeeRate {
  onChange?: ({ value, type }: any) => void;
  feeRateData?: any;
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
  const setRecommendFee = async () => {
    console.log('setRecommendFee', feeRateData);
    const defaultFee = network === 'testnet' ? 1 : 10;
    setEconomyValue(feeRateData?.economyFee || defaultFee);
    setNormalValue(feeRateData?.halfHourFee || defaultFee);
    setCustomValue(feeRateData?.fastestFee || defaultFee);
    setMinFee(feeRateData?.minimumFee || 1);
    // feeRateData?.forEach(({ title, feeRate }) => {
    //   if (feeRate) {
    //     feeRate = Number(feeRate);
    //   }
    //   if (feeRate < 1.02) {
    //     feeRate = 1.02;
    //   }
    //   if (title === 'Slow') {
    //     setEconomyValue(feeRate || defaultFee);
    //   } else if (title === 'Normal') {
    //     setNormalValue(feeRate || defaultFee);
    //     console.log(feeRate);
    //     onChange?.(feeRate || defaultFee);
    //   } else if (title === 'Fast') {
    //     // setMaxFee(Number(parseInt(feeRate || defaultFee)));
    //     setCustomValue(Math.ceil(feeRate || defaultFee));
    //   }
    // });

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
  }, [economyValue, normalValue, customValue, i18n.language]);

  useEffect(() => {
    setRecommendFee();
  }, [feeRateData]);

  useEffect(() => {
    if (type === 'Custom') {
      onChange?.({ value: customValue, type: 'Custom' });
    }
  }, [customValue]);

  useEffect(() => {
    if (feeType === 'Custom' && value) {
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
            onChange={(e) => setCustomValue(Number(e.target.value))}
          />
          <Slider
            size="sm"
            step={1}
            maxValue={maxFee}
            minValue={minFee}
            className="flex-1"
            value={[customValue]}
            onChange={(e) => {
              console.log(e);
              setCustomValue(isNaN(e[0]) ? 0 : e[0]);
            }}
          />
        </div>
      )}
    </div>
  );
};
