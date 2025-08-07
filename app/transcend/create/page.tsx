'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCommonStore } from '@/store/common';
import { useQuery } from '@tanstack/react-query';
import { clientApi } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useRouter } from 'next/navigation';



const CreateTranscend = () => {
  const { t, i18n } = useTranslation(); // Specify the namespace
  // console.log('Current Language:', i18n.language); // Debugging: Check current language
  // console.log('Translation for createPool.title:', t('createPool.title')); // Debugging: Check translation key

  const [bol, setBol] = useState(false);
  const [formData, setFormData] = useState({
    protocol: 'ordx',
    ticker: '',
    startBlock: '0',
    endBlock: '0',
  });
  const { address } = useReactWalletStore();
  const { network, btcFeeRate } = useCommonStore();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const router = useRouter();
  const { data: summaryData } = useQuery({
    queryKey: ['summary', address, network],
    queryFn: () => clientApi.getAddressSummary(address),
    refetchInterval: 3000,
    enabled: !!address,
  });
  const assetList = summaryData?.data || [];
  console.log('summaryQuery data', assetList);

  const { satsnetHeight } = useCommonStore();
  const contractType = 'transcend.tc';

  const handleInputChange = (key, value) => {
    // 如果切换protocol，ticker重置为空
    if (key === 'protocol') {
      setFormData((prev) => ({ ...prev, protocol: value, ticker: '' }));
    } else {
      setFormData((prev) => ({ ...prev, [key]: value }));
    }
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
      const result = await window.sat20.deployContract_Remote(contractType, JSON.stringify(params), btcFeeRate.value.toString(), bol);
    } catch (error) {
      toast.error('Contract deployment failed');
    }

  }

  // 新增：创建白聪的处理函数
  async function handleCreateWhiteSats(): Promise<void> {
    const assetName = {
      Protocol: '',
      Type: '',
      Ticker: '',
    };
    const params = {
      contractType: contractType,
      startBlock: Number(formData.startBlock),
      endBlock: Number(formData.endBlock),
      assetName,
    };
    try {
      const result = await window.sat20.deployContract_Remote(contractType, JSON.stringify(params), btcFeeRate.value.toString(), bol);
      console.log('result:', result);
      router.back();
    } catch (error) {
      toast.error('白聪创建失败');
    }
  }

  const isFormComplete = !!(formData.protocol && formData.ticker);

  // 在组件内部 return 之前，插入过滤ticker的逻辑
  // 根据protocol过滤assetList，且Type为'f'且Ticker非空
  const filteredTickerOptions = assetList.filter(
    (item) =>
      item.Name &&
      item.Name.Protocol === formData.protocol &&
      item.Name.Type === 'f' &&
      item.Name.Ticker
  );

  return (
    <div className="p-6 max-w-[1360px] mx-auto rounded-lg shadow-md">
      <div className="sticky top-0 text bg-zinc-800/50 border border-zinc-800 z-10 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-2">🚀 创建BTC穿越合约</h2>
        <button
          className="absolute top-4 right-6 text-zinc-400 hover:text-white"
          onClick={() => router.back()}
        >
          ✕
        </button>
      </div>

      <hr className="mb-6 h-1" />
      <div className="p-6 max-w-[1360px] mx-auto bg-zinc-800/50 border border-zinc-800 rounded-lg shadow-lg">
        <form className="flex flex-col gap-4" onSubmit={handleConfirm}>
          <p className="text-sm text-zinc-400 mt-2">
            {t('pages.createPool.step2.currentBlockHeight')}: <span className="font-bold text-green-500">{satsnetHeight}</span>
          </p>
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
          <Select
            onValueChange={(value) => handleInputChange('ticker', value)}
            value={formData.ticker}

            disabled={filteredTickerOptions.length === 0}
          >
            <SelectTrigger className="w-full py-4 h-12">
              {formData.ticker || t('pages.createPool.selectTicker')}
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {filteredTickerOptions.map((item) => (
                <SelectItem key={item.Name.Ticker} value={item.Name.Ticker} className="h-9 py-2">
                  {item.Name.Ticker}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.protocol === 'runes' && (
            <p className="mt-1 text-xs text-gray-400">
              {t('pages.createPool.runesTickerNote')}
            </p>
          )}
          <div className="flex gap-4 mt-4">
            <Button
              className="w-40 sm:w-48 btn-gradient"
              variant="outline"
              type="submit"
              disabled={!isFormComplete}
            >
              {t('pages.createPool.submitTemplate')}
            </Button>
            <Button
              className="w-40 sm:w-48 btn-gradient"
              variant="outline"
              type="button"
              onClick={handleCreateWhiteSats}
            >
              创建白聪
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTranscend;
