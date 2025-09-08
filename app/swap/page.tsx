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
  // 添加数据验证，防止访问 undefined 对象的属性
  if (!pool || typeof pool !== 'object') {
    console.warn('Invalid pool data:', pool);
    return null;
  }

  const assetNameObj = pool.Contract?.assetName || {};
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

  // derive price if missing: price = satsValueInPool / assetAmtInPool
  const satsValueInPool = Number(pool.SatsValueInPool ?? 0);
  const assetAmtInPool = pool.AssetAmtInPool?.Value
    ? pool.AssetAmtInPool.Value / Math.pow(10, pool.AssetAmtInPool.Precision)
    : 0;
  const rawDealPrice = Number(pool.dealPrice ?? 0);
  const derivedDealPrice = assetAmtInPool > 0 ? satsValueInPool / assetAmtInPool : 0;
  const finalDealPrice = rawDealPrice > 0 ? rawDealPrice : derivedDealPrice;
  const volume24hBtc = Number(pool?.['24hour']?.volume ?? 0);

  return {
    ...pool,
    id: pool.contractURL ?? pool.id,
    assetName: ticker,
    protocol: protocol,
    poolStatus,
    deployTime: pool.deployTime ?? '',
    // 转为数值，便于排序
    dealPrice: Number(finalDealPrice || 0),
    satsValueInPool,
    volume24hBtc,
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
  const { data: contractURLsData, error: contractURLsError } = useQuery({
    queryKey: ['ammContractURLs', network],
    queryFn: async () => {
      try {
        const deployed = await getDeployedContractInfo();
        const contractURLs = deployed?.url || (deployed?.data && deployed.data.url) || [];

        // 验证返回的数据是否为数组
        if (!Array.isArray(contractURLs)) {
          console.warn('Contract URLs data is not an array:', contractURLs);
          return [];
        }

        return contractURLs.filter((c: string) => {
          // 确保 c 是字符串且包含 'amm.tc'
          return typeof c === 'string' && c.indexOf('amm.tc') > -1;
        });
      } catch (error) {
        console.error('Failed to get deployed contract info:', error);
        throw error;
      }
    },
    gcTime: 0,
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    retry: 2, // 失败重试2次
    retryDelay: 1000, // 重试间隔1秒
  });

  // 全量获取合约状态（全局排序，前端分页）
  const getSwapList = async () => {
    if (!contractURLsData || contractURLsData.length === 0) {
      return { pools: [], totalCount: 0 };
    }

    const statusList = await Promise.all(
      contractURLsData.map(async (item: string) => {
        try {
          const { status } = await getContractStatus(item);
          if (status) {
            try {
              const parsedStatus = JSON.parse(status);
              return {
                ...parsedStatus,
                contractURL: item,
              };
            } catch (parseError) {
              console.error(`Failed to parse status for ${item}:`, parseError, 'Raw status:', status);
              return null;
            }
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
      totalCount: validPools.length,
    };
  };

  const { data: poolListData, isLoading, error } = useQuery({
    queryKey: ['ammList', network],
    queryFn: () => getSwapList(),
    enabled: !!contractURLsData,
    gcTime: 0,
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    retry: 2, // 失败重试2次
    retryDelay: 1000, // 重试间隔1秒
  });
  console.log('poolListData', poolListData);
  const poolList = poolListData?.pools || [];

  const adaptedPoolList = useMemo(() => {
    return poolList
      .map(pool => adaptPoolData(pool, satsnetHeight))
      .filter(Boolean); // 过滤掉 null 值
  }, [poolList, satsnetHeight]);

  const columns = [
    { key: 'assetName', label: t('pages.launchpool.asset_name') },
    // { key: 'protocol', label: t('common.protocol') },
    { key: 'dealPrice', label: t('common.price') },
    { key: '24h_volume', label: t('common.24h_volume_btc') },
    { key: 'totalDealSats', label: t('common.volume_btc') },
    { key: 'totalDealCount', label: t('common.tx_order_count') },
    { key: 'satsValueInPool', label: t('common.pool_size_sats') },
    { key: 'poolStatus', label: t('pages.launchpool.pool_status') },
    { key: 'deployTime', label: t('pages.launchpool.deploy_time') },
  ];

  const [protocol, setProtocol] = useState('all');
  const protocolChange = (newProtocol) => setProtocol(newProtocol);

  const protocolTabs = [
    { label: t('pages.launchpool.all'), key: 'all' },
    { label: t('pages.launchpool.ordx'), key: 'ordx' },
    { label: t('pages.launchpool.runes'), key: 'runes' },
  ];

  const filteredPoolList = useMemo(() => {
    let list =
      protocol === 'all'
        ? adaptedPoolList
        : adaptedPoolList.filter(pool => pool.protocol === protocol);

    // 全局（所有页）按总交易量倒序；若相等再看成交笔数，然后按部署时间倒序
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

  // 前端分页切片
  const pagedPoolList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPoolList.slice(start, start + pageSize);
  }, [filteredPoolList, currentPage, pageSize]);

  const totalCount = filteredPoolList.length;
  const totalPages = Math.ceil(totalCount / pageSize);

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
        <span className="text-sm text-gray-400 mr-4">Current Bitcoin Price：<BtcPrice btc={1} className="text-green-500 font-bold" /> USDT</span>
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

      {/* 错误状态 */}
      {(error || contractURLsError) && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-red-500 mb-4">
            <h3 className="text-lg font-semibold">加载失败</h3>
            <p className="text-sm text-gray-400 mt-1">
              {error?.message || contractURLsError?.message || '网络连接异常，请检查网络后重试'}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            重新加载
          </button>
        </div>
      )}

      {/* 加载状态 */}
      {(isLoading || !contractURLsData) && !error && !contractURLsError && (
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
            {filteredPoolList.length === 0 && !isLoading && !error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-gray-400">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              pagedPoolList.map((adaptedPool, index) => {
                if (!adaptedPool) return null; // 防止空数据
                return (
                  <TableRow
                    key={adaptedPool.id ?? index}
                    className="border-b border-border hover:bg-accent text-zinc-200/88 hover:text-zinc-100 transition-colors  whitespace-nowrap"
                  >
                    <TableCell className="flex items-center gap-2 px-4 py-2">
                      <Avatar className="w-10 h-10 text-xl text-gray-300 font-medium bg-zinc-700">
                        <AvatarImage src={adaptedPool.logo} alt="Logo" />
                        <AvatarFallback>
                          {adaptedPool?.assetSymbol
                            ? String.fromCodePoint(adaptedPool.assetSymbol)
                            : adaptedPool?.Contract?.assetName?.Ticker?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Link
                        href={`/swap/detail?asset=${adaptedPool?.Contract?.assetName?.Protocol}:f:${adaptedPool?.Contract?.assetName?.Ticker}`}
                        className="cursor-pointer text-primary hover:underline"
                        prefetch={true}
                      >
                        {adaptedPool.assetName}
                        <span className='ml-1 text-zinc-500'>({adaptedPool.protocol})</span>
                      </Link>
                    </TableCell>
                    {/* <TableCell className="px-4 py-2">{adaptedPool.protocol}</TableCell> */}

                    <TableCell className="px-4 py-2">{Number(adaptedPool.dealPrice ?? 0).toFixed(4)}<span className='ml-1 text-xs text-zinc-500 font-medium'>sats</span></TableCell>

                    <TableCell className="px-4 py-2">
                      <div className="flex flex-col leading-tight gap-1">
                        <span>{((Number(adaptedPool.volume24hBtc || 0) / 1e8).toFixed(4))} <span className='text-xs text-zinc-500 font-medium'>BTC</span></span>
                        <span className="text-xs text-zinc-500 whitespace-nowrap">{'$'}<BtcPrice btc={(Number(adaptedPool.volume24hBtc || 0)) / 1e8} /></span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-2">
                      <div className="flex flex-col leading-tight gap-1">
                        <span>{((Number(adaptedPool.totalDealSats || 0)) / 1e8).toFixed(4)} <span className='text-xs text-zinc-500 font-medium'>BTC</span></span>
                        <span className="text-xs text-zinc-500 whitespace-nowrap">{'$'}<BtcPrice btc={(Number(adaptedPool.totalDealSats || 0)) / 1e8} /></span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-2">
                      <div className="flex flex-col leading-tight">
                        <span>{adaptedPool.totalDealCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="flex flex-col leading-tight gap-1">
                        <span>{Number(adaptedPool.satsValueInPool || 0) * 2}</span>
                        <span className="text-xs text-zinc-500 whitespace-nowrap">{'$'}<BtcPrice btc={(Number(adaptedPool.satsValueInPool || 0) * 2) / 1e8} /></span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge className={`${statusColorMap[adaptedPool.poolStatus]} text-white`}>
                        {statusTextMap[adaptedPool.poolStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {adaptedPool.deployTime ? new Date(adaptedPool.deployTime * 1000).toLocaleString() : '-'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
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