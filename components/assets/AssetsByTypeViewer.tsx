'use client';

import { useEffect, useState } from 'react';
import { useAssetsByType } from '@/lib/hooks/useAssetsByType';
import { Button, Card, CardBody, CardHeader, Spinner, Chip, Tabs, Tab } from '@nextui-org/react';
import { notification } from 'antd';
import { useTranslation } from 'react-i18next';

interface AssetsByTypeViewerProps {
  initialType?: string;
  showRefreshButton?: boolean;
  autoLoad?: boolean;
}

/**
 * 按类型展示资产的组件
 */
export const AssetsByTypeViewer = ({
  initialType = '',
  showRefreshButton = true,
  autoLoad = false
}: AssetsByTypeViewerProps) => {
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState(initialType);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 使用我们的自定义钩子获取特定类型的资产
  const {
    loading,
    error,
    assets,
    selectedAsset,
    setSelectedAsset,
    loadAssets,
    refreshAssets,
    clearError
  } = useAssetsByType(activeType, autoLoad);

  // 处理错误
  useEffect(() => {
    if (error) {
      notification.error({
        message: t('notification.assets_error_title', 'Assets Error'),
        description: error.message,
        onClose: clearError
      });
    }
  }, [error, t, clearError]);

  // 加载资产数据
  const handleLoad = async () => {
    setIsRefreshing(true);
    try {
      await loadAssets();
      notification.success({
        message: t('notification.load_success', 'Load Success'),
        description: t('notification.assets_loaded', 'Your assets have been loaded')
      });
    } catch (err) {
      // 错误已在钩子内部处理
    } finally {
      setIsRefreshing(false);
    }
  };

  // 刷新资产数据
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAssets();
      notification.success({
        message: t('notification.refresh_success', 'Refresh Success'),
        description: t('notification.assets_refreshed', 'Your assets have been refreshed')
      });
    } catch (err) {
      // 错误已在钩子内部处理
    } finally {
      setIsRefreshing(false);
    }
  };

  // 处理类型切换
  const handleTypeChange = (type: string) => {
    setActiveType(type);
    setSelectedAsset(null); // 重置选中的资产
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex justify-between items-center w-full">
          <h3 className="text-lg font-semibold">
            {t('common.assets_by_type', 'Assets by Type')}
          </h3>
          <div className="flex gap-2">
            <Button
              color="primary"
              variant="flat"
              size="sm"
              isLoading={isRefreshing || loading}
              onClick={handleLoad}
            >
              {t('buttons.load', 'Load')}
            </Button>
            {showRefreshButton && (
              <Button
                color="primary"
                size="sm"
                isLoading={isRefreshing || loading}
                onClick={handleRefresh}
              >
                {t('buttons.refresh', 'Refresh')}
              </Button>
            )}
          </div>
        </div>
        
        <Tabs 
          selectedKey={activeType || 'all'} 
          onSelectionChange={(key) => handleTypeChange(key === 'all' ? '' : key.toString())}
        >
          <Tab key="all" title={t('common.all', 'All')} />
          <Tab key="ordx" title="SAT20" />
          <Tab key="runes" title="Runes" />
          <Tab key="brc20" title="BRC20" />
          <Tab key="btc" title="BTC" />
        </Tabs>
      </CardHeader>
      
      <CardBody>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label={t('common.loading', 'Loading...')} />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('common.no_assets_of_type', 'No assets found of this type')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assets.map((asset) => (
              <Card 
                key={asset.key} 
                className={`p-4 cursor-pointer ${selectedAsset?.key === asset.key ? 'border-primary' : ''}`}
                isPressable
                onPress={() => setSelectedAsset(asset.key)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{asset.label}</h4>
                    <p className="text-sm text-gray-500">{asset.amount} units</p>
                  </div>
                  <Chip color={getProtocolColor(asset.protocol)}>
                    {asset.protocol || 'BTC'}
                  </Chip>
                </div>
              </Card>
            ))}
          </div>
        )}
        
        {selectedAsset && (
          <div className="mt-6 p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">{t('common.asset_details', 'Asset Details')}</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-gray-500">{t('common.protocol', 'Protocol')}:</div>
              <div className="text-sm">{selectedAsset.protocol || 'BTC'}</div>
              
              <div className="text-sm text-gray-500">{t('common.ticker', 'Ticker')}:</div>
              <div className="text-sm">{selectedAsset.ticker}</div>
              
              <div className="text-sm text-gray-500">{t('common.amount', 'Amount')}:</div>
              <div className="text-sm">{selectedAsset.amount}</div>
              
              <div className="text-sm text-gray-500">{t('common.utxos', 'UTXOs')}:</div>
              <div className="text-sm">{selectedAsset.utxos?.length || 0}</div>
            </div>
            
            <div className="mt-4">
              <Button 
                color="primary" 
                size="sm"
                onClick={() => {
                  // 这里可以添加加载特定资产UTXO的逻辑
                  notification.info({
                    message: 'Loading UTXOs',
                    description: `Loading UTXOs for ${selectedAsset.ticker}`
                  });
                }}
              >
                {t('buttons.load_utxos', 'Load UTXOs')}
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

// 根据协议类型获取颜色
const getProtocolColor = (protocol: string): "default" | "primary" | "secondary" | "success" | "warning" | "danger" => {
  switch (protocol) {
    case 'ordx':
      return 'primary';
    case 'runes':
      return 'secondary';
    case 'brc20':
      return 'success';
    case 'ord':
      return 'warning';
    case '':
      return 'danger'; // BTC
    default:
      return 'default';
  }
};
