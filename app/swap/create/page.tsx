'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useCommonStore } from '@/store/common';
import { useQuery } from '@tanstack/react-query';
import { clientApi } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useRouter } from 'next/navigation';

const CreateStack = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter(); 
  const [bol, setBol] = useState(false);
  const [formData, setFormData] = useState({
    protocol: 'ordx',
    ticker: '',
    assetAmt: '',
    satValue: '',
    k: '',
  });
  const { address } = useReactWalletStore();
  const { network, btcFeeRate, btcHeight } = useCommonStore();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { data: summaryData } = useQuery({
    queryKey: ['summary', address, network],
    queryFn: () => clientApi.getAddressSummary(address),
    refetchInterval: 3000,
    enabled: !!address,
  });
  const assetList = summaryData?.data || [];
  console.log('summaryQuery data', assetList);
  const contractType = 'amm.tc';

  const handleInputChange = (key, value) => {
    // 如果切换protocol，ticker重置为空
    if (key === 'protocol') {
      setFormData((prev) => ({ ...prev, protocol: value, ticker: '' }));
    } else {
      setFormData((prev) => {
        const newData = { ...prev, [key]: value };

        // 当assetAmt或satValue改变时，自动计算K值
        if (key === 'assetAmt' || key === 'satValue') {
          const assetAmt = key === 'assetAmt' ? value : newData.assetAmt;
          const satValue = key === 'satValue' ? value : newData.satValue;

          if (assetAmt && satValue && !isNaN(Number(assetAmt)) && !isNaN(Number(satValue))) {
            const calculatedK = (Number(assetAmt) * Number(satValue)).toString();
            newData.k = calculatedK;
          } else {
            newData.k = '';
          }
        }

        return newData;
      });
    }
  };

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setShowConfirmModal(false);
    const assetName = {
      Protocol: formData.protocol,
      Type: 'f',
      Ticker: formData.ticker,
    };
    const params = {
      contractType: contractType,
      assetAmt: formData.assetAmt,
      satValue: Number(formData.satValue),
      k: formData.k,
      assetName,
    };
    try {
      const result = await window.sat20.deployContract_Remote(contractType, JSON.stringify(params), btcFeeRate.value.toString(), bol);
      console.log('result:', result);
      router.back();
      // const { txId } = result;
      // if (txId) {
      //   toast.success(`Contract deployed successfully, txid: ${txId}`);
      // } else {
      //   toast.error('Contract deployment failed');
      // }
    } catch (error) {
      // toast.error('Contract deployment failed');
    }

  }

  const isFormComplete = !!(formData.protocol && formData.ticker && formData.assetAmt && formData.satValue);

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
        <h2 className="text-xl font-bold mb-2">🚀 Create Stack</h2>
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
          {/* <div className="bg-zinc-700/50 p-4 rounded-lg border border-zinc-600 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">BTC Height:</span>
                <span className="font-bold text-green-400 text-xl">{btcHeight}</span>
              </div>
            </div> */}
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
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">Asset Amount</label>
          <Input
            placeholder="Asset Amount"
            type="text"
            value={formData.assetAmt}
            onChange={(e) => handleInputChange('assetAmt', e.target.value)}
          />
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">Sat Value</label>
          <Input
            placeholder="Sat Value"
            type="number"
            value={formData.satValue}
            onChange={(e) => handleInputChange('satValue', e.target.value)}
          />
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">K (Auto-calculated)</label>
          <Input
            placeholder="K will be calculated automatically"
            type="text"
            value={formData.k}
            disabled={true}
            className="bg-gray-700 text-gray-400"
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

export default CreateStack;
