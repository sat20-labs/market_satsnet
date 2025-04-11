import { Button } from '@nextui-org/react';
import { InscribeCheckItem } from './InscribeCheckItem';
import { useTranslation } from 'react-i18next';
import { getFeeDiscount } from '@/api';
import { notification } from 'antd';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useState } from 'react';
import { tryit } from 'radash';

interface Brc20SetpOneProps {
  list: any[];
  type: any;
  metadata: any;
  onNext?: () => void;
  onBack?: () => void;
  onDiscount?: (d) => void;
}
export const InscribeStepTwo = ({
  list,
  type = 'text',
  metadata,
  onNext,
  onBack,
  onDiscount,
}: Brc20SetpOneProps) => {
  const { t } = useTranslation();
  const { address } = useReactWalletStore();
  const [loading, setLoading] = useState(false);
  const projectMap = {
    rarepizza: 1,
  };
  const project = metadata?.tick?.toLowerCase();
  const handleNext = async () => {
    setLoading(true);
    const [error, result] = await tryit(getFeeDiscount)({
      address,
      project_id: projectMap[project] || 0,
    });
    setLoading(false);
    if (error || result?.code !== 200) {
      notification.error({
        message: t('notification.system_error'),
      });
      console.error(error);
      return;
    }
    const feeDiscount = result?.data?.discount || 0;
    onDiscount?.(feeDiscount);
    onNext?.();
  };
  return (
    <div>
      <div className="text-lg font-bold text-center">
        {t('pages.inscribe.step_two.title')}
      </div>
      <div className="text-md text-center">
        {t('pages.inscribe.step_two.des', {
          num: list.length,
          type: type,
        })}
      </div>
      <div className="max-h-[30rem] overflow-y-auto">
        <div className="w-full py-4 flex flex-col gap-4">
          {list.map((item, index) => (
            <InscribeCheckItem
              key={index}
              label={index + 1}
              value={item.show}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 py-4">
        <Button size="md" color="primary" onClick={onBack}>
          {t('buttons.back')}
        </Button>
        <Button
          isLoading={loading}
          size="md"
          color="secondary"
          className='w-full sm:w-60 btn-gradient'
          onClick={handleNext}
        >
          {t('buttons.next')}
        </Button>
      </div>
    </div>
  );
};
