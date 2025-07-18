'use client';

import { useEffect, useState , useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCommonStore } from '@/store/common';
import { generateMempoolUrl } from '@/utils/url';
import { Chain } from '@/types';
import { hideStr } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Icon } from '@iconify/react';
import { BtcPrice } from "../BtcPrice";

const CreatePool = ({ closeModal }: { closeModal: () => void }) => {
  const { t, i18n } = useTranslation(); // Specify the namespace
  console.log('Current Language:', i18n.language); // Debugging: Check current language
  console.log('Translation for createPool.title:', t('createPool.title')); // Debugging: Check translation key

  const [bol, setBol] = useState(true);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    protocol: 'ordx',
    ticker: '',
    n: '1000',
    mintAmtPerSat: '1',
    limit: '',
    launchRatio: '70',
    maxSupply: '',
    startBlock: '0',
    endBlock: '0',
    assetSymbol: '',
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [contractURL, setcontractURL] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorLaunchRatio, setErrorLaunchRatio] = useState('');

  const { satsnetHeight, btcFeeRate } = useCommonStore();
  const contractType = 'launchpool.tc';

  const handleNextStep = () => setStep((prev) => prev + 1);
  const handlePrevStep = () => setStep((prev) => prev - 1);

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const { data: poolStatusData } = useQuery({
    queryKey: ['poolStatus', contractURL],
    queryFn: async () => {
      if (!contractURL || step !== 3) return null;
      const result = await window.sat20.getDeployedContractStatus(contractURL);
      if (result && result.contractStatus) {
        return JSON.parse(result.contractStatus);
      }
      return null;
    },
    enabled: !!contractURL && step === 3,
    refetchInterval: 3000,
  });

  const statusTextMap = {
    '-2': t('pages.status.expired'),
    '-1': t('pages.status.closed'),
    '0': t('pages.status.init'),
    '100': t('pages.status.ready'),
    '200': t('pages.status.closing'),
  };

  async function handleConfirm(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
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
      N: Number(formData.n),
      toString() {
        return `${this.Protocol}:${this.Type}:${this.Ticker}`;
      }
    };
    const params = {
      contractType: contractType,
      startBlock: Number(formData.startBlock),
      endBlock: Number(formData.endBlock),
      assetName: {
        Protocol: formData.protocol,
        Type: 'f',
        Ticker: formData.ticker,
      },
      mintAmtPerSat: Number(formData.mintAmtPerSat),
      limit: Number(formData.limit),
      maxSupply: Number(formData.maxSupply),
      launchRation: Number(formData.launchRatio),
      ...(formData.protocol === 'runes' && formData.assetSymbol ? { assetSymbol: formData.assetSymbol.charCodeAt(0) } : {}),
      ...(formData.protocol === 'ordx' ? { bindingSat: Number(formData.n) } : {}),
    };
    const result = await window.sat20.deployContract_Remote(contractType, JSON.stringify(params), btcFeeRate, bol);
    console.log('result:', result);
    const { contractURL, txId } = result;
    if (txId) {
      toast.success(`Contract deployed successfully, txid: ${txId}`);
      setcontractURL(contractURL);
      setStep(3);
    } else {
      toast.error('Contract deployment failed');
    }
  }

  const isFormComplete = !!(formData.protocol && formData.ticker && formData.n && formData.limit && formData.launchRatio && formData.maxSupply && !errorLaunchRatio);
  const isStep1Complete = !!(formData.protocol && formData.ticker && formData.n);
  const isStep2Complete = !!(formData.limit && formData.launchRatio && formData.maxSupply);

  const estimatedPoolFunds = useMemo(() => {
    const maxSupply = Number(formData.maxSupply);
    const launchRatio = Number(formData.launchRatio) / 100; // 转换为百分比
    const mintAmtPerSat = Number(formData.mintAmtPerSat);
  
    if (maxSupply > 0 && launchRatio > 0 && mintAmtPerSat > 0) {
      const sats = Math.floor((maxSupply * launchRatio) / mintAmtPerSat); // 计算池子资金量（单位：sats）
      const btc = sats / 1e8; // 转换为 BTC
      return btc.toFixed(8).replace(/\.?0+$/, ''); // 精确到 8 位并去掉多余的 0
    }
    return '0'; // 如果数据无效，返回 0
  }, [formData.maxSupply, formData.launchRatio, formData.mintAmtPerSat]);

   const estimatedPoolFundsUsd = estimatedPoolFunds ? <BtcPrice btc={estimatedPoolFunds} /> : 0;

  return (
    <div className="p-6 max-w-[1360px] mx-auto rounded-lg shadow-md">
      <div className="sticky top-0 text bg-zinc-800/50 border border-zinc-800 z-10 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-2">🚀 {t('pages.createPool.title')}</h2>
        <p className="text-zinc-400">{t('pages.createPool.description')}</p>
        <button
          className="absolute top-4 right-6 text-zinc-400 hover:text-white"
          onClick={closeModal}
        >
          ✕
        </button>
      </div>

      <hr className="mb-6 h-1" />
      <div className="p-6 max-w-[1360px] mx-auto bg-zinc-800/50 border border-zinc-800 rounded-lg shadow-lg">
        {step === 1 && (
          <div className="mt-4">
            <div className="text-lg font-bold h-10">
              <span className="px-4 py-2 border-l-6 border-purple-500">{t('pages.createPool.step1.title')}</span>
            </div>
            <p className="text-sm text-zinc-400 mt-2">{t('pages.createPool.step1.description')}</p>
            <div className="flex flex-col mt-4 gap-2"> 
  
              <div className="flex items-center gap-4">
              <label className="block text-sm font-medium text-gray-300">
                {t('pages.createPool.network.title')}
              </label>
                <Select value={bol ? 'btc' : 'satsnet'} onValueChange={(value) => setBol(value === 'btc')}>
                  <SelectTrigger className="w-56 py-4 h-12">
                    {bol ? t('pages.createPool.network.btc') : t('pages.createPool.network.satsnet')}
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="btc" className="h-9 py-2">
                      {t('pages.createPool.network.btc')}
                    </SelectItem>
                    <SelectItem value="satsnet" className="h-9 py-2">
                      {t('pages.createPool.network.satsnet')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-gray-400 text-xs">{t('pages.createPool.deployFeeTip')}</p>
            </div>

            <div className="flex justify-items-start items-center mt-4 gap-4">
              <label className="block text-sm font-medium text-gray-300">{t('pages.createPool.protocol.title')}</label>
              <Select onValueChange={(value) => handleInputChange('protocol', value)} >
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

             <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('pages.createPool.maxSupply')}</label>
              <Input
                placeholder={t('pages.createPool.maxSupply')}
                type="number"
                value={formData.maxSupply}
                onChange={(e) => handleInputChange('maxSupply', e.target.value)}
              />            
               {formData.protocol === 'ordx' && (
                  <>
                    <div className="flex items-center mt-4">
                      <label className="block text-sm font-medium text-gray-300 mb-1">{t('pages.createPool.bindingSat')}</label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="ml-1 cursor-pointer align-middle inline-flex"><Icon icon="lucide:help-circle" className="w-4 h-4 text-zinc-400" /></span>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={4}>
                          {t("pages.createPool.step1.bindingSatTips")}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      placeholder={t('pages.createPool.bindingSat')}
                      type="number"
                      value={formData.n}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (value > 0 && Math.log10(value) % 1 === 0) {
                          handleInputChange('n', value.toString());
                          setErrorMessage('');
                        } else {
                          setErrorMessage(t('pages.createPool.bindingSatError'));
                        }
                      }}
                      disabled={false}
                    />
                    {errorMessage && (
                      <p className="mt-1 text-xs text-red-400 gap-2">* {errorMessage}</p>
                    )}
                  </>
                )}
                 {/* <p className="mt-1 text-xs text-gray-400">{t('pages.createPool.mintAmtPerSatSuggest', { min: Math.floor(Number(formData.n || 1000) / 10), max: Math.floor(Number(formData.n || 1000) / 1000) })}</p> */}

            {formData.protocol === 'runes' && (
              <>
                <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('pages.createPool.assetSymbol')}</label>
                <Input
                  placeholder={t('pages.createPool.assetSymbol')}
                  type="text"
                  value={formData.assetSymbol}
                  maxLength={1}
                  onChange={(e) => handleInputChange('assetSymbol', e.target.value.replace(/./g, c => c.length === 1 ? c : ''))}
                />
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="mt-4">
            <div className="text-base font-bold h-10">
              <span className="px-4 py-2 border-l-6 border-purple-500">{t('pages.createPool.step2.title')}</span>
            </div>
            <p className="text-sm text-zinc-400 mt-2">{t('pages.createPool.step2.description')}</p>
            <p className="text-sm text-zinc-400 mt-2">
              {t('pages.createPool.step2.currentBlockHeight')}: <span className="font-bold text-white">{satsnetHeight}</span>
            </p>
            <div className="flex items-center mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">{t('pages.createPool.mintAmtPerSat')}</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 cursor-pointer align-middle inline-flex"><Icon icon="lucide:help-circle" className="w-4 h-4 text-zinc-400" /></span>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={4}>
                    {t("pages.createPool.step2.mintAmtPerSatTips")}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  placeholder={t('pages.createPool.mintAmtPerSat')}
                  type="number"
                  value={formData.mintAmtPerSat}
                  onChange={(e) => handleInputChange('mintAmtPerSat', e.target.value)}
                />

            <label className="block text-sm font-medium mt-4 text-gray-300 mb-1">{t('pages.createPool.limit')}</label>
            <Input
              placeholder={t('pages.createPool.limit')}
              type="number"
              value={formData.limit}
              onChange={(e) => handleInputChange('limit', e.target.value)}
            />
            <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('pages.createPool.launchRatio')}</label>
            <Input
              placeholder={t('pages.createPool.launchRatio')}
              type="number"
              value={formData.launchRatio}
              onChange={(e) => {
                const value = e.target.value;
                handleInputChange('launchRatio', value);
                if (Number(value) < 60 || Number(value) > 90) {
                  setErrorLaunchRatio(t('pages.createPool.launchRatioError'));
                } else {
                  setErrorLaunchRatio('');
                }
              }}
            />

            {errorLaunchRatio && (
              <p className="mt-1 text-xs text-red-400 gap-2">* {errorLaunchRatio}</p>
            )}

            <p className="mt-1 text-xs text-gray-400">{t('pages.createPool.step2.estimatedPoolFunds')} : 
              <span className='text-red-500'> {estimatedPoolFunds} </span>
              <span className='text-zinc-500'>BTC</span> 
              <span className='text-zinc-500 ml-2'>( ${estimatedPoolFundsUsd} )</span>
             </p>
            
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
          </div>
        )}

        {step === 3 && (
          <div className="mt-4">
            <div className="text-base font-bold h-10">
              <span className="px-4 py-2 border-l-6 border-purple-500">{t('pages.createPool.step3.title')}</span>
            </div>
            <p className="text-sm text-zinc-400 mt-2">{t('Monitor the progress of your launch pool and user participation.')}</p>
            <p className="mt-4">{t('Waiting for user participation and pool completion...')}</p>
            {contractURL && (
              <div className="mt-6 p-4 bg-zinc-900 rounded-lg border border-zinc-700">
                <div className="mb-2 font-bold text-white">{t('pages.createPool.step3.poolStatus')}</div>
                <div className="text-sm text-zinc-300 mb-2">{t('pages.createPool.step3.status')}: {statusTextMap[String(poolStatusData?.status)] ?? poolStatusData?.status ?? '-'}</div>
                <div className="text-sm text-zinc-300 mb-2">
                  DeployTickerTxId: {poolStatusData?.DeployTickerTxId ? (
                    <a href={generateMempoolUrl({
                      network: 'testnet',
                      path: `tx/${poolStatusData.DeployTickerTxId}`,
                      chain: Chain.BTC,
                      env: 'dev',
                    })} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{hideStr(poolStatusData.DeployTickerTxId, 6)}</a>
                  ) : '-'}
                </div>
                <div className="text-sm text-zinc-300 mb-2">
                  MintTxId: {poolStatusData?.MintTxId ? (
                    <a href={generateMempoolUrl({
                      network: 'testnet',
                      path: `tx/${poolStatusData.MintTxId}`,
                      chain: Chain.BTC,
                      env: 'dev',
                    })} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{hideStr(poolStatusData.MintTxId, 6)}</a>
                  ) : '-'}
                </div>
                <div className="text-sm text-zinc-300 mb-2">
                  AnchorTxId: {poolStatusData?.AnchorTxId ? (
                    <a href={generateMempoolUrl({
                      network: 'testnet',
                      path: `tx/${poolStatusData.AnchorTxId}`,
                      chain: Chain.SATNET,
                      env: 'dev',
                    })} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{hideStr(poolStatusData.AnchorTxId, 6)}</a>
                  ) : '-'}
                </div>
              </div>              
            )}
            <p className='text-red-500 text-xs font-bold mt-3'>{t('pages.createPool.step3.note')}: <span className='ml-1 text-zinc-300'>{t('pages.createPool.step3.noteDescription')}</span></p>
          </div>
        )}

        <div className="mt-4 py-4 flex justify-between">
          {step > 1 && step < 3 && <Button className="w-40 sm:w-48" variant="outline" onClick={handlePrevStep}>{t('pages.createPool.previous')}</Button>}
          {step === 1 && (
            <Button
              className="w-40 sm:w-48 btn-gradient"
              variant="outline"
              onClick={handleNextStep}
              disabled={!isStep1Complete}
            >
              {t('pages.createPool.next')}
            </Button>
          )}
          {step === 2 && (
            <Button
              className="w-36 sm:w-48 btn-gradient"
              variant="outline"
              onClick={handleConfirm}
              disabled={!isFormComplete}
            >
              {t('pages.createPool.submitTemplate')}
            </Button>
          )}
          {step === 3 && (
            <>
              <Button
                className="w-36 sm:w-48"
                variant="outline"
                onClick={closeModal}
                disabled={!isFormComplete}
              >
                {t('pages.createPool.close')}
              </Button>

              <Button
                className="w-36 sm:w-48 btn-gradient"
                variant="outline"
                onClick={closeModal}
                disabled={!isFormComplete}
              >
                {t('pages.createPool.viewPool')}
              </Button>            
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePool;

