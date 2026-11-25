'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import JoinPool from '@/components/launchpool/JoinPool';
import LaunchPoolDetails from '@/components/launchpool/PoolDetail';
import LaunchPoolTemplate from '@/components/launchpool/[templateId]/TemplateDetailsClient';
import { HomeTypeTabs } from '@/components/market/HomeTypeTabs';
import { HomeMintTabs } from '@/components/market/HomeMintTabs';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CustomPagination } from '@/components/ui/CustomPagination';
import { useTranslation } from 'react-i18next';
import DistributionList from '@/components/launchpool/DistributionList';
import ActionButtons from '@/components/launchpool/ActionButtons';
import { getConfiguredNetwork, useCommonStore } from '@/store/common';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { getAssetLogos, getContractStatus } from '@/api/market';
import { marketList } from '@/api/marketView';
import AssetMetadataEditModal from '@/components/AssetMetadataEditModal';
import { AssetLogoImage } from '@/components/AssetLogo';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { isAddressInAssetEditWhitelist } from '@/utils';
import ClosePoolDialog from '@/components/launchpool/ClosePoolDialog';
import { toast } from 'sonner';
import { getWalletAdapter } from '@/lib/walletAdapter';

// 每页显示的数量
const PAGE_SIZE = 10;

function adaptPoolData(pool: any, satsnetHeight: number) {
  // 修正 TotalMinted 为对象的情况
  const totalMintedValue = pool?.TotalMinted?.Value ?? 0;
  const maxSupply = pool?.maxSupply ?? pool?.totalSupply ?? 1;
  const launchRation = Number(pool?.launchRation ?? 1) || 1;

  const mintedPercent = (totalMintedValue / maxSupply) * 100; // 已铸占比（0-100）
  const progress = Number(
    (Math.min(mintedPercent / launchRation, 1) * 100).toFixed(3),
  ); // 进度（0-100）

  // 计算池子状态
  let poolStatus = PoolStatus.NOT_STARTED;
  const status = Number(pool?.status);
  const enableBlock = Number(pool?.enableBlock);
  const endBlock = Number(pool?.endBlock);

  if (status === 100) {
    if (!isNaN(enableBlock) && typeof satsnetHeight === 'number') {
      if (satsnetHeight < enableBlock) {
        poolStatus = PoolStatus.NOT_STARTED;
      } else if (endBlock === 0 || satsnetHeight <= endBlock) {
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

  const assetNameObj = pool?.assetName || {};
  const ticker = assetNameObj.Ticker || '-';
  const protocol = assetNameObj.Protocol || '-';
  const displayName = protocol.toLowerCase() === 'brc20' ? (pool.displayName || ticker) : ticker;

  return {
    ...pool,
    id: pool?.contractURL ?? pool?.id,
    logo: pool?.logo ?? '',
    assetName: displayName,
    assetNameObj: assetNameObj,
    unitPrice: pool?.unitPrice ?? '',
    marketCap: pool?.marketCap ?? '',
    totalSupply: maxSupply,
    poolSize: pool?.limit ?? pool?.poolSize ?? '',
    progress,
    protocol: protocol,
    template: pool?.template ?? '',
    templateName: pool?.templateName ?? '',
    templateDescription: pool?.templateDescription ?? '',
    templateParameters: pool?.templateParameters ?? [],
    participantsList: pool?.participantsList ?? [],
    startTime: Number(pool?.startBlock) > 0 ? pool?.startBlock : '-',
    endTime: Number(pool?.endBlock) > 0 ? pool?.endBlock : '-',
    poolStatus,
    deployTime: pool?.deployTime ?? '',
    assetSymbol: pool?.assetSymbol ?? '',
  };
}

// 移除缩写逻辑
function abbreviateTicker(name: string): string {
  return name || '';
}

const TickerName = ({
  name,
  ticker,
  protocol,
  className = "",
  abbreviate = false
}: {
  name: string,
  ticker: string,
  protocol: string,
  className?: string,
  abbreviate?: boolean
}) => {
  const is5Byte = ticker?.length === 5 && protocol?.toLowerCase() === 'brc20';
  const displayName = abbreviate ? abbreviateTicker(name) : name;
  const parts = (displayName || "").split(' ');

  return (
    <div className={`flex flex-col items-start ${className}`}>
      <div className={`flex items-center flex-wrap font-medium`}>
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && <span className="text-zinc-500 font-normal">%20</span>}
          </span>
        ))}
      </div>
      {is5Byte && (
        <div className="mt-1 w-[46px] flex justify-center py-0.5 rounded text-[10px] bg-orange-500/10 text-orange-500 border border-orange-500/20 leading-none font-medium">
          5-byte
        </div>
      )}
    </div>
  );
};

export default function LaunchPoolProgressSortTest() {
  const { t } = useTranslation();
  const { satsnetHeight, network } = useCommonStore();
  const router = useRouter();
  const { address } = useReactWalletStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const PAGE_SIZES = [10, 20, 50, 100];

  // 协议筛选
  const [protocol, setProtocol] = useState('all');
  const protocolChange = (newProtocol: string) => {
    setProtocol(newProtocol);
    setCurrentPage(1);
  };
  const protocolTabs = [
    { label: t('pages.launchpool.all'), key: 'all' },
    { label: t('pages.launchpool.ordx'), key: 'ordx' },
    { label: t('pages.launchpool.runes'), key: 'runes' },
    { label: t('pages.launchpool.brc20'), key: 'brc20' },
    { label: t('pages.launchpool.rgb'), key: 'rgb11' },
  ];

  // ===== 新增：状态筛选（全部 / 未激活 / 正在铸造 / 铸造已完成）=====
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'inactive' | 'minting' | 'completed'
  >('minting');
  const statusTabs = [
    { label: 'All', key: 'all' },
    { label: 'Inactive', key: 'inactive' },
    { label: 'Minting', key: 'minting' },
    { label: 'Completed', key: 'completed' },
  ];
  const handleStatusChange = (val: string) => {
    if (
      val === 'all' ||
      val === 'inactive' ||
      val === 'minting' ||
      val === 'completed'
    ) {
      setStatusFilter(val);
      setCurrentPage(1);
    }
  };
  // ===== 新增结束 =====

  const effectiveNetwork = getConfiguredNetwork() ?? network;
  const { data: poolListData, isLoading, refetch } = useQuery({
    queryKey: ['marketList', 'launchpool', effectiveNetwork],
    queryFn: () => marketList('launchpool'),
    staleTime: 60_000,
    refetchInterval: 120000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  // 适配数据
  const adaptedPoolList = useMemo(() => {
    return (
      poolListData?.map((pool: any) =>
        adaptPoolData(pool, satsnetHeight),
      ) || []
    );
  }, [poolListData, satsnetHeight]);

  // ===== 新增：排序状态 =====
  const [sortKey, setSortKey] = useState<'progress' | 'deployTime'>('progress');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const handleSort = (key: 'progress' | 'deployTime') => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc'); // 新列默认降序
    }
  };
  // ===== 新增结束 =====

  // 全局过滤 + 排序（由 sortKey + sortOrder 决定）
  const filteredPoolList = useMemo(() => {
    // 协议过滤
    let list =
      protocol === 'all'
        ? adaptedPoolList
        : adaptedPoolList.filter((p: any) => p.protocol === protocol);

    // ===== 新增：状态过滤 =====
    if (statusFilter !== 'all') {
      list = list.filter((p: any) => {
        switch (statusFilter) {
          case 'inactive':
            return p.poolStatus === PoolStatus.NOT_STARTED;
          case 'minting':
            return p.poolStatus === PoolStatus.ACTIVE;
          case 'completed':
            return (
              p.poolStatus === PoolStatus.COMPLETED ||
              p.poolStatus === PoolStatus.CLOSED
            );
          default:
            return true;
        }
      });
    }
    // ===== 新增结束 =====

    // 排序
    return list.slice().sort((a: any, b: any) => {
      const va = Number(a[sortKey]) || 0;
      const vb = Number(b[sortKey]) || 0;
      if (va !== vb) return sortOrder === 'asc' ? va - vb : vb - va;

      const secondaryKey = sortKey === 'progress' ? 'deployTime' : 'progress';
      const sa = Number(a[secondaryKey]) || 0;
      const sb = Number(b[secondaryKey]) || 0;
      return sb - sa;
    });
  }, [adaptedPoolList, protocol, statusFilter, sortKey, sortOrder]);

  // 前端分页切片
  const pagedPoolList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPoolList.slice(start, start + pageSize);
  }, [filteredPoolList, currentPage, pageSize]);

  const logoKeys = useMemo(() => [...new Set<string>(pagedPoolList
    .filter((p: any) => p.poolStatus === PoolStatus.COMPLETED || p.poolStatus === PoolStatus.CLOSED)
    .map((p: any) => `${p.assetNameObj.Protocol}:${p.assetNameObj.Type}:${p.assetNameObj.Ticker}`))].sort(), [pagedPoolList]);
  const { data: logos = {} } = useQuery({
    queryKey: ['assetLogos', effectiveNetwork, logoKeys],
    queryFn: () => getAssetLogos(logoKeys),
    enabled: logoKeys.length > 0,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const totalCount = filteredPoolList.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  // 分页事件
  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const columns = [
    { key: 'assetName', label: t('pages.launchpool.asset_name') },
    { key: 'poolStatus', label: t('pages.launchpool.pool_status') },
    { key: 'totalSupply', label: t('pages.launchpool.total_supply') },
    { key: 'launchRation', label: t('pages.launchpool.launch_ratio') },
    { key: 'enableBlock', label: t('pages.launchpool.enable_block') },
    { key: 'startBlock', label: t('pages.launchpool.start_block') },
    { key: 'endBlock', label: t('pages.launchpool.end_block') },
    { key: 'deployTime', label: t('pages.launchpool.deploy_time') },
    { key: 'progress', label: t('pages.launchpool.progress') },
    { key: 'action', label: t('pages.launchpool.action') },
  ];

  // Metadata edit modal state
  const [showEditMetadata, setShowEditMetadata] = useState(false);
  const [editingContractUrl, setEditingContractUrl] = useState('');
  const openEditMetadata = (pool: any) => {
    setEditingContractUrl(pool.contractURL || pool.id);
    setShowEditMetadata(true);
  };
  const closeEditMetadata = () => {
    setShowEditMetadata(false);
    setEditingContractUrl('');
  };
  const isOwner = (pool: any) => {
    if (!address || !pool) return false;
    const deployer =
      pool.deployer ||
      pool.creator ||
      pool.owner ||
      pool.Contract?.deployer ||
      pool.Contract?.Owner;
    return deployer && deployer.toLowerCase?.() === address.toLowerCase?.();
  };

  // 关闭发射池状态
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedClosePool, setSelectedClosePool] = useState<any | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const { btcFeeRate } = useCommonStore((state) => state);

  // 模态框
  const [modalType, setModalType] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [selectedPool, setSelectedPool] = useState<any | null>(null);
  const openModal = async (type: string, pool: any | null = null) => {
    if (type === 'details' && pool) {
      try {
        const { status } = await getContractStatus(pool.contractURL);
        pool = adaptPoolData({ ...JSON.parse(status), contractURL: pool.contractURL }, satsnetHeight);
      } catch (error) {
        toast.error(t('common.error'));
        return;
      }
    }
    setModalType(type);
    if (type === 'template' && pool) setSelectedTemplateId(pool.template);
    setSelectedPool(pool);
  };
  const closeModal = () => {
    setModalType(null);
    setSelectedTemplateId(null);
    setSelectedPool(null);
  };

  const handleClosePool = (pool: any) => {
    setSelectedClosePool(pool);
    setCloseDialogOpen(true);
  };

  const handleConfirmClosePool = async () => {
    if (!address) {
      toast.error('请先连接钱包');
      return;
    }

    if (!selectedClosePool) {
      toast.error('未选择发射池');
      return;
    }

    setIsClosing(true);
    try {
      const contractUrl = selectedClosePool.contractURL || selectedClosePool.id;
      const params = {
        action: 'close'
      };
      await getWalletAdapter().invokeContractSatsNet(
        contractUrl,
        JSON.stringify(params),
        btcFeeRate.value.toString()
      );
      toast.success('发射池已成功关闭');
      setCloseDialogOpen(false);
      setSelectedClosePool(null);
      refetch();
    } catch (error: any) {
      console.error('关闭发射池失败:', error);
      toast.error(error?.message || '关闭发射池失败');
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="p-2 relative">
      {/* 头部：移动端两行，桌面一行 */}
      <div className="my-2 px-2 sm:px-1 flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        {/* 行1：协议筛选 */}
        <div className="w-full md:w-auto">
          <HomeTypeTabs
            value={protocol}
            onChange={protocolChange}
            tabs={protocolTabs}
          />
        </div>

        {/* 行2：状态筛选 + 按钮（移动端整行展示，桌面靠右横排） */}
        <div className="w-full md:w-auto sm:mr-16 md:mr-32 flex items-center justify-between md:justify-end gap-2 md:gap-4 flex-wrap">
          {/* 状态筛选 Tabs */}
          <HomeMintTabs
            value={statusFilter}
            onChange={handleStatusChange}
            tabs={statusTabs}
            variant="underline"
          />
          <WalletConnectBus asChild>
            <Button
              className="h-9 btn-gradient w-auto sm:w-auto md:w-auto"
              onClick={() => (window.location.href = '/launchpool/create')}
            >
              {t('pages.launchpool.create_pool')}
            </Button>
          </WalletConnectBus>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">
            {t('common.loading')}
          </span>
        </div>
      )}

      {/* 移动端卡片列表视图 */}
      <div className="sm:hidden space-y-3 mt-2">
        {pagedPoolList.map((p: any, idx: number) => (
          <div
            key={p.id || idx}
            className="rounded-lg bg-zinc-900/70 border border-zinc-800 p-3 flex gap-3"
          >
            <div className="flex-shrink-0">
              <Avatar className="w-10 h-10 text-xl text-gray-300 font-medium bg-zinc-700">
                <AssetLogoImage
                  logo={logos[`${p.assetNameObj.Protocol}:${p.assetNameObj.Type}:${p.assetNameObj.Ticker}`]}
                  className="w-10 h-10"
                />
                <AvatarFallback>
                  {p?.assetSymbol
                    ? String.fromCodePoint(p.assetSymbol)
                    : p.assetNameObj?.Ticker?.charAt(0)?.toUpperCase() || '₿'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col items-start">
                  <div
                    onClick={() => openModal('details', p)}
                    className="text-primary text-sm font-medium text-left leading-tight max-w-[200px] cursor-pointer hover:underline"
                    title={p.assetName}
                    data-full={p.assetName}
                  >
                    <TickerName
                      name={p.assetName || ""}
                      ticker={p.assetNameObj?.Ticker || ""}
                      protocol={p.protocol || ""}
                      abbreviate
                    />
                  </div>
                  <Badge
                    className={`${statusColorMap[p.poolStatus]} text-white flex-shrink-0 mt-1`}
                  >
                    {Number(p.status) === 200 ? t('pages.launchpool.closing') : statusTextMap[p.poolStatus]}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <span>
                  {t('pages.launchpool.total_supply')}: {p.totalSupply}
                </span>
                <span>
                  · {t('pages.launchpool.launch_ratio')}:{' '}
                  {parseInt(p.launchRation, 10)}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <span>
                  {t('pages.launchpool.enable_block')}:{' '}
                  {p.enableBlock > 0 ? p.enableBlock : '-'}
                </span>
                <span>
                  · {t('pages.launchpool.end_block')}: {p.endTime}
                </span>
              </div>
              <div className="mt-1">
                <div className="w-full bg-gray-600/40 h-2 rounded">
                  <div
                    className="bg-purple-500 h-2 rounded"
                    style={{ width: `${p.progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-muted-foreground">
                    {p.progress}%
                  </span>
                  <div className="flex items-center gap-1">
                    <ActionButtons
                      pool={p}
                      openModal={openModal}
                      onClose={() => handleClosePool(p)}
                      isOwner={isOwner(p)}
                    />
                    {p.progress >= 100 && (
                      <button
                        className="rounded-md border border-zinc-700 p-1.5 text-zinc-400 hover:text-indigo-500 transition-colors"
                        onClick={() =>
                          router.push(
                            `/swap/detail?asset=${p.assetNameObj.Protocol}:f:${p.assetNameObj.Ticker}`,
                          )
                        }
                        title="Swap"
                      >
                        <Icon
                          icon="lucide:arrow-left-right"
                          className="w-4 h-4"
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {pagedPoolList.length === 0 && !isLoading && (
          <div className="text-center py-8 text-sm text-zinc-500">
            {t('common.no_data') || 'No Data'}
          </div>
        )}
      </div>

      {/* 桌面端表格视图 */}
      <div className="relative overflow-x-auto w-full px-3 py-3 bg-zinc-900/80 rounded-lg hidden sm:block">
        <Table className="w-full table-auto border-collapse rounded-lg shadow-md min-w-[900px] bg-zinc-900/50">
          <TableHeader>
            <TableRow>
              {columns.map((column) => {
                const isSortable =
                  column.key === 'deployTime' || column.key === 'progress';
                const isActive =
                  isSortable &&
                  sortKey === (column.key as 'progress' | 'deployTime');
                const icon = !isSortable
                  ? null
                  : sortKey !== column.key
                    ? 'mdi:swap-vertical'
                    : sortOrder === 'asc'
                      ? 'mdi:arrow-up'
                      : 'mdi:arrow-down';

                // 隐藏部分列（移动端），这里保留桌面列显示逻辑
                const hiddenOnSmall = [
                  'enableBlock',
                  'startBlock',
                  'endBlock',
                  'deployTime',
                ];
                const headExtraClass = hiddenOnSmall.includes(column.key)
                  ? 'hidden lg:table-cell'
                  : '';

                return (
                  <TableHead
                    key={column.key}
                    onClick={
                      isSortable
                        ? () =>
                          handleSort(column.key as 'progress' | 'deployTime')
                        : undefined
                    }
                    className={`px-4 py-2 text-left font-semibold bg-zinc-900 whitespace-nowrap ${isSortable ? 'cursor-pointer select-none' : ''} ${isActive ? 'text-primary' : 'text-muted-foreground'} ${headExtraClass}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.label}
                      {isSortable && <Icon icon={icon!} className="w-4 h-4" />}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedPoolList.map((adaptedPool: any, index: number) => (
              <TableRow
                key={adaptedPool.id ?? index}
                className="border-b border-border hover:bg-accent transition-colors whitespace-nowrap"
              >
                <TableCell className="flex items-center gap-2 px-4 py-4 min-w-[200px]">
                  <Avatar className="w-10 h-10 text-xl text-gray-300 font-medium bg-zinc-700">
                    <AssetLogoImage
                  logo={logos[`${adaptedPool.assetNameObj.Protocol}:${adaptedPool.assetNameObj.Type}:${adaptedPool.assetNameObj.Ticker}`]}
                  className="w-10 h-10"
                />
                    <AvatarFallback>
                      {adaptedPool?.assetSymbol
                        ? String.fromCodePoint(adaptedPool.assetSymbol)
                        : adaptedPool.assetNameObj?.Ticker?.charAt(
                          0,
                        )?.toUpperCase() || '₿'}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    onClick={() => openModal('details', adaptedPool)}
                    className="text-primary hover:underline text-left cursor-pointer"
                  >
                    <TickerName
                      name={adaptedPool.assetName || ""}
                      ticker={adaptedPool.assetNameObj?.Ticker || ""}
                      protocol={adaptedPool.protocol || ""}
                      abbreviate
                    />
                  </div>
                </TableCell>

                <TableCell className="px-4 py-4">
                  <Badge
                    className={`${statusColorMap[adaptedPool.poolStatus]} text-white`}
                  >
                    {Number(adaptedPool.status) === 200 ? t('pages.launchpool.closing') : statusTextMap[adaptedPool.poolStatus]}
                  </Badge>
                </TableCell>

                <TableCell className="px-4 py-4">
                  {adaptedPool.totalSupply}
                </TableCell>
                <TableCell className="px-4 py-4">
                  {parseInt(adaptedPool.launchRation, 10)}%
                </TableCell>

                <TableCell className="px-4 py-4 hidden lg:table-cell">
                  {adaptedPool.enableBlock > 0 ? adaptedPool.enableBlock : '-'}
                </TableCell>
                <TableCell className="px-4 py-4 hidden lg:table-cell">
                  {adaptedPool.startTime}
                </TableCell>
                <TableCell className="px-4 py-4 hidden lg:table-cell">
                  {adaptedPool.endTime}
                </TableCell>

                <TableCell className="px-4 py-4 hidden lg:table-cell">
                  {adaptedPool.deployTime
                    ? new Date(
                      Number(adaptedPool.deployTime) * 1000,
                    ).toLocaleString()
                    : '-'}
                </TableCell>

                <TableCell className="px-4 py-2 min-w-[120px]">
                  <div className="w-full bg-gray-600/50 h-2 rounded">
                    <div
                      className="bg-purple-500 h-2 rounded"
                      style={{ width: `${adaptedPool.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {adaptedPool.progress}%
                  </span>
                </TableCell>

                <TableCell className="px-4 py-2 text-center">
                  <div className="flex justify-start items-center h-full gap-4">
                    <ActionButtons
                      pool={adaptedPool}
                      openModal={openModal}
                      onClose={() => handleClosePool(adaptedPool)}
                      isOwner={isOwner(adaptedPool)}
                    />
                    {(isOwner(adaptedPool) ||
                      isAddressInAssetEditWhitelist(address)) &&
                      (adaptedPool.poolStatus === PoolStatus.COMPLETED ||
                        adaptedPool.poolStatus === PoolStatus.CLOSED) && (
                        <button
                          onClick={() => openEditMetadata(adaptedPool)}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:border-blue-400 transition-colors"
                          title="Edit asset information (only deployer or whitelisted and completed/closed pools can edit)"
                        >
                          Edit
                        </button>
                      )}
                    {adaptedPool.progress >= 100 && (
                      <button
                        className="rounded-md border border-zinc-700 p-2 text-zinc-400 hover:text-indigo-500 transition-colors"
                        onClick={() =>
                          router.push(
                            `/swap/detail?asset=${adaptedPool.assetNameObj.Protocol}:f:${adaptedPool.assetNameObj.Ticker}`,
                          )
                        }
                      >
                        <Icon
                          icon="lucide:arrow-left-right"
                          className="w-5 h-5 text-base"
                        />
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
      <div className="bg-zinc-900/80 px-4 py-0 rounded-lg flex flex-row items-center justify-between gap-3 border-t border-zinc-800">
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

      {/** 模态窗口 */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="relative z-501">
            {modalType === 'join' && (
              <JoinPool poolData={selectedPool} closeModal={closeModal} />
            )}
            {modalType === 'details' && (
              <LaunchPoolDetails
                closeModal={closeModal}
                poolDetails={selectedPool}
                onClose={() => handleClosePool(selectedPool)}
                isOwner={isOwner(selectedPool)}
              />
            )}
            {modalType === 'template' && (
              <LaunchPoolTemplate
                templateId={selectedTemplateId || ''}
                closeModal={closeModal}
              />
            )}
            {modalType === 'distribution' && (
              <DistributionList
                contractURL={selectedPool.contractURL}
                closeModal={closeModal}
                bindingSat={
                  selectedPool.mintAmtPerSat || selectedPool.bindingSat
                }
              />
            )}
          </div>
        </div>
      )}
      {showEditMetadata && editingContractUrl && (
        <AssetMetadataEditModal
          contractURL={editingContractUrl}
          onClose={closeEditMetadata}
          onSuccess={closeEditMetadata}
        />
      )}
      <ClosePoolDialog
        isOpen={closeDialogOpen}
        onClose={() => setCloseDialogOpen(false)}
        onConfirm={handleConfirmClosePool}
        poolName={selectedClosePool?.assetName}
        isLoading={isClosing}
      />
    </div>
  );
}
