'use client';

import { useMemo, useState } from 'react';
import SellOrderModal from './SellOrderModal'; // 引入挂单弹窗组件
import { AssetItem } from '@/store/asset';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { getDeployedContractInfo } from '@/api/market';
import Link from 'next/link';
import { useCommonStore } from '@/store/common';

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

export const AssetsList = ({ assets }: AssetListProps) => {
  const { t, ready } = useTranslation();
  const { network } = useCommonStore();
  const [isModalOpen, setIsModalOpen] = useState(false); // 控制弹窗显示状态
  const [selectedAsset, setSelectedAsset] = useState<any>(null); // 当前选中的资产
  const [tickerInfo, setTickerInfo] = useState<any>(null); // 当前选中的资产

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
    { key: 'balance', label: t('common.balance') },
    { key: 'price', label: t('common.price') },
    { key: 'action', label: t('common.action') },
  ];

  return (
    <div className='bg-zinc-950/50 text-zinc-200 rounded-xl shadow-lg py-2'>
      <Table aria-label="Assets List Table" cellPadding={0} cellSpacing={0} className="w-full  bg-zinc-950/50 rounded-lg shadow-md border-collapse">
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.key}
              align={column.key === 'action' || column.key === 'price' ? 'end' : 'start'}
              className={column.key === 'action' || column.key === 'price' ? 'h-12 px-11 text-right bg-zinc-900' : 'text-left pl-6 bg-zinc-900'}
            >
              {column.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody items={assetsWithTranscendInfo} emptyContent={'No assets found.'}>
          {(asset: any) => {
            return (
              <TableRow
                key={asset.id}
                className="hover:bg-accent/50 cursor-pointer border-b-1 border-zinc-800"
              >
                <TableCell>
                  <div className="flex items-center text-sm md:text-base">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback className="text-xl text-gray-300 font-medium bg-zinc-800">
                        {typeof asset.label === 'string' ? asset.label.slice(0, 1).toUpperCase() : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-zinc-300 ml-1">{asset.label}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-zinc-300">{asset.amount}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm text-gray-400">-</span>
                </TableCell>
                <TableCell className="text-right">
                  {asset.hasTranscendContract ? (
                    <Link href={generateTranscendDetailHref(asset.label)}>
                      <Button
                        size="sm"
                        color="secondary"
                        variant="outline"
                        className="text-sm w-20 mx-2 px-4"
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
                        className="text-sm w-20 mx-2 px-4"
                      >
                        {t('common.create')}
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
