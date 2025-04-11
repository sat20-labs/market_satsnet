'use client';

import { useState } from 'react';
import { Radio, RadioGroup } from '@nextui-org/react';
import { InscribeOrdxMint } from './InscribeOrdxMint';
import { InscribeOrdxDeploy } from './InscribeOrdxDeploy';
import { useTranslation } from 'react-i18next';
interface InscribeOrdxProps {
  onNext?: () => void;
  onChange?: (data: any) => void;
  value?: any; // Add 'value' prop
}

export const InscribeOrdx = ({
  onNext,
  onChange,
  value,
}: InscribeOrdxProps) => {
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
          <InscribeOrdxMint onNext={onNext} onChange={onChange} value={restValue} />
        )}
        {type === 'deploy' && (
          <InscribeOrdxDeploy
            onNext={onNext}
            onChange={onChange}
            value={restValue}
          />
        )}
      </div>
    </div>
  );
};
