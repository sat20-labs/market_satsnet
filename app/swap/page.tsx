'use client';

import { useMemo, useState } from 'react';
import { HomeTypeTabs } from '@/components/market/HomeTypeTabs';
import { Badge } from '@/components/ui/badge';
import { PoolStatus, statusTextMap, statusColorMap } from '@/types/launchpool';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CustomPagination } from '@/components/ui/CustomPagination';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useCommonStore } from '@/store/common';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { BtcPrice } from '@/components/BtcPrice';
import { getDeployedContractInfo, getContractStatus } from '@/api/market';
import { Button } from '@/components/ui/button';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';

// 每页显示的数量
const PAGE_SIZE = 10;

function adaptPoolData(pool, satsnetHeight) {
  const assetNameObj = pool.Contract.assetName || {};
  const ticker = assetNameObj.Ticker || '-';
  const protocol = assetNameObj.Protocol || '-';
  let poolStatus = PoolStatus.NOT_STARTED;
  const status = Number(pool.status);
  const enableBlock = Number(pool.enableBlock);
  if (status === 100) {
    if (!isNaN(enableBlock) && typeof satsnetHeight === 'number') {
      if (satsnetHeight < enableBlock) {
        poolStatus = PoolStatus.NOT_STARTED;
      } else {
        poolStatus = PoolStatus.ACTIVE;
      }
    }
  } else if (status === 200) {
    poolStatus = PoolStatus.COMPLETED;
  } else if (status === -1) {
    poolStatus = PoolStatus.CLOSED;
  } else if (status === -2) {
    poolStatus = PoolStatus.EXPIRED;
  } else {
    poolStatus = PoolStatus.NOT_STARTED;
  }

  return {
    ...pool,
    id: pool.contractURL ?? pool.id,
    assetName: ticker,
    protocol: protocol,
    poolStatus,
    deployTime: pool.deployTime ?? '',
    // 转为数值，便于排序
    dealPrice: Number(pool.dealPrice ?? 0),
    satsValueInPool: Number(pool.SatsValueInPool ?? 0),
    totalDealSats: Number(pool.TotalDealSats ?? 0),
    totalDealCount: Number(pool.TotalDealCount ?? 0),
  };
}


const Swap = () => {
  const { t } = useTranslation(); // Specify the namespace 
  const { satsnetHeight, network } = useCommonStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const PAGE_SIZES = [10, 20, 50, 100];
  // 获取所有合约URL列表
  const { data: contractURLsData } = useQuery({
    queryKey: ['ammContractURLs', network],
    queryFn: async () => {
      const deployed = await getDeployedContractInfo();
      const contractURLs = deployed.url || (deployed.data && deployed.data.url) || [];
      return contractURLs.filter((c: string) => c.indexOf('amm.tc') > -1);
    },
    gcTime: 0,
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
  });

  // 分页获取合约状态
  const getSwapList = async ({ pageParam = 1 }) => {
    if (!contractURLsData || contractURLsData.length === 0) {
      return { pools: [], totalCount: 0 };
    }

    const startIndex = (pageParam - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageURLs = contractURLsData.slice(startIndex, endIndex);

    // 并发请求当前页的合约状态
    const statusList = await Promise.all(
      pageURLs.map(async (item: string) => {
        try {
          const { status } = await getContractStatus(item);
          if (status) {
            return {
              ...JSON.parse(status),
              contractURL: item,
            };
          }
          return null;
        } catch (error) {
          console.error(`Failed to get contract status for ${item}:`, error);
          return null;
        }
      })
    );

    const validPools = statusList.filter(Boolean);
    return {
      pools: validPools,
      totalCount: contractURLsData.length,
      nextPage: endIndex < contractURLsData.length ? pageParam + 1 : undefined,
    };
  };

  const { data: poolListData, isLoading } = useQuery({
    queryKey: ['ammList', currentPage, pageSize, network],
    queryFn: () => getSwapList({ pageParam: currentPage }),
    enabled: !!contractURLsData,
    gcTime: 0,
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
  });
  console.log('poolListData', poolListData);
  const poolList = poolListData?.pools || [];
  const totalCount = poolListData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const adaptedPoolList = useMemo(() => {
    return poolList.map(pool => adaptPoolData(pool, satsnetHeight));
  }, [poolList, satsnetHeight]);

  const columns = [
    { key: 'assetName', label: t('pages.launchpool.asset_name') },
    { key: 'protocol', label: t('Protocol') },
    { key: 'poolStatus', label: t('pages.launchpool.pool_status') },
    { key: 'dealPrice', label: t('Price') },
    { key: 'satsValueInPool', label: t('Sats In Pool') },
    { key: 'totalDealSats', label: t('Total Deal Sats') },
    { key: 'totalDealCount', label: t('Total Deal Count') },
    { key: 'deployTime', label: t('pages.launchpool.deploy_time') },
  ];

  const [protocol, setProtocol] = useState('all');
  const protocolChange = (newProtocol) => setProtocol(newProtocol);

  const protocolTabs = [
    { label: t('pages.launchpool.all'), key: 'all' },
    { label: t('pages.launchpool.ordx'), key: 'ordx' },
    { label: t('pages.launchpool.runes'), key: 'runes' },
  ];

  // 默认按“交易量(总成交sats)”倒序；若相等再看成交笔数，然后按部署时间倒序
  const filteredPoolList = useMemo(() => {
    let list =
      protocol === 'all'
        ? adaptedPoolList
        : adaptedPoolList.filter(pool => pool.protocol === protocol);

    return list.slice().sort((a, b) => {
      const vA = Number(a.totalDealSats ?? 0);
      const vB = Number(b.totalDealSats ?? 0);
      if (vA !== vB) return vB - vA;

      const cA = Number(a.totalDealCount ?? 0);
      const cB = Number(b.totalDealCount ?? 0);
      if (cA !== cB) return cB - cA;

      return Number(b.deployTime ?? 0) - Number(a.deployTime ?? 0);
    });
  }, [adaptedPoolList, protocol]);


  // 处理分页变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="p-4 relative">
      <div className="mb-2 px-2 flex items-center">
        <span className="text-base font-semibold mr-4">当前BTC价格：<BtcPrice btc={1} className="text-green-500 font-bold" /> USDT</span>
      </div>
      <div className="my-2 px-2 sm:px-1 flex justify-between items-center gap-1">
        <HomeTypeTabs value={protocol} onChange={protocolChange} tabs={protocolTabs} />
        <div className="flex items-center gap-2 mr-4">
          {/* <WalletConnectBus asChild>
            <Button className="h-10 btn-gradient" onClick={() => (window.location.href = '/swap/create')}>
              Create Stack
            </Button>
          </WalletConnectBus> */}
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
        </div>
      )}

      <div className="relative overflow-x-auto w-full px-3 py-4 bg-zinc-950/50 rounded-lg">
        <Table className="w-full table-auto border-collapse rounded-lg shadow-md min-w-[900px] bg-zinc-950/50">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className="px-4 py-2 text-left font-semibold text-muted-foreground bg-zinc-900 whitespace-nowrap"
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPoolList.map((adaptedPool, index) => (
              <TableRow
                key={adaptedPool.id ?? index}
                className="border-b border-border hover:bg-accent transition-colors  whitespace-nowrap"
              >
                <TableCell className="flex items-center gap-2 px-4 py-2">
                  <Avatar className="w-10 h-10 text-xl text-gray-300 font-medium bg-zinc-700">
                    <AvatarImage src={adaptedPool.logo} alt="Logo" />
                    <AvatarFallback>
                      {adaptedPool?.assetSymbol
                        ? String.fromCodePoint(adaptedPool.assetSymbol)
                        : adaptedPool.Contract?.assetName?.Ticker?.charAt(0)?.toUpperCase() || ''}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    href={`/swap/detail?asset=${adaptedPool?.Contract?.assetName?.Protocol}:f:${adaptedPool?.Contract?.assetName?.Ticker}`}
                    className="cursor-pointer text-primary hover:underline"
                    prefetch={true}
                  >
                    {adaptedPool.assetName}
                  </Link>
                </TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.protocol}</TableCell>
                <TableCell className="px-4 py-2">
                  <Badge className={`${statusColorMap[adaptedPool.poolStatus]} text-white`}>
                    {statusTextMap[adaptedPool.poolStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.dealPrice}</TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.satsValueInPool}</TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.totalDealSats}</TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.totalDealCount}</TableCell>
                <TableCell className="px-4 py-2">
                  {adaptedPool.deployTime ? new Date(adaptedPool.deployTime * 1000).toLocaleString() : '-'}
                </TableCell>
              </TableRow>

            ))}
          </TableBody>
        </Table>
      </div>

      {/* 分页组件 */}
      <div className="mt-6">
        <CustomPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSize={pageSize}
          availablePageSizes={PAGE_SIZES}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default Swap;