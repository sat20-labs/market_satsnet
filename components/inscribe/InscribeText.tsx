import { Input, Textarea, Button, RadioGroup, Radio } from '@nextui-org/react';
import { use, useEffect, useState } from 'react';
import { useMap } from 'react-use';
import { useTranslation } from 'react-i18next';

interface InscribeTextProps {
  onNext?: () => void;
  onChange?: (data: any) => void;
  value?: { text: string; type: string }; // New prop
}
export const InscribeText = ({ onNext, onChange, value: defaultValue }: InscribeTextProps) => {
  const { t } = useTranslation();
  const [utxo, setUtxo] = useState('');
  const [value, setValue] = useState('');
  const [data, { set }] = useMap<any>({
    type: defaultValue?.type || 'single',
    text: defaultValue?.text || '',
    utxos: [],
  });
  useEffect(() => {
    onChange?.(data);
  }, [data]);

  // useEffect(() => {
  //   if (value) {
  //     set('type', value.type);
  //     set('text', value.text);
  //   }
  // }, [value]);

  useEffect(() => {
    if (utxo && value) {
      const [txid, vout] = utxo.split(':');
      set('utxos', [{ utxo, txid, vout: Number(vout), value: Number(value) }]);
    }
  }, [utxo, value]);
  return (
    <div>
      <div className="mb-4 text-center">
        <p>{t('pages.inscribe.text.single_des')}</p>
        <p>{t('pages.inscribe.text.bulk_des')}</p>
      </div>
      <div className="mb-4 flex justify-center">
        <RadioGroup
          onValueChange={(e) => set('type', e)}
          value={data.type}
          orientation="horizontal"
        >
          <Radio value="single">{t('pages.inscribe.text.single')}</Radio>
          <Radio value="bulk">{t('pages.inscribe.text.bulk')}</Radio>
        </RadioGroup>
      </div>
      {/* <div className="mb-2">
        <Input
          value={utxo}
          className="flex-1"
          onChange={(e) => {
            console.log(e);
            setUtxo(e.target.value);
          }}
          type="text"
          placeholder="utxo"
        />
      </div>
      <div className="mb-2">
        <Input
          value={value}
          className="flex-1"
          onChange={(e) => {
            setValue(e.target.value);
          }}
          type="text"
          placeholder="utxo value"
        />
      </div> */}
      <div className="py-4">
        <Textarea
          disableAnimation
          disableAutosize
          classNames={{
            input: 'resize-y min-h-[140px]',
          }}
          placeholder={t('pages.inscribe.text.textarea_placeholder')}
          value={data.text}
          onChange={(e) => set('text', e.target.value)}
        />
      </div>
      <Button
        className="mx-auto w-full sm:w-60 btn-gradient block py-4"
        color="default"
        isDisabled={!data.text}
        onClick={onNext}
      >
        {t('buttons.next')}
      </Button>
    </div>
  );
};
