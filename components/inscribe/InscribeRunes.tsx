'use client';

import { useState } from 'react';
import { Radio, RadioGroup } from '@nextui-org/react';
import { InscribeRunesMint } from './InscribeRunesMint';
import { InscribeRunesEtch } from './InscribeRunesEtch';
import { useTranslation } from 'react-i18next';
import { RunesPhaseDisplay } from '@/components/RunesPhaseDisplay';

interface InscribeRunesProps {
  onNext?: () => void;
  onChange?: (data: any) => void;
  value?: any; // Add 'value' prop
}

export const InscribeRunes = ({
  onNext,
  onChange,
  value,
}: InscribeRunesProps) => {
  const { action: defalutType, ...restValue } = value;
  
  const [type, setType] = useState(defalutType || 'mint');
  const { t } = useTranslation();
  return (
    <div className="p-4">
      {/* <RunesPhaseDisplay /> */}
      <div className="mb-4 flex justify-center">
        <RadioGroup
          orientation="horizontal"
          onValueChange={(e) => setType(e)}
          value={type}
        >
          <Radio value="mint">{t('common.mint')}</Radio>
          <Radio value="etch">{t('common.deploy')}</Radio>
        </RadioGroup>
      </div>
      <div>
        {type === 'mint' && (
          <InscribeRunesMint onNext={onNext} onChange={onChange} value={restValue} />
        )}
        {type === 'etch' && (
          <InscribeRunesEtch
            onNext={onNext}
            onChange={onChange}
            value={restValue}
          />
        )}
      </div>
    </div>
  );
};
