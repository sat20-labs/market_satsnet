'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCommonStore } from '@/store/common';


const CreateLimitOrder =   ({ closeModal }: { closeModal: () => void }) => {
  const { t, i18n } = useTranslation(); // Specify the namespace
  console.log('Current Language:', i18n.language); // Debugging: Check current language
  console.log('Translation for createPool.title:', t('createPool.title')); // Debugging: Check translation key

  const [bol, setBol] = useState(false);
  const [formData, setFormData] = useState({
    protocol: 'ordx',
    ticker: '',
    startBlock: '0',
    endBlock: '0',
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  useEffect(() => {
    const getParams = async () => {
      const result = await window.sat20.getSwapParams();
    }
  }, []);
  const { satsnetHeight } = useCommonStore();
  const contractType = 'swap.tc';

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (formData.endBlock !== '0' && Number(formData.endBlock) <= satsnetHeight) {
      toast.error(t('End Block must be 0 or greater than current block height'));
      return;
    }
    setShowConfirmModal(false);
    const assetName = {
      Protocol: formData.protocol,
      Type: 'f',
      Ticker: formData.ticker,
    };
    const params = {
      contractType: contractType,
      startBlock: Number(formData.startBlock),
      endBlock: Number(formData.endBlock),
      assetName,
    };
    try {
      const result = await window.sat20.deployContract_Remote(contractType, JSON.stringify(params), 1, bol);
      console.log('result:', result);
      const { txId } = result;
      if (txId) {
        toast.success(`Contract deployed successfully, txid: ${txId}`);
      } else {
        toast.error('Contract deployment failed');
      }
    } catch (error) {
      toast.error('Contract deployment failed');
    }

  }

  const isFormComplete = !!(formData.protocol && formData.ticker);

  return (
    <div className="p-6 max-w-[1360px] mx-auto rounded-lg shadow-md">
      <div className="sticky top-0 text bg-zinc-800/50 border border-zinc-800 z-10 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-2">🚀 Create Swap</h2>
        <button
          className="absolute top-4 right-6 text-zinc-400 hover:text-white"
          onClick={closeModal}
        >
          ✕
        </button>
      </div>

      <hr className="mb-6 h-1" />
      <div className="p-6 max-w-[1360px] mx-auto bg-zinc-800/50 border border-zinc-800 rounded-lg shadow-lg">
        <form className="flex flex-col gap-4" onSubmit={handleConfirm}>
          <div className="flex items-center gap-4">
            <label className="block text-sm font-medium text-gray-300">{t('pages.createPool.protocol.title')}</label>
            <Select onValueChange={(value) => handleInputChange('protocol', value)} value={formData.protocol}>
              <SelectTrigger className="w-56 py-4 h-12">{t(`pages.createPool.protocol.${formData.protocol}`) || t('pages.createPool.selectProtocol')}</SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="ordx" className="h-9 py-2">{t('pages.createPool.protocol.ordx')}</SelectItem>
                <SelectItem value="runes" className="h-9 py-2">{t('pages.createPool.protocol.runes')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('pages.createPool.ticker')}</label>
          <Input
            placeholder={t('pages.createPool.ticker')}
            value={formData.ticker}
            onChange={(e) => {
              let value = e.target.value;
              if (formData.protocol === 'runes') {
                value = value.toUpperCase().replace(/\s+/g, '•');
              }
              handleInputChange('ticker', value);
            }}
          />
          {formData.protocol === 'runes' && (
            <p className="mt-1 text-xs text-gray-400">
              {t('pages.createPool.runesTickerNote')}
            </p>
          )}
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('pages.createPool.startBlock')}</label>
          <Input
            placeholder={t('pages.createPool.startBlock')}
            type="number"
            value={formData.startBlock}
            onChange={(e) => handleInputChange('startBlock', e.target.value)}
          />
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('pages.createPool.endBlock')}</label>
          <Input
            placeholder={t('pages.createPool.endBlock')}
            type="number"
            value={formData.endBlock}
            onChange={(e) => handleInputChange('endBlock', e.target.value)}
          />
          <Button
            className="w-40 sm:w-48 btn-gradient mt-4"
            variant="outline"
            type="submit"
            disabled={!isFormComplete}
          >
            {t('pages.createPool.submitTemplate')}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateLimitOrder;
