'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useCommonStore } from '@/store/common';
import { useQuery } from '@tanstack/react-query';
import { clientApi } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

const BatchSendPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { address } = useReactWalletStore();
  const { network, btcFeeRate } = useCommonStore();
  
  const [formData, setFormData] = useState({
    protocol: 'ordx',
    ticker: '',
    amount: '',
    addresses: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // 获取用户资产列表
  const { data: summaryData } = useQuery({
    queryKey: ['summary', address, network],
    queryFn: () => clientApi.getAddressSummary(address),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
    enabled: !!address,
  });
  console.log('summaryData', summaryData);
  const assetList = summaryData?.data || [];

  // 根据协议过滤资产选项
  const filteredAssetOptions = assetList.filter(
    (item) => {
      if (formData.protocol === 'btc') {
        // BTC资产：Protocol为空，Type为"*"，Ticker为空
        return item.Name &&
               item.Name.Protocol === "" &&
               item.Name.Type === "*" &&
               item.Name.Ticker === "";
      } else {
        // 其他协议资产
        return item.Name &&
               item.Name.Protocol === formData.protocol &&
               item.Name.Type === 'f' &&
               item.Name.Ticker;
      }
    }
  );


  // 解析地址输入
  const parseAddresses = (addressInput: string): string[] => {
    if (!addressInput.trim()) return [];
    
    return addressInput
      .split(/[\n,;]/) // 支持换行符、逗号、分号分隔
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);
  };

  const parsedAddresses = parseAddresses(formData.addresses);

  const handleInputChange = (key: string, value: string) => {
    if (key === 'protocol') {
      if (value === 'btc') {
        // 选择BTC协议时，自动选择btc资产
        setFormData((prev) => ({ ...prev, protocol: value, ticker: 'btc' }));
      } else {
        // 选择其他协议时，清空资产选择
        setFormData((prev) => ({ ...prev, protocol: value, ticker: '' }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      toast.error(t('pages.tools.batch_send.connect_wallet'));
      return;
    }

    if (parsedAddresses.length === 0) {
      toast.error(t('pages.tools.batch_send.enter_addresses'));
      return;
    }

    if (!formData.ticker || !formData.amount) {
      toast.error(t('pages.tools.batch_send.select_asset'));
      return;
    }

    setIsLoading(true);

    try {
      // 构建资产名称字符串
      const assetName = formData.protocol === 'btc' ? '::' : `${formData.protocol}:f:${formData.ticker}`;

      // 构建资产数量列表，与地址列表一一对应
      const amountList = parsedAddresses.map(() => formData.amount);

      // 调用 sat20 批量发送方法
      const result = await window.sat20.batchSendAssetsV2_SatsNet(
        parsedAddresses,
        assetName,
        amountList
      );

      console.log('Batch send result:', result);
      toast.success(t('pages.tools.batch_send.success'));
      if (result.txId) {
        toast.info(`TxID: ${result.txId}`, {
          duration: 6000,
        });
      }
      
      // 清空表单数据（保留协议和资产选择）
      setFormData(prev => ({
        ...prev,
        amount: '',
        addresses: '',
      }));
    } catch (error) {
      console.error('Batch send error:', error);
      toast.error(error instanceof Error ? error.message : t('pages.tools.batch_send.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = !!(
    address && // 必须连接钱包
    formData.protocol && 
    formData.ticker && 
    formData.amount && 
    parsedAddresses.length > 0
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="sticky top-0 bg-zinc-800/50 border border-zinc-800 z-10 p-4 rounded-lg shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Icon icon="mdi:send-multiple" className="text-2xl" />
              {t('pages.tools.batch_send.title')}
            </h1>
            <p className="text-zinc-400 mt-1">{t('pages.tools.batch_send.description')}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-white"
          >
            <Icon icon="mdi:close" className="text-xl" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* 表单卡片 */}
        <Card className="bg-zinc-800/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">{t('pages.tools.batch_send.title')}</CardTitle>
            <CardDescription className="text-zinc-400">
              {t('pages.tools.batch_send.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 协议选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  {t('pages.tools.batch_send.protocol')}
                </label>
                <Select 
                  onValueChange={(value) => handleInputChange('protocol', value)} 
                  value={formData.protocol}
                >
                  <SelectTrigger className="w-full">
                    {formData.protocol === 'ordx' ? 'SAT20 (ordx)' : 
                     formData.protocol === 'runes' ? 'Runes' : 'BTC'}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordx">SAT20 (ordx)</SelectItem>
                    <SelectItem value="runes">Runes</SelectItem>
                    <SelectItem value="btc">BTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 资产选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  {t('pages.tools.batch_send.asset')}
                </label>
                {!address ? (
                  <div className="w-full p-3 border border-zinc-600 rounded-md bg-zinc-700/50 text-zinc-400 text-sm">
                    {t('pages.tools.batch_send.connect_wallet')}
                  </div>
                ) : (
                  <>
                    <Select
                      onValueChange={(value) => handleInputChange('ticker', value)}
                      value={formData.ticker}
                      disabled={filteredAssetOptions.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        {formData.ticker ? (() => {
                          const selectedAsset = filteredAssetOptions.find(item => {
                            const key = formData.protocol === 'btc' ? 'btc' : item.Name.Ticker;
                            return key === formData.ticker;
                          });
                          if (selectedAsset) {
                            const displayName = formData.protocol === 'btc' ? 'BTC' : selectedAsset.Name.Ticker;
                            const balance = selectedAsset.Amount || '0';
                            return `${displayName} (余额: ${balance})`;
                          }
                          return formData.ticker;
                        })() : t('pages.tools.batch_send.select_asset_placeholder')}
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAssetOptions.map((item) => {
                          const displayName = formData.protocol === 'btc' ? 'BTC' : item.Name.Ticker;
                          const key = formData.protocol === 'btc' ? 'btc' : item.Name.Ticker;
                          const balance = item.Amount || '0';
                          return (
                            <SelectItem key={key} value={key}>
                              <div className="flex justify-between items-center w-full">
                                <span>{displayName}</span>
                                <span className="text-zinc-400 ml-2">余额: {balance}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {filteredAssetOptions.length === 0 && (
                      <p className="text-xs text-zinc-500">
                        {t('pages.tools.batch_send.no_assets')}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* 发送数量 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  {t('pages.tools.batch_send.amount_per_address')}
                </label>
                <Input
                  placeholder="Enter amount to send to each address"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                />
              </div>

              {/* 地址输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  {t('pages.tools.batch_send.recipient_addresses')}
                </label>
                <Textarea
                  placeholder="Enter addresses separated by newlines, commas, or semicolons"
                  value={formData.addresses}
                  onChange={(e) => handleInputChange('addresses', e.target.value)}
                  className="min-h-[120px]"
                />
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Icon icon="mdi:information" />
                  <span>{t('pages.tools.batch_send.separator_info')}</span>
                </div>
              </div>

              {/* 地址预览 */}
              {parsedAddresses.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    {t('pages.tools.batch_send.parsed_addresses')} ({parsedAddresses.length})
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {parsedAddresses.map((addr, index) => (
                      <Badge key={index} variant="secondary" className="mr-1 mb-1">
                        {addr.slice(0, 8)}...{addr.slice(-8)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 提交按钮 */}
              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="w-full btn-gradient"
              >
                {isLoading ? (
                  <>
                    <Icon icon="mdi:loading" className="animate-spin mr-2" />
                    {t('pages.tools.batch_send.sending')}
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:send" className="mr-2" />
                    {t('pages.tools.batch_send.send_to_addresses', { count: parsedAddresses.length })}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default BatchSendPage;
