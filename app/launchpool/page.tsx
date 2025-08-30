'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import JoinPool from '@/components/launchpool/JoinPool';
import LaunchPoolDetails from '@/components/launchpool/PoolDetail';
import LaunchPoolTemplate from '@/components/launchpool/[templateId]/TemplateDetailsClient';
import { HomeTypeTabs } from '@/components/market/HomeTypeTabs';
import { HomeMintTabs } from '@/components/market/HomeMintTabs';
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
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { getDeployedContractInfo, getContractStatus } from '@/api/market';

// 每页显示的数量
const PAGE_SIZE = 10;

function adaptPoolData(pool: any, satsnetHeight: number) {
    // 修正 TotalMinted 为对象的情况
    const totalMintedValue = pool?.TotalMinted?.Value ?? 0;
    const maxSupply = pool?.maxSupply ?? pool?.totalSupply ?? 1;
    const launchRation = Number(pool?.launchRation ?? 1) || 1;

    const mintedPercent = (totalMintedValue / maxSupply) * 100; // 已铸占比（0-100）
    const progress = Number((Math.min(mintedPercent / launchRation, 1) * 100).toFixed(3)); // 进度（0-100）

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

    return {
        ...pool,
        id: pool?.contractURL ?? pool?.id,
        logo: pool?.logo ?? '',
        assetName: pool?.assetName,
        unitPrice: pool?.unitPrice ?? '',
        marketCap: pool?.marketCap ?? '',
        totalSupply: maxSupply,
        poolSize: pool?.limit ?? pool?.poolSize ?? '',
        progress,
        protocol: pool?.assetName?.Protocol ?? '',
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

export default function LaunchPoolProgressSortTest() {
    const { t } = useTranslation();
    const { satsnetHeight, network } = useCommonStore();
    const router = useRouter();

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    const PAGE_SIZES = [10, 20, 50, 100];

    // 协议筛选
    const [protocol, setProtocol] = useState<'all' | 'ordx' | 'runes'>('all');
    const protocolChange = (newProtocol: string) => {
        if (newProtocol === 'all' || newProtocol === 'ordx' || newProtocol === 'runes') {
            setProtocol(newProtocol);
            setCurrentPage(1);
        }
    };
    const protocolTabs = [
        { label: t('pages.launchpool.all'), key: 'all' },
        { label: t('pages.launchpool.ordx'), key: 'ordx' },
        { label: t('pages.launchpool.runes'), key: 'runes' },
    ];

    // ===== 新增：状态筛选（全部 / 正在铸造 / 铸造已完成）=====
    const [statusFilter, setStatusFilter] = useState<'all' | 'minting' | 'completed'>('all');
    const statusTabs = [
        { label: 'All', key: 'all' },
        { label: 'Minting', key: 'minting' },
        { label: 'Completed', key: 'completed' },
    ];
    const handleStatusChange = (val: string) => {
        if (val === 'all' || val === 'minting' || val === 'completed') {
            setStatusFilter(val);
            setCurrentPage(1);
        }
    };
    // ===== 新增结束 =====

    // 获取所有合约URL列表
    const { data: contractURLsData } = useQuery({
        queryKey: ['launchpoolContractURLs', network],
        queryFn: async () => {
            const deployed = await getDeployedContractInfo();
            const contractURLs = deployed.url || (deployed.data && deployed.data.url) || [];
            return contractURLs.filter((c: string) => c.indexOf('launchpool.tc') > -1);
        },
        gcTime: 0,
        refetchInterval: 120000, // 增加到2分钟，减少刷新频率
        refetchIntervalInBackground: false, // 禁止后台刷新
    });

    // 分页获取合约状态
    const getLaunchpoolList = async () => {
        if (!contractURLsData || contractURLsData.length === 0) {
            return { pools: [], totalCount: 0 };
        }

        // 获取所有合约状态，不使用分页
        const statusList = await Promise.all(
            contractURLsData.map(async (item: string) => {
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
        };
    };

    const { data: poolListData, isLoading } = useQuery({
        queryKey: ['launchpoolList'],
        queryFn: getLaunchpoolList,
        enabled: !!contractURLsData,
        gcTime: 0,
        refetchInterval: 120000, // 增加到2分钟，减少刷新频率
        refetchIntervalInBackground: false, // 禁止后台刷新
    });

    // 适配数据
    const adaptedPoolList = useMemo(() => {
        return poolListData?.pools?.map((pool: any) => adaptPoolData(pool, satsnetHeight)) || [];
    }, [poolListData?.pools, satsnetHeight]);

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
            list = list.filter((p: any) =>
                statusFilter === 'minting'
                    ? p.poolStatus === PoolStatus.ACTIVE
                    : p.poolStatus === PoolStatus.COMPLETED || p.poolStatus === PoolStatus.CLOSED
            );
        }
        // ===== 新增结束 =====

        // 排序
        return list
            .slice()
            .sort((a: any, b: any) => {
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

    // 模态框
    const [modalType, setModalType] = useState<string | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [selectedPool, setSelectedPool] = useState<any | null>(null);
    const openModal = async (type: string, pool: any | null = null) => {
        setModalType(type);
        if (type === 'template' && pool) setSelectedTemplateId(pool.template);
        setSelectedPool(pool);
    };
    const closeModal = () => {
        setModalType(null);
        setSelectedTemplateId(null);
        setSelectedPool(null);
    };

    return (
        <div className="p-2 relative">
            {/* 头部：移动端两行，桌面一行 */}
            <div className="my-2 px-2 sm:px-1 flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
                {/* 行1：协议筛选 */}
                <div className="w-full md:w-auto">
                    <HomeTypeTabs value={protocol} onChange={protocolChange} tabs={protocolTabs} />
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
                            className="h-10 btn-gradient w-auto sm:w-auto md:w-auto"
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
                    <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
                </div>
            )}

            <div className="relative overflow-x-auto w-full px-1 py-4 bg-zinc-950/50 rounded-lg">
                <Table className="w-full table-auto border-collapse rounded-lg shadow-md min-w-[900px] bg-zinc-950/50">
                    <TableHeader>
                        <TableRow>
                            {columns.map((column) => {
                                const isSortable = column.key === 'deployTime' || column.key === 'progress';
                                const isActive = isSortable && sortKey === (column.key as 'progress' | 'deployTime');
                                const icon = !isSortable
                                    ? null
                                    : sortKey !== column.key
                                        ? 'mdi:swap-vertical'
                                        : sortOrder === 'asc'
                                            ? 'mdi:arrow-up'
                                            : 'mdi:arrow-down';

                                return (
                                    <TableHead
                                        key={column.key}
                                        onClick={
                                            isSortable
                                                ? () => handleSort(column.key as 'progress' | 'deployTime')
                                                : undefined
                                        }
                                        className={`px-4 py-2 text-left font-semibold bg-zinc-900 whitespace-nowrap ${isSortable ? 'cursor-pointer select-none' : ''
                                            } ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
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


                                <TableCell className="px-4 py-2">{adaptedPool.enableBlock > 0 ? adaptedPool.enableBlock : '-'}</TableCell>
                                <TableCell className="px-4 py-2">{adaptedPool.startTime}</TableCell>
                                <TableCell className="px-4 py-2">{adaptedPool.endTime}</TableCell>

                                <TableCell className="px-4 py-2">
                                    {adaptedPool.deployTime ? new Date(Number(adaptedPool.deployTime) * 1000).toLocaleString() : '-'}
                                </TableCell>

                                <TableCell className="px-4 py-2 min-w-[120px]">
                                    <div className="w-full bg-gray-600/50 h-2 rounded">
                                        <div className="bg-purple-500 h-2 rounded" style={{ width: `${adaptedPool.progress}%` }}></div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{adaptedPool.progress}%</span>
                                </TableCell>

                                <TableCell className="px-4 py-2 text-center">
                                    <div className="flex justify-start items-center h-full gap-4">
                                        <ActionButtons pool={adaptedPool} openModal={openModal} />
                                        {adaptedPool.progress >= 100 && (
                                            <button
                                                className="rounded-md border border-zinc-700 p-2 text-zinc-400 hover:text-indigo-500 transition-colors"
                                                onClick={() =>
                                                    router.push(
                                                        `/swap/detail?asset=${adaptedPool.assetName.Protocol}:f:${adaptedPool.assetName.Ticker}`
                                                    )
                                                }
                                            >
                                                <Icon icon="lucide:arrow-left-right" className="w-5 h-5 text-base" />
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

            {/** 模态窗口 */}
            {modalType && (
                <div className="fixed inset-0 bg-black/50 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="relative z-501">
                        {modalType === 'join' && <JoinPool poolData={selectedPool} closeModal={closeModal} />}
                        {modalType === 'details' && <LaunchPoolDetails closeModal={closeModal} poolDetails={selectedPool} />}
                        {modalType === 'template' && (
                            <LaunchPoolTemplate templateId={selectedTemplateId || ''} closeModal={closeModal} />
                        )}
                        {modalType === 'distribution' && (
                            <DistributionList
                                contractURL={selectedPool.contractURL}
                                closeModal={closeModal}
                                bindingSat={selectedPool.mintAmtPerSat || selectedPool.bindingSat}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}