'use client';

import { useState } from 'react';
import { Radio, RadioGroup } from '@nextui-org/react';
import { InscribeBrc20Mint } from './InscribeBrc20Mint';
import { InscribeBrc20Deploy } from './InscribeBrc20Deploy';
import { useTranslation } from 'react-i18next';
interface InscribeBrc20Props {
  onNext?: () => void;
  onChange?: (data: any) => void;
  value?: any; // Add 'value' prop
}

export const InscribeBrc20 = ({
  onNext,
  onChange,
  value,
}: InscribeBrc20Props) => {
  const { type: defalutType, ...restValue } = value;
  
  const [type, setType] = useState(defalutType || 'mint');
  const { t } = useTranslation();
  return (
    <div className="p-4">
      {/* <div className='text-red-500 text-center'>部署错误，请先不要铸造RarePizza,等重新部署</div> */}
      <div className="mb-4 flex justify-center">
        <RadioGroup
          orientation="horizontal"
          onValueChange={(e) => setType(e)}
          value={type}
        >
          <Radio value="mint">{t('common.mint')}</Radio>
          <Radio value="deploy">{t('common.deploy')}</Radio>
        </RadioGroup>
      </div>
      <div>
        {type === 'mint' && (
          <InscribeBrc20Mint onNext={onNext} onChange={onChange} value={restValue} />
        )}
        {type === 'deploy' && (
          <InscribeBrc20Deploy
            onNext={onNext}
            onChange={onChange}
            value={restValue}
          />
        )}
      </div>
    </div>
  );
};
