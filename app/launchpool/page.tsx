'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import JoinPool from '@/components/launchpool/JoinPool';
import LaunchPoolDetails from '@/components/launchpool/PoolDetail';
import LaunchPoolTemplate from '@/components/launchpool/[templateId]/TemplateDetailsClient';
import { HomeTypeTabs } from '@/components/market/HomeTypeTabs';
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
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
import DistributionList from '@/components/launchpool/DistributionList';
import ActionButtons from '@/components/launchpool/ActionButtons';
import { useCommonStore } from '@/store/common';
import { useQuery } from '@tanstack/react-query';
import { useContractStore } from '@/store/contract';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { getDeployedContractInfo, getContractStatus } from '@/api/market';

// 每页显示的数量
const PAGE_SIZE = 10;

function adaptPoolData(pool, satsnetHeight) {
  // 修正 TotalMinted 为对象的情况
  const totalMintedValue = pool.TotalMinted?.Value ?? 0;
  const maxSupply = pool.maxSupply ?? pool.totalSupply ?? 1;
  const launchRation = pool.launchRation ?? 1;
  const totalMinted = totalMintedValue / maxSupply * 100;
  const progress = Number((Math.min(totalMinted / launchRation, 1) * 100).toFixed(3));
  let poolStatus = PoolStatus.NOT_STARTED;
  const status = Number(pool.status);
  const enableBlock = Number(pool.enableBlock);
  const endBlock = Number(pool.endBlock);
  if (status === 100) {
    if (!isNaN(enableBlock) && typeof satsnetHeight === 'number') {
      if (satsnetHeight < enableBlock) {
        poolStatus = PoolStatus.NOT_STARTED;
      } else if ((endBlock === 0 || satsnetHeight <= endBlock)) {
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
    logo: pool.logo ?? '',
    assetName: pool.assetName,
    unitPrice: pool.unitPrice ?? '',
    marketCap: pool.marketCap ?? '',
    totalSupply: maxSupply,
    poolSize: pool.limit ?? pool.poolSize ?? '',
    progress,
    protocol: pool.assetName.Protocol ?? '',
    template: pool.template ?? '',
    templateName: pool.templateName ?? '',
    templateDescription: pool.templateDescription ?? '',
    templateParameters: pool.templateParameters ?? [],
    participantsList: pool.participantsList ?? [],
    startTime: Number(pool.startBlock) > 0 ? pool.startBlock : '-',
    endTime: Number(pool.endBlock) > 0 ? pool.endBlock : '-',
    poolStatus,
    deployTime: pool.deployTime ?? '',
    assetSymbol: pool.assetSymbol ?? '',
  };
}

const LaunchPool = () => {
  const { t, ready } = useTranslation(); // Specify the namespace 
  const { satsnetHeight, network } = useCommonStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const PAGE_SIZES = [10, 20, 50, 100];
  const sortList = useMemo(
    () => [
      { label: t('common.time_1D'), value: 1 },
      { label: t('common.time_7D'), value: 7 },
      { label: t('common.time_30D'), value: 30 },
    ],
    [t],
  );

  // 获取所有合约URL列表
  const { data: contractURLsData } = useQuery({
    queryKey: ['launchpoolContractURLs', network],
    queryFn: async () => {
      const deployed = await getDeployedContractInfo();
      const contractURLs = deployed.url || (deployed.data && deployed.data.url) || [];
      return contractURLs.filter((c: string) => c.indexOf('launchpool.tc') > -1);
    },
    gcTime: 0,
    refetchInterval: 60000,
  });

  // 分页获取合约状态
  const getPoolList = async ({ pageParam = 1 }) => {
    if (!contractURLsData || contractURLsData.length === 0) {
      return { pools: [], totalCount: 0 };
    }

    const startIndex = (pageParam - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
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
    queryKey: ['poolList', currentPage, network],
    queryFn: () => getPoolList({ pageParam: currentPage }),
    enabled: !!contractURLsData,
    gcTime: 0,
    refetchInterval: 60000,
  });

  const poolList = poolListData?.pools || [];
  const totalCount = poolListData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const adaptedPoolList = useMemo(() => {
    return poolList.map(pool => adaptPoolData(pool, satsnetHeight));
  }, [poolList, satsnetHeight]);

  console.log('poolList', poolList);

  const columns = [
    { key: 'assetName', label: t('pages.launchpool.asset_name') },
    { key: 'poolStatus', label: t('pages.launchpool.pool_status') },
    { key: 'totalSupply', label: t('pages.launchpool.total_supply') },
    { key: 'launchRation', label: t('pages.launchpool.launch_ration') },
    { key: 'deployTime', label: t('pages.launchpool.deploy_time') },
    { key: 'enableBlock', label: t('pages.launchpool.enable_block') },
    { key: 'startBlock', label: t('pages.launchpool.start_block') },
    { key: 'endBlock', label: t('pages.launchpool.end_block') },
    { key: 'progress', label: t('pages.launchpool.progress') },
    { key: 'action', label: t('pages.launchpool.action') },
  ];

  const [modalType, setModalType] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<any | null>(null);

  const openModal = async (type: string, pool: any | null = null) => {
    setModalType(type);
    if (type === 'template' && pool) {
      setSelectedTemplateId(pool.template);
    }
    setSelectedPool(pool);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedTemplateId(null);
    setSelectedPool(null);
  };

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

  const router = useRouter();

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
      <div className="my-2 px-2 sm:px-1 flex justify-between items-center gap-1">
        <HomeTypeTabs value={protocol} onChange={protocolChange} tabs={protocolTabs} />
        <div className="flex items-center gap-2 mr-4">
          <WalletConnectBus asChild>
            <Button className="h-10 btn-gradient" onClick={() => (window.location.href = '/launchpool/create')}>
              {t('pages.launchpool.create_pool')}
            </Button>
          </WalletConnectBus>
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
                        : adaptedPool.assetName?.Ticker?.charAt(0)?.toUpperCase() || ''}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="cursor-pointer text-primary hover:underline"
                    onClick={() => openModal('details', adaptedPool)}
                  >
                    {adaptedPool.assetName?.Ticker}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-2">
                  <Badge className={`${statusColorMap[adaptedPool.poolStatus]} text-white`}>
                    {statusTextMap[adaptedPool.poolStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.totalSupply}</TableCell>
                <TableCell className="px-4 py-2">{parseInt(adaptedPool.launchRation, 10)}%</TableCell>
                <TableCell className="px-4 py-2">
                  {adaptedPool.deployTime ? new Date(adaptedPool.deployTime * 1000).toLocaleString() : '-'}
                </TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.enableBlock > 0 ? adaptedPool.enableBlock : '-'}</TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.startTime}</TableCell>
                <TableCell className="px-4 py-2">{adaptedPool.endTime}</TableCell>
                <TableCell className="px-4 py-2 min-w-[120px]">
                  <div className="w-full bg-gray-600/50 h-2 rounded">
                    <div
                      className="bg-purple-500 h-2 rounded"
                      style={{ width: `${adaptedPool.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground">{adaptedPool.progress}%</span>
                </TableCell>
                <TableCell className="px-4 py-2 text-center">
                  <div className="flex items-center h-full gap-2">
                    <ActionButtons pool={adaptedPool} openModal={openModal} />
                    {
                      adaptedPool.progress >= 100 && (
                        <button
                          className="mt-2 text-zinc-400 hover:text-indigo-500 transition-colors"
                          onClick={() => router.push(`/swap/detail?asset=${adaptedPool.assetName.Protocol}:f:${adaptedPool.assetName.Ticker}`)}
                        >
                          <Icon icon="mdi:open-in-new" className="w-5 h-5" />
                        </button>
                      )}

                  </div>
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
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          availablePageSizes={PAGE_SIZES}
          isLoading={isLoading}
        />
      </div>

      {modalType && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="relative z-501">
            {modalType === 'join' && <JoinPool poolData={selectedPool} closeModal={closeModal} />}
            {modalType === 'details' && <LaunchPoolDetails closeModal={closeModal} poolDetails={selectedPool} />}
            {modalType === 'template' && (
              <LaunchPoolTemplate templateId={selectedTemplateId || ''} closeModal={closeModal} />
            )}
            {modalType === 'distribution' && (
              <DistributionList contractURL={selectedPool.contractURL} closeModal={closeModal} bindingSat={selectedPool.mintAmtPerSat || selectedPool.bindingSat} />
            )}
            {modalType === 'autoDistribute' && (
              <div className="bg-zinc-900 p-6 rounded-lg shadow-md max-w-[600px]">
                <h2 className="text-xl font-bold mb-4">{t('launchpool.auto_distribute_title')}</h2>
                <p className="text-zinc-400 mb-4">{t('launchpool.auto_distribute_description')}</p>
                <p className="text-amber-500 mb-4">{t('launchpool.auto_distribute_warning')}</p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={closeModal}>{t('launchpool.cancel')}</Button>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => {
                      alert(t('launchpool.auto_distribute_alert'));
                      closeModal();
                    }}
                  >
                    {t('launchpool.confirm_distribution')}
                  </Button>
                </div>
              </div>
            )}

            {modalType === 'autoRefund' && (
              <div className="bg-zinc-900 p-6 rounded-lg shadow-md max-w-[600px]">
                <h2 className="text-xl font-bold mb-4">{t('launchpool.auto_refund_title')}</h2>
                <p className="text-zinc-400 mb-4">{t('launchpool.auto_refund_description')}</p>
                <p className="text-red-500 mb-4">{t('launchpool.auto_refund_warning')}</p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={closeModal}>{t('launchpool.cancel')}</Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => {
                      alert(t('launchpool.auto_refund_alert'));
                      closeModal();
                    }}
                  >
                    {t('launchpool.confirm_refund')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LaunchPool;