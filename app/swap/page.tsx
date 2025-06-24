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
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useCommonStore } from '@/store/common';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { BtcPrice } from '@/components/BtcPrice';
import { getDeployedContractInfo, getContractStatus } from '@/api/market';

function adaptPoolData(pool, satsnetHeight) {
  // 适配 contractStatus 结构
  console.log('pool', pool);
  const assetNameObj = pool.Contract.assetName || {};
  const ticker = assetNameObj.Ticker || '-';
  const protocol = assetNameObj.Protocol || '-';
  // 状态适配
  let poolStatus = PoolStatus.NOT_STARTED;
  const status = Number(pool.status);
  const enableBlock = Number(pool.enableBlock);
  const endBlock = Number(pool.endBlock);
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
    dealPrice: pool.dealPrice ?? '-',
    satsValueInPool: pool.SatsValueInPool ?? '-',
    totalDealSats: pool.TotalDealSats ?? '-',
    totalDealCount: pool.TotalDealCount ?? '-',
    // 其它字段可按需补充
  };
}

const Swap = () => {
  const { t, ready } = useTranslation(); // Specify the namespace 
  const router = useRouter();
  console.log('Translation for launchpool.asset_name:', t('launchpool.asset_name')); // Debugging: Check translation key

  const { satsnetHeight } = useCommonStore();
  const sortList = useMemo(
    () => [
      { label: t('common.time_1D'), value: 1 },
      { label: t('common.time_7D'), value: 7 },
      { label: t('common.time_30D'), value: 30 },
    ],
    [t],
  );

  const getSwapList = async () => {
    const deployed = await getDeployedContractInfo();
    const contractURLs = deployed.url || (deployed.data && deployed.data.url) || [];
    const list = contractURLs.filter((c: string) => c.indexOf('amm.tc') > -1);
    const statusList = await Promise.all(
      list.map(async (item: string) => {
        const { status } = await getContractStatus(item);

        if (status) {
          return {
            ...JSON.parse(status),
            contractURL: item,
          };
        }
        return null;
      })
    );
    return statusList.filter(Boolean);
  };

  const { data: poolList = [] } = useQuery({
    queryKey: ['swapList'],
    queryFn: getSwapList,
    gcTime: 0,
    // refetchInterval: 60000,
  });

  const adaptedPoolList = useMemo(() => {
    return poolList.map(pool => adaptPoolData(pool, satsnetHeight));
  }, [poolList, satsnetHeight]);
  console.log('adaptedPoolList', satsnetHeight);
  console.log('adaptedPoolList', poolList);
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

  const filteredPoolList = useMemo(() => {
    let list = protocol === 'all' ? adaptedPoolList : adaptedPoolList.filter(pool => pool.protocol === protocol);
    return list.slice().sort((a, b) => Number(b.deployTime) - Number(a.deployTime));
  }, [adaptedPoolList, protocol]);
  console.log('filteredPoolList', filteredPoolList);

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
              Create LimitOrder
            </Button>
          </WalletConnectBus> */}
        </div>
      </div>
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
                        : adaptedPool.assetName?.Ticker?.charAt(0)?.toUpperCase() || ''}
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
    </div>
  );
};

export default Swap;