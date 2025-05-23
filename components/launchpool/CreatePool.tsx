'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useSupportedContracts } from '@/lib/hooks/useSupportedContracts';
import { useCommonStore } from '@/store/common';

const CreatePool = ({ closeModal }: { closeModal: () => void }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    protocol: 'ordx',
    ticker: '',
    n: '',
    limit: '',
    launchRatio: '70',
    maxSupply: '',
    startBlock: '0',
    endBlock: '0',
    assetSymbol: '',
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 使用store获取合约类型
  const { satsnetHeight } = useCommonStore();
  const { supportedContracts, isLoading } = useSupportedContracts();
  const hasLaunchpool = supportedContracts.includes('launchpool.tc');
  const contractType = 'launchpool.tc';

  const handleNextStep = () => setStep((prev) => prev + 1);
  const handlePrevStep = () => setStep((prev) => prev - 1);

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  async function handleConfirm(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): Promise<void> {
    event.preventDefault();
    // 校验 endBlock
    if (formData.endBlock !== '0' && Number(formData.endBlock) <= satsnetHeight) {
      toast.error(t('End Block must be 0 or greater than current block height'));
      return;
    }
    setShowConfirmModal(false);
    // 构造 assetName 和 launchPool
    const assetName = {
      Protocol: formData.protocol,
      Type: 'f',
      Ticker: formData.ticker,
      N: Number(formData.n),
      toString() {
        return `${this.Protocol}:${this.Type}:${this.Ticker}`;
      }
    };
    // 组装参数，字段名与后端一致
    const params = {
      contractType: contractType,
      startBlock: Number(formData.startBlock),
      endBlock: Number(formData.endBlock),
      assetProtocol: formData.protocol,
      assetName: assetName.Ticker,
      bindingSat: Number(formData.n),
      limit: Number(formData.limit),
      maxSupply: Number(formData.maxSupply),
      launchRation: Number(formData.launchRatio), // 保持 launchRation 字段名与后端一致
      ...(formData.protocol === 'runes' && formData.assetSymbol ? { assetSymbol: formData.assetSymbol } : {}), // 仅 runes 协议时加 assetSymbol
    };
    const result = await window.sat20.deployContract_Remote(contractType, JSON.stringify(params), 1)
    console.log('result:', result);
    const { txId } = result
    if (txId) {
      toast.success(`Contract deployed successfully, txid: ${txId}`);
    } else {
      toast.error('Contract deployment failed');
    }
  }

  // 当 protocol 为 runes 时，n 自动设为 1000
  useEffect(() => {
    if (formData.protocol === 'runes' && formData.n !== '1000') {
      setFormData((prev) => ({ ...prev, n: '1000' }));
    }
  }, [formData.protocol]);

  // 判断所有参数是否填写完整
  const isFormComplete = !!(formData.protocol && formData.ticker && formData.n && formData.limit && formData.launchRatio && formData.maxSupply);
  // 判断每一步是否填写完整
  const isStep1Complete = !!(formData.protocol && formData.ticker && formData.n);
  const isStep2Complete = !!(formData.limit && formData.launchRatio && formData.maxSupply);

  // 协议label映射
  const protocolLabels = { ordx: 'ORDX', runes: 'Runes' };

  return (
    <div className="p-6 max-w-[1360px] mx-auto rounded-lg shadow-md">
      {/* Fixed Header */}
      <div className="sticky top-0 bg-gray-900/50 border border-zinc-600 z-10 p-4  rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-2">{t('Create LaunchPool')}</h2>
        <p className="text-zinc-400">{t('Create a new launch pool for your asset. Please fill in the details below')}</p>
        <button
          className="absolute top-4 right-6 text-zinc-400 hover:text-white"
          onClick={closeModal}
        >
          ✕
        </button>
      </div>

      <hr className="mb-6 h-1" />
      {/* Step Content */}
      <div className="p-6 max-w-[1360px] mx-auto bg-zinc-800/50 border border-zinc-600 rounded-lg shadow-lg">
        {step === 1 && (
          <div className="mt-4">
            <div className="text-lg font-bold h-10">
              <span className="px-4 py-2 border-l-6 border-purple-500">{t('Step 1: Deploy Asset')}</span>
            </div>
            <p className="text-sm text-zinc-400 mt-2">{t('Select the protocol and provide basic details about your asset.')}</p>
            <div className="flex justify-items-start items-center mt-4 gap-4">
              <label className="block text-sm font-medium text-gray-300">{t('Protocol')}</label>
              <Select onValueChange={(value) => handleInputChange('protocol', value)} >
                <SelectTrigger className="w-56 py-4 h-12">{protocolLabels[formData.protocol] || t('Select Protocol')}</SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="ordx" className="h-9 py-2">ORDX</SelectItem>
                  <SelectItem value="runes" className="h-9 py-2">Runes</SelectItem>
                  {/* <SelectItem value="brc20" className="h-9 py-2">BRC20</SelectItem> */}
                </SelectContent>
              </Select>
            </div>
            <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('Ticker')}</label>
            <Input
              placeholder={t('Ticker')}
              value={formData.ticker}
              onChange={(e) => {
                let value = e.target.value;
                if (formData.protocol === 'runes') {
                  value = value.toUpperCase().replace(/\s+/g, '•');
                }
                handleInputChange('ticker', value);
              }}
            />
            <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('N (BindingSat)')}</label>
            <Input
              placeholder={t('N (BindingSat)')}
              type="number"
              value={formData.n}
              onChange={(e) => handleInputChange('n', e.target.value)}
              disabled={formData.protocol === 'runes'}
            />
            {formData.protocol === 'runes' && (
              <>
                <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('Asset Symbol')}</label>
                <Input
                  placeholder={t('Asset Symbol')}
                  type="text"
                  value={formData.assetSymbol}
                  onChange={(e) => handleInputChange('assetSymbol', e.target.value)}
                />
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="mt-4">
            <div className="text-base font-bold h-10">
              <span className="px-4 py-2 border-l-6 border-purple-500">{t('Step 2: Configure Smart Contract')}</span>
            </div>
            <p className="text-sm text-zinc-400 mt-2">{t('Set up the smart contract parameters for your launch pool.')}</p>
            <p className="text-sm text-zinc-400 mt-2">
              {t('Current Block Height')}: <span className="font-bold text-white">{satsnetHeight}</span>
            </p>
            <label className="block text-sm font-medium mt-4 text-gray-300 mb-1">{t('Limit')}</label>
            <Input
              placeholder={t('Limit')}
              type="number"
              value={formData.limit}
              onChange={(e) => handleInputChange('limit', e.target.value)}
            />
            <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('Launch Ratio')}</label>
            <Input
              placeholder={t('Launch Ratio')}
              type="number"
              value={formData.launchRatio}
              onChange={(e) => handleInputChange('launchRatio', e.target.value)}
            />
            <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('Max Supply')}</label>
            <Input
              placeholder={t('Max Supply')}
              type="number"
              value={formData.maxSupply}
              onChange={(e) => handleInputChange('maxSupply', e.target.value)}
            />
            <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('Start Block')}</label>
            <Input
              placeholder={t('Start Block')}
              type="number"
              value={formData.startBlock}
              onChange={(e) => handleInputChange('startBlock', e.target.value)}
            />
            <label className="block text-sm font-medium text-gray-300 mt-4 mb-1">{t('End Block')}</label>
            <Input
              placeholder={t('End Block')}
              type="number"
              value={formData.endBlock}
              onChange={(e) => handleInputChange('endBlock', e.target.value)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="mt-4">
            <div className="text-base font-bold h-10">
              <span className="px-4 py-2 border-l-6 border-purple-500">{t('Step 3: Monitor Pool')}</span>
            </div>
            <p className="text-sm text-zinc-400 mt-2">{t('Monitor the progress of your launch pool and user participation.')}</p>
            <p className="mt-4">{t('Waiting for user participation and pool completion...')}</p>
            {/* Add monitoring logic here */}
          </div>
        )}

        <div className="mt-4 py-4 flex justify-between">
          {step > 1 && <Button className="w-40 sm:w-48" variant="outline" onClick={handlePrevStep}>{t('Previous')}</Button>}
          {step === 1 && (
            <Button
              className="w-40 sm:w-48"
              variant="outline"
              onClick={handleNextStep}
              disabled={!isStep1Complete}
            >
              {t('Next')}
            </Button>
          )}
          {step === 2 && (
            <Button
              className="w-40 sm:w-48"
              variant="outline"
              onClick={handleConfirm}
              disabled={!isFormComplete || !hasLaunchpool}
            >
              {t('Submit Template')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePool;
