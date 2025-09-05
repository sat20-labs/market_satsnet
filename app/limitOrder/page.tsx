'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { HomeTypeTabs } from '@/components/market/HomeTypeTabs';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CustomPagination } from '@/components/ui/CustomPagination';
import { getDeployedContractInfo, getContractStatus } from '@/api/market';
import { useTranslation } from 'react-i18next';
import { useCommonStore } from '@/store/common';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { BtcPrice } from '@/components/BtcPrice';

function adaptPoolData(pool: any, satsnetHeight: number) {
    const assetNameObj = pool.Contract.assetName || {};
    const ticker = assetNameObj.Ticker || '-';
    const protocol = assetNameObj.Protocol || '-';

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

    // derive price if missing: price = satsValueInPool / assetAmtInPool
    const satsValueInPool = Number(pool.SatsValueInPool ?? 0);
    const assetAmtInPool = pool.AssetAmtInPool?.Value
        ? pool.AssetAmtInPool.Value / Math.pow(10, pool.AssetAmtInPool.Precision)
        : 0;
    const rawDealPrice = Number(pool.dealPrice ?? 0);
    const derivedDealPrice = assetAmtInPool > 0 ? satsValueInPool / assetAmtInPool : 0;
    const finalDealPrice = rawDealPrice > 0 ? rawDealPrice : derivedDealPrice;

    return {
        ...pool,
        id: pool.contractURL ?? pool.id,
        assetName: ticker,
        protocol: protocol,
        poolStatus,
        deployTime: pool.deployTime ?? '',
        dealPrice: Number(finalDealPrice || 0),
        satsValueInPool,
        totalDealSats: Number(pool.TotalDealSats ?? 0),
        totalDealCount: Number(pool.TotalDealCount ?? 0),
    };
}

export default function LimitOrderPage() {
    const { t } = useTranslation();
    const { satsnetHeight, network } = useCommonStore();
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const PAGE_SIZES = [10, 20, 50, 100];

    const { data: contractURLsData } = useQuery({
        queryKey: ['swapContractURLs', network],
        queryFn: async () => {
            const deployed = await getDeployedContractInfo();
            const contractURLs = deployed.url || (deployed.data && deployed.data.url) || [];
            return contractURLs.filter((c: string) => c.indexOf('swap.tc') > -1);
        },
        gcTime: 0,
        refetchInterval: 120000,
        refetchIntervalInBackground: false,
    });

    const getSwapList = async ({ pageParam = 1 }) => {
        if (!contractURLsData || contractURLsData.length === 0) {
            return { pools: [], totalCount: 0 };
        }

        const startIndex = (pageParam - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageURLs = contractURLsData.slice(startIndex, endIndex);

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

        const validPools = statusList.filter(Boolean) as any[];
        return {
            pools: validPools,
            totalCount: contractURLsData.length,
            nextPage: endIndex < contractURLsData.length ? pageParam + 1 : undefined,
        };
    };

    const { data: poolListData, isLoading } = useQuery({
        queryKey: ['swapList', currentPage, pageSize, network],
        queryFn: () => getSwapList({ pageParam: currentPage }),
        enabled: !!contractURLsData,
        gcTime: 0,
        refetchInterval: 120000,
        refetchIntervalInBackground: false,
    });

    const poolList = poolListData?.pools || [];
    const totalCount = poolListData?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const adaptedPoolList = useMemo(() => {
        return poolList.map(pool => adaptPoolData(pool, satsnetHeight));
    }, [poolList, satsnetHeight]);

    const columns = [
        { key: 'assetName', label: t('pages.launchpool.asset_name') },
        { key: 'protocol', label: t('common.protocol') },
        { key: 'dealPrice', label: t('common.price') },
        { key: 'totalDealSats', label: t('common.volume_sats') },
        { key: 'totalDealCount', label: t('common.tx_order_count') },
        // { key: 'satsValueInPool', label: t('common.pool_size_sats') },
        { key: 'poolStatus', label: t('pages.launchpool.pool_status') },
        { key: 'deployTime', label: t('pages.launchpool.deploy_time') },
    ];

    const [protocol, setProtocol] = useState('all');
    const protocolChange = (newProtocol: string) => setProtocol(newProtocol);

    const protocolTabs = [
        { label: t('pages.launchpool.all'), key: 'all' },
        { label: t('pages.launchpool.ordx'), key: 'ordx' },
        { label: t('pages.launchpool.runes'), key: 'runes' },
    ];

    const filteredPoolList = useMemo(() => {
        let list = protocol === 'all' ? adaptedPoolList : adaptedPoolList.filter((p: any) => p.protocol === protocol);
        return list.slice().sort((a: any, b: any) => Number(b.deployTime) - Number(a.deployTime));
    }, [adaptedPoolList, protocol]);

    const handlePageChange = (page: number) => setCurrentPage(page);
    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    return (
        <div className="p-4 relative">
            <div className="my-2 px-2 sm:px-1 flex justify-between items-center gap-1">
                <HomeTypeTabs value={protocol} onChange={protocolChange} tabs={protocolTabs} />
                <div className="flex items-center gap-2 mr-4">
                    <WalletConnectBus asChild text="Create LimitOrder">
                        <Button className="h-10 btn-gradient" onClick={() => (window.location.href = '/limitOrder/create')}>
                            Create LimitOrder
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

            <div className="relative overflow-x-auto w-full px-3 py-4 bg-zinc-950/50 rounded-lg">
                <Table className="w-full table-auto border-collapse rounded-lg shadow-md min-w-[900px] bg-zinc-950/50">
                    <TableHeader>
                        <TableRow>
                            {columns.map((column) => (
                                <TableHead
                                    key={column.key as string}
                                    className="px-4 py-2 text-left font-semibold text-muted-foreground bg-zinc-900 whitespace-nowrap"
                                >
                                    {column.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPoolList.map((adaptedPool: any, index: number) => (
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
                                                : adaptedPool?.Contract?.assetName?.Ticker?.charAt(0)?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <Link
                                        href={`/limitOrder/detail?asset=${adaptedPool?.Contract?.assetName?.Protocol}:f:${adaptedPool?.Contract?.assetName?.Ticker}`}
                                        className="cursor-pointer text-primary hover:underline"
                                        prefetch={true}
                                    >
                                        {adaptedPool.assetName}
                                    </Link>
                                </TableCell>
                                <TableCell className="px-4 py-2">{adaptedPool.protocol}</TableCell>
                                <TableCell className="px-4 py-2">{Number(adaptedPool.dealPrice ?? 0).toFixed(4)}</TableCell>
                                <TableCell className="px-4 py-2">
                                    <div className="flex flex-col leading-tight gap-1">
                                        <span>{adaptedPool.totalDealSats}</span>
                                        <span className="text-xs text-zinc-500 whitespace-nowrap">{'$'}<BtcPrice btc={(Number(adaptedPool.totalDealSats || 0)) / 1e8} /></span>
                                    </div>
                                </TableCell>
                                <TableCell className="px-4 py-2">
                                    <div className="flex flex-col leading-tight">
                                        <span>{adaptedPool.totalDealCount}</span>
                                    </div>
                                </TableCell>
                                {/* <TableCell className="px-4 py-2">
                                    <div className="flex flex-col leading-tight gap-1">
                                        <span>{adaptedPool.satsValueInPool}</span>
                                        <span className="text-xs text-zinc-500 whitespace-nowrap">{'$'}<BtcPrice btc={(Number(adaptedPool.satsValueInPool || 0)) / 1e8} /></span>
                                    </div>
                                </TableCell> */}
                                <TableCell className="px-4 py-2">
                                    <Badge className={`${statusColorMap[adaptedPool.poolStatus]} text-white`}>
                                        {statusTextMap[adaptedPool.poolStatus]}
                                    </Badge>
                                </TableCell>
                                <TableCell className="px-4 py-2">
                                    {adaptedPool.deployTime ? new Date(adaptedPool.deployTime * 1000).toLocaleString() : '-'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

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
}
