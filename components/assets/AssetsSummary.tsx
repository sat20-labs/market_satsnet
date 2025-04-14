'use client';

import { useEffect, useState } from 'react';
import { useAssets } from '@/lib/hooks/useAssets';
import { Button, Card, CardBody, CardHeader, Spinner, Chip } from '@nextui-org/react';
import { notification } from 'antd';
import { useTranslation } from 'react-i18next';

/**
 * 资产摘要组件 - 展示用户资产并提供刷新功能
 */
export const AssetsSummary = () => {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 使用重构后的 useAssets 钩子
  const {
    loading,
    error,
    assetList,
    refreshL1Assets,
    clearError
  } = useAssets();

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

  // 刷新资产数据
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshL1Assets({
        resetState: true,
        refreshNs: true,
        refreshSummary: true,
        refreshUtxos: true,
        clearCache: true
      });
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

  return (
    <Card className="w-full">
      <CardHeader className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {t('common.my_assets', 'My Assets')}
        </h3>
        <Button
          color="primary"
          size="sm"
          isLoading={isRefreshing || loading}
          onClick={handleRefresh}
        >
          {t('buttons.refresh', 'Refresh')}
        </Button>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label={t('common.loading', 'Loading...')} />
          </div>
        ) : assetList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('common.no_assets', 'No assets found')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assetList.map((asset) => (
              <Card key={asset.key} className="p-4">
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
