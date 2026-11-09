'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Chain } from '@/types';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getConfiguredNetwork, useCommonStore } from '@/store/common';
import { useQuery } from '@tanstack/react-query';
import { clientApi } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useRouter } from 'next/navigation';
import { getWalletAdapter } from '@/lib/walletAdapter';
import { registerRGB11PublicContract } from '@/api/market';

type RGB11TickerExt = {
  asset_name: { Protocol: string; Type: string; Ticker: string };
  contract_id: string;
  schema_id: string;
};

const rgb11TickerContract = (tickerInfo: any, ticker: string): RGB11TickerExt => {
  const expected = { Protocol: 'rgb11', Type: 'f', Ticker: ticker };
  const name = tickerInfo?.data?.name;
  const content = tickerInfo?.data?.content;
  if (!name || name.Protocol !== expected.Protocol || name.Type !== expected.Type ||
      name.Ticker !== expected.Ticker || typeof content !== 'string') {
    throw new Error('RGB11 ticker identity is unavailable');
  }
  const raw = Uint8Array.from(atob(content), (char) => char.charCodeAt(0));
  const ext = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)) as RGB11TickerExt;
  if (ext?.asset_name?.Protocol !== expected.Protocol || ext.asset_name.Type !== expected.Type ||
      ext.asset_name.Ticker !== expected.Ticker || !ext.contract_id || !ext.schema_id) {
    throw new Error('RGB11 ticker contract identity does not match the selected asset');
  }
  return ext;
};

const requireRGB11Registration = async (contract: RGB11TickerExt) => {
  const wallet = getWalletAdapter();
  const expectedNetwork = getConfiguredNetwork();
  if (await wallet.getNetwork() !== expectedNetwork) {
    throw new Error('Market and wallet networks do not match');
  }
  const publicContract = await wallet.exportPublicRGB11Contract(contract.contract_id);
  if (!publicContract || !/^[0-9a-f]{64}$/.test(publicContract.contract_id) ||
      publicContract.schema_id !== contract.schema_id ||
      typeof publicContract.contract_consignment_base64 !== 'string') {
    throw new Error('Validated public RGB11 contract is unavailable in this wallet');
  }
  let registrationError: unknown;
  try {
    const submitted = await registerRGB11PublicContract(publicContract.contract_consignment_base64);
    if (submitted?.code !== 0 || submitted?.registration?.contract_id !== publicContract.contract_id ||
        submitted?.registration?.schema_id !== publicContract.schema_id) {
      throw new Error('RGB11 technical registration returned a different contract identity');
    }
  } catch (error) {
    // An HTTP timeout can happen after Core commits. Only the wallet's
    // authenticated public readback can resolve that unknown outcome.
    registrationError = error;
  }
  let readback: any;
  try {
    readback = await wallet.verifyRGB11PublicContract(
      contract.contract_id, publicContract.contract_consignment_base64);
  } catch (error) {
    throw registrationError ?? error;
  }
  if (readback?.contract_id !== publicContract.contract_id ||
      readback?.schema_id !== publicContract.schema_id) {
    throw new Error('RGB11 public contract readback does not match the selected contract');
  }
  if (getConfiguredNetwork() !== expectedNetwork || await wallet.getNetwork() !== expectedNetwork) {
    throw new Error('Market or wallet network changed during RGB11 registration');
  }
};


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
  const isRGB11 = formData.protocol === 'rgb11';
  const { data: summaryData } = useQuery({
    queryKey: ['summary', address, network],
    queryFn: () => clientApi.getAddressSummary(address, Chain.BTC),
    refetchInterval: 15000, // 增加到15秒，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    enabled: !!address && !isRGB11,
  });
  const rgbTickers = useQuery({
    queryKey: ['wallet-rgb11-tickers', address, network],
    queryFn: () => getWalletAdapter().listRGB11Tickers(),
    enabled: !!address && isRGB11,
    retry: false,
  });
  useEffect(() => {
    setFormData(prev => prev.protocol === 'rgb11' && prev.ticker ? { ...prev, ticker: '' } : prev);
  }, [address, network]);

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

    // 验证ticker是否存在
    let rgb11Contract: RGB11TickerExt | undefined;
    try {
      const tickerAsset = `${formData.protocol}:f:${formData.ticker}`;
      // RGB11 identity and validated metadata are wallet-local, not an L1
      // indexer ticker. Keep the existing public registration/readback below.
      const tickerInfo = formData.protocol === 'rgb11'
        ? { code: 0, data: JSON.parse((await getWalletAdapter().getTickerInfo(tickerAsset)).ticker) }
        : await clientApi.getTickerInfo(tickerAsset);
      console.log('tickerInfo', tickerInfo);

      // 检查返回的数据结构，code为-1表示ticker不存在
      if (tickerInfo && tickerInfo.code === -1) {
        toast.error(t('notification.ticker_not_exist', { ticker: formData.ticker }));
        return;
      }

      // 检查data是否为null
      if (!tickerInfo || !tickerInfo.data) {
        toast.error(t('notification.ticker_not_exist', { ticker: formData.ticker }));
        return;
      }
      if (formData.protocol === 'rgb11') {
        rgb11Contract = rgb11TickerContract(tickerInfo, formData.ticker);
      }
    } catch (error) {
      toast.error(formData.protocol === 'rgb11' && error instanceof Error
        ? error.message : t('notification.ticker_not_exist', { ticker: formData.ticker }));
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
      if (rgb11Contract) {
        await requireRGB11Registration(rgb11Contract);
      }
      const result = await getWalletAdapter().deployContractRemote(contractType, JSON.stringify(params), btcFeeRate.value.toString(), bol);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('notification.contract_deployment_failed'));
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
      const result = await getWalletAdapter().deployContractRemote(contractType, JSON.stringify(params), btcFeeRate.value.toString(), bol);
      console.log('result:', result);
      router.back();
    } catch (error) {
      toast.error(t('notification.white_sats_creation_failed'));
    }
  }

  const isFormComplete = isRGB11 ? /^[0-9a-f]{64}$/.test(formData.ticker) : !!(formData.protocol && formData.ticker);
  const tickerOptions = isRGB11
    ? (rgbTickers.data ?? []).map(({ ticker, displayName }) => ({
        value: ticker,
        label: displayName === ticker ? ticker : `${displayName} (${ticker.slice(0, 8)}…${ticker.slice(-6)})`,
      }))
    : (summaryData?.data ?? [])
        .filter(({ Name }) => Name?.Protocol === formData.protocol && Name.Type === 'f' && Name.Ticker)
        .map(({ Name }) => ({ value: Name.Ticker, label: Name.Ticker }));

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

      {/* 创建白聪的独立框 */}
      <div className="p-6 max-w-[1360px] mx-auto bg-zinc-800/50 border border-zinc-800 rounded-lg shadow-lg mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-300">⚡ 快速创建白聪</h3>
        <p className="text-sm text-zinc-400 mb-4">
          无需选择协议和代币，直接创建白聪合约
        </p>
        <Button
          className="w-40 sm:w-48 btn-gradient"
          variant="outline"
          type="button"
          onClick={handleCreateWhiteSats}
        >
          创建白聪
        </Button>
      </div>

      {/* 原有的表单框 */}
      <div className="p-6 max-w-[1360px] mx-auto bg-zinc-800/50 border border-zinc-800 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-300">📋 创建指定代币合约</h3>
        <form className="flex flex-col gap-4" onSubmit={handleConfirm}>
          <p className="text-sm text-zinc-400 mt-2">
            {t('pages.createPool.step2.currentBlockHeight')}: <span className="font-bold text-green-500">{satsnetHeight}</span>
          </p>
          <div className="flex items-center gap-4">
            <label className="block text-sm font-medium text-gray-300">{t('pages.createPool.protocol.title')}</label>
            <Select onValueChange={(value) => handleInputChange('protocol', value)} value={formData.protocol}>
              <SelectTrigger className="w-56 py-4 h-12">{formData.protocol === 'rgb11' ? 'RGB11' : t(`pages.createPool.protocol.${formData.protocol}`) || t('pages.createPool.selectProtocol')}</SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <SelectItem value="ordx" className="h-9 py-2">{t('pages.createPool.protocol.ordx')}</SelectItem>
                <SelectItem value="runes" className="h-9 py-2">{t('pages.createPool.protocol.runes')}</SelectItem>
                <SelectItem value="brc20" className="h-9 py-2">{t('pages.createPool.protocol.brc20')}</SelectItem>
                <SelectItem value="rgb11" className="h-9 py-2">RGB11</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('pages.createPool.ticker')}</label>
          <Combobox
            value={formData.ticker}
            onValueChange={(value) => handleInputChange('ticker', value)}
            options={tickerOptions}
            placeholder={t('pages.createPool.selectTicker')}
            searchPlaceholder="Search or type ticker..."
            emptyText="No ticker found. You can type a custom ticker."
            className="w-full"
          />
          {isRGB11 && rgbTickers.isError && <p role="alert">{rgbTickers.error.message}</p>}
          {formData.protocol === 'runes' && (
            <p className="mt-1 text-xs text-gray-400">
              {t('pages.createPool.runesTickerNote')}
            </p>
          )}
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

export default CreateTranscend;
