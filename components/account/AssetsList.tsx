'use client';

import { useMemo } from 'react';
import { AssetItem } from '@/store/asset';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { getDeployedContractInfo, getContractStatus } from '@/api/market';
import { BtcPrice } from '@/components/BtcPrice';
import Link from 'next/link';
import { useCommonStore } from '@/store/common';
import AssetLogo from '@/components/AssetLogo';

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@nextui-org/react';

interface AssetListProps {
  assets: AssetItem[];
  // onListClick?: (assetId: string) => void;
}

/**
 * 处理transcend详情页面的链接生成
 * @param assetName - 资产名称
 * @returns 格式化后的详情页面链接
 */
const generateTranscendDetailHref = (assetName: string): string => {
  if (!assetName) {
    return '/transcend/detail?asset=::';
  }

  // 构建标准的资产标识符格式: Protocol:f:Ticker
  // 这里假设资产名称就是Ticker，Protocol默认为ordx
  const assetIdentifier = `ordx:f:${assetName}`;
  return `/transcend/detail?asset=${encodeURIComponent(assetIdentifier)}`;
};

// 从池子状态推导价格（sats/枚）
const deriveSatsPrice = (pool: any): number => {
  if (!pool) return 0;
  const satsValueInPool = Number(pool.SatsValueInPool ?? pool.SatsAmtInPool ?? 0);
  const amtObj = pool.AssetAmtInPool ?? pool.AssetAmt;
  let assetAmtInPool = 0;
  if (amtObj && typeof amtObj === 'object') {
    const v = Number(amtObj.Value ?? amtObj.value ?? 0);
    const p = Number(amtObj.Precision ?? amtObj.precision ?? 0);
    if (!isNaN(v)) assetAmtInPool = v / Math.pow(10, p || 0);
  }
  // 直接使用池子数据计算价格，不使用接口返回的LastDealPrice
  const derived = assetAmtInPool > 0 ? satsValueInPool / assetAmtInPool : 0;
  return derived;
};

export const AssetsList = ({ assets }: AssetListProps) => {
  const { t } = useTranslation();
  const { network } = useCommonStore();

  // 获取transcend合约URL列表
  const { data: contractURLsData } = useQuery({
    queryKey: ['transcendContractURLs', network],
    queryFn: async () => {
      const deployed = await getDeployedContractInfo();
      const contractURLs = deployed.url || (deployed.data && deployed.data.url) || [];
      return contractURLs.filter((c: string) => c.indexOf('transcend.tc') > -1);
    },
    gcTime: 0,
    refetchInterval: 120000, // 2分钟刷新一次
    refetchIntervalInBackground: false,
  });
  console.log('contractURLsData', contractURLsData);

  // 获取全部合约URL（用于价格）
  const { data: deployedUrls } = useQuery({
    queryKey: ['deployedContractURLs', network],
    queryFn: async () => {
      const deployed = await getDeployedContractInfo();
      const urls = deployed?.url || (deployed?.data && deployed.data.url) || [];
      return Array.isArray(urls) ? urls : [];
    },
    gcTime: 0,
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
  });

  const ammUrls = useMemo(() => (deployedUrls || []).filter((u: string) => typeof u === 'string' && u.includes('amm.tc')), [deployedUrls]);
  const swapUrls = useMemo(() => (deployedUrls || []).filter((u: string) => typeof u === 'string' && u.includes('swap.tc')), [deployedUrls]);

  // 拉取 AMM / 限价池 状态，构建价格表 protocol:ticker -> sats
  const { data: ammPools } = useQuery({
    queryKey: ['ammPoolsForAssets', ammUrls],
    enabled: ammUrls.length > 0,
    queryFn: async () => {
      const list = await Promise.all(ammUrls.map(async (u: string) => {
        try {
          const { status } = await getContractStatus(u);
          return status ? { ...JSON.parse(status), contractURL: u } : null;
        } catch { return null; }
      }));
      return list.filter(Boolean) as any[];
    },
    gcTime: 300000,
    placeholderData: (prev) => prev,
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
  });

  const { data: swapPools } = useQuery({
    queryKey: ['limitOrderPoolsForAssets', swapUrls],
    enabled: swapUrls.length > 0,
    queryFn: async () => {
      const list = await Promise.all(swapUrls.map(async (u: string) => {
        try {
          const { status } = await getContractStatus(u);
          return status ? { ...JSON.parse(status), contractURL: u } : null;
        } catch { return null; }
      }));
      return list.filter(Boolean) as any[];
    },
    gcTime: 300000,
    placeholderData: (prev) => prev,
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
  });

  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    const apply = (pools?: any[] | null) => {
      (pools || []).forEach(pool => {
        const name = pool?.Contract?.assetName || {};
        const proto = (name.Protocol || '').toLowerCase();
        const tick = (name.Ticker || '').toLowerCase();
        if (!proto || !tick) return;
        const key = `${proto}:${tick}`;
        const price = deriveSatsPrice(pool);
        if (price > 0) {
          if (!(key in map)) map[key] = price; // AMM优先，后续同键不覆盖
        }
      });
    };
    apply(ammPools);
    apply(swapPools);
    return map;
  }, [ammPools, swapPools]);

  // 构建包含transcend合约信息的资产列表
  const assetsWithTranscendInfo = useMemo(() => {
    if (!contractURLsData || !assets) return assets;

    return assets.map(asset => {
      const hasTranscendContract = contractURLsData.some((url: string) => {
        const lowerUrl = url.toLowerCase();
        const lowerAssetName = asset.label.toLowerCase();
        return lowerUrl.includes('transcend.tc') && lowerUrl.includes(lowerAssetName);
      });

      return {
        ...asset,
        hasTranscendContract
      };
    });
  }, [assets, contractURLsData]);

  const columns = [
    { key: 'name', label: t('common.assets_name') },
    { key: 'quantity', label: t('common.quantity') },
    { key: 'price', label: t('common.price') },
    { key: 'balance', label: t('common.balance') },
    { key: 'action', label: t('common.action') },
  ];

  return (
    <div className="relative overflow-x-auto w-full px-3 py-3 bg-zinc-900/80 rounded-lg">
      <Table aria-label="Assets List Table" cellPadding={0} cellSpacing={0} className="w-full  bg-zinc-900/50 rounded-lg shadow-md border-collapse">
        <TableHeader columns={columns} className='bg-zinc-900 '>
          {(column) => (
            <TableColumn
              key={column.key}
              align={['action', 'price', 'balance'].includes(String(column.key)) ? 'end' : 'start'}
              className={['action', 'price', 'balance'].includes(String(column.key)) ? 'h-12 px-11 text-right border-b-1 border-zinc-800 bg-transparent' : 'bg-transparent border-b-1 border-zinc-800/80 text-left pl-6'}
            >
              {column.label}
            </TableColumn>
          )}
        </TableHeader>

        <TableBody items={assetsWithTranscendInfo} emptyContent={'No assets found.'}>
          {(asset: any) => {
            const proto = (asset.protocol || 'plain').toLowerCase();
            const tick = (asset.ticker || asset.label || '').toLowerCase();
            const priceSats = (proto === 'ordx' || proto === 'runes' || proto === 'brc20' || proto === 'brc20') ? (priceMap[`${proto}:${tick}`] || 0) : 0;
            const hasTokenPrice = (proto === 'ordx' || proto === 'runes' || proto === 'brc20' || proto === 'brc20') ? priceSats > 0 : true;
            const btcValue = proto === 'plain'
              ? Number(asset.amount || 0) / 1e8
              : hasTokenPrice ? (priceSats * Number(asset.amount || 0)) / 1e8 : 0;
            return (
              <TableRow
                key={asset.id}
                className="hover:bg-accent/50 cursor-pointer border-b-1 border-zinc-800"
              >
                <TableCell>
                  <div className="flex items-center text-sm md:text-base pt-4">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AssetLogo protocol={asset.protocol} ticker={asset.ticker || asset.label} className="w-9 h-9" />
                      <AvatarFallback className="text-xl text-gray-300 font-medium bg-zinc-800">
                        {typeof asset.label === 'string' ? asset.label.slice(0, 1).toUpperCase() : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-zinc-300 ml-1">{asset.label}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-zinc-300 text-sm py-4">{asset.amount}</span>
                </TableCell>

                <TableCell className="text-right py-4">
                  {priceSats > 0 ? (
                    <span className="text-sm text-zinc-300">{priceSats.toFixed(4)}<span className='ml-1 text-xs text-zinc-500'>sats</span></span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>

                <TableCell className="text-right py-4">
                  {proto === 'plain' || hasTokenPrice ? (
                    <div className="flex flex-col leading-tight items-end">
                      <span className='text-sm'>{btcValue.toFixed(6)} <span className='text-xs font-bold text-zinc-500'>BTC</span></span>
                      <span className="text-xs text-zinc-500 mt-1">{'$'}<BtcPrice btc={btcValue} /></span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>

                <TableCell className="text-right py-4">
                  {asset.hasTranscendContract ? (
                    <Link href={generateTranscendDetailHref(asset.label)}>
                      <Button
                        size="sm"
                        color="secondary"
                        variant="outline"
                        className="text-sm w-32 mx-2 px-4"
                      >
                        {t('common.view')}
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/transcend/create">
                      <Button
                        size="sm"
                        color="secondary"
                        variant="outline"
                        className="text-sm w-32 mx-2 px-4"
                      >
                        <span className="mt-1 text-sm text-zinc-300/80 hover:text-zinc-200">{t('common.create')}</span>
                      </Button>
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            );
          }}
        </TableBody>
      </Table>
      {/* 挂单弹窗 */}
      {/* {isModalOpen && selectedAsset && (
        <SellOrderModal
          assetInfo={selectedAsset}
          open={isModalOpen}
          tickerInfo={tickerInfo}
          onOpenChange={setIsModalOpen}
        />
      )} */}
    </div>
  );
};
