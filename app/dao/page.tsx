'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useCommonStore } from '@/store/common';
import { getDeployedContractInfo, getContractStatus } from '@/api/market';
import { Button } from '@/components/ui/button';
import { CustomPagination } from '@/components/ui/CustomPagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { useToolsEnabled } from '@/lib/toolsAccess';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE = 10;

export default function DaoListPage() {
    const { network } = useCommonStore();
    const router = useRouter();
    const toolsEnabled = useToolsEnabled();
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    const PAGE_SIZES = [10, 20, 50, 100];
    const { t } = useTranslation();

    const openTab = (contractUrl: string, tab: 'register' | 'donate' | 'airdrop' | 'review') => {
        router.push(`/dao/detail?contractUrl=${encodeURIComponent(contractUrl)}&tab=${tab}`);
    };

    const { data: contractURLsData } = useQuery({
        queryKey: ['daoContractURLs', network],
        queryFn: async () => {
            const deployed = await getDeployedContractInfo();
            const urls = deployed.url || (deployed.data && deployed.data.url) || [];
            return (urls as string[]).filter((c) => c && c.includes('dao.tc'));
        },
        gcTime: 0,
        refetchInterval: 120000,
        refetchIntervalInBackground: false,
    });

    const getDaoList = async ({ pageParam = 1 }) => {
        if (!contractURLsData || contractURLsData.length === 0) {
            return { items: [], totalCount: 0 };
        }

        const startIndex = (pageParam - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageURLs = contractURLsData.slice(startIndex, endIndex);

        const statusList = await Promise.all(
            pageURLs.map(async (item: string) => {
                try {
                    const { status } = await getContractStatus(item);
                    const parsed = status ? JSON.parse(status) : null;
                    return parsed ? { ...parsed, contractURL: item } : { contractURL: item };
                } catch {
                    return { contractURL: item };
                }
            })
        );

        const valid = statusList.filter(Boolean);
        return {
            items: valid,
            totalCount: contractURLsData.length,
            nextPage: endIndex < contractURLsData.length ? pageParam + 1 : undefined,
        };
    };

    const { data: listData, isLoading } = useQuery({
        queryKey: ['daoList', currentPage, pageSize, network],
        queryFn: () => getDaoList({ pageParam: currentPage }),
        enabled: !!contractURLsData,
        gcTime: 0,
        refetchInterval: 120000,
        refetchIntervalInBackground: false,
    });

    const items = listData?.items || [];
    const totalCount = listData?.totalCount || 0;
    const totalPages = Math.ceil((totalCount || 0) / pageSize);

    const rows = useMemo(() => {
        return items.map((it: any) => {
            const assetName = it?.assetName || it?.Contract?.assetName;
            const protocol = assetName?.Protocol || '-';
            const ticker = assetName?.Ticker || '-';
            const name = protocol && ticker ? `${protocol}:f:${ticker}` : '-';
            const rawStatus = it?.status;
            const status = rawStatus === 100 ? t('pages.dao.list.status_active') : (rawStatus ?? '-');
            const uidCount = it?.uidCount ?? '-';
            return {
                contractURL: it?.contractURL,
                name,
                status,
                uidCount,
            };
        });
    }, [items, t]);

    return (
        <div className="p-4 relative">
            <div className="my-2 px-2 sm:px-1 flex justify-between items-center gap-2">
                <div>
                    <div className="text-xl font-bold text-zinc-200">{t('pages.dao.title')}</div>
                    <div className="text-xs text-zinc-500">{t('pages.dao.list.subtitle')}</div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dao/create">
                        <Button className="h-10 btn-gradient">{t('pages.dao.list.create')}</Button>
                    </Link>
                </div>
            </div>

            {isLoading && (
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2 text-muted-foreground">{t('pages.dao.list.loading')}</span>
                </div>
            )}

            {!isLoading && rows.length === 0 && (
                <div className="mt-6 p-8 bg-zinc-950/50 rounded-lg border border-zinc-800 text-center">
                    <div className="text-zinc-200 font-medium">{t('pages.dao.list.no_contracts')}</div>
                    <div className="text-zinc-500 text-sm mt-1">{t('pages.dao.list.create_hint')}</div>
                    <div className="mt-4">
                        <Link href="/dao/create">
                            <Button className="btn-gradient">{t('pages.dao.list.create')}</Button>
                        </Link>
                    </div>
                </div>
            )}

            {rows.length > 0 && (
                <div className="relative overflow-x-auto w-full px-3 py-4 bg-zinc-950/50 rounded-lg">
                    <Table className="w-full table-auto border-collapse rounded-lg shadow-md bg-zinc-950/50">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="px-4 py-2 text-left font-semibold text-muted-foreground bg-zinc-900 whitespace-nowrap">{t('pages.dao.list.asset')}</TableHead>
                                <TableHead className="px-4 py-2 text-left font-semibold text-muted-foreground bg-zinc-900 whitespace-nowrap">{t('pages.dao.list.status')}</TableHead>
                                <TableHead className="px-4 py-2 text-left font-semibold text-muted-foreground bg-zinc-900 whitespace-nowrap">{t('pages.dao.list.uids')}</TableHead>
                                {toolsEnabled && (
                                    <TableHead className="px-4 py-2 text-left font-semibold text-muted-foreground bg-zinc-900 whitespace-nowrap">{t('pages.dao.list.action')}</TableHead>
                                )}
                                <TableHead className="px-4 py-2 text-left font-semibold text-muted-foreground bg-zinc-900 whitespace-nowrap text-right">{t('pages.dao.list.view_detail')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((r: any, idx: number) => (
                                <TableRow key={r.contractURL || idx} className="border-b border-border hover:bg-accent transition-colors whitespace-nowrap">
                                    <TableCell className="px-4 py-2 font-mono text-zinc-200">{r.name}</TableCell>
                                    <TableCell className="px-4 py-2 text-zinc-300">{String(r.status)}</TableCell>
                                    <TableCell className="px-4 py-2 text-zinc-300">{String(r.uidCount)}</TableCell>
                                    {toolsEnabled && (
                                        <TableCell className="px-4 py-2">
                                            {r.contractURL ? (
                                                <div className="flex flex-wrap gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => openTab(r.contractURL, 'register')}>
                                                        {t('pages.dao.list.actions.register')}
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => openTab(r.contractURL, 'donate')}>
                                                        {t('pages.dao.list.actions.donate')}
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => openTab(r.contractURL, 'airdrop')}>
                                                        {t('pages.dao.list.actions.airdrop')}
                                                    </Button>
                                                    <Button size="sm" className="btn-gradient" onClick={() => openTab(r.contractURL, 'review')}>
                                                        {t('pages.dao.list.actions.review')}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-zinc-500">-</span>
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell className="px-4 py-2 text-right">
                                        {r.contractURL ? (
                                            <Link
                                                href={`/dao/detail?contractUrl=${encodeURIComponent(r.contractURL)}&tab=overview`}
                                                className="text-blue-400 hover:underline"
                                            >
                                                {t('pages.dao.list.view_detail')}
                                            </Link>
                                        ) : (
                                            <span className="text-zinc-500">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="mt-6">
                    <CustomPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(s: number) => {
                            setPageSize(s);
                            setCurrentPage(1);
                        }}
                        pageSize={pageSize}
                        availablePageSizes={PAGE_SIZES}
                        isLoading={isLoading}
                    />
                </div>
            )}
        </div>
    );
}
