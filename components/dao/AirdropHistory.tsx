'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { contractService } from '@/domain/services/contract';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomPagination } from '@/components/ui/CustomPagination';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import { generateMempoolUrl } from '@/utils/url';
import { Chain } from '@/types';
import { useCommonStore } from '@/store';

// OrderType 映射
const ORDER_TYPE_MAP: Record<number, { label: string; labelEn: string }> = {
    15: { label: '注册', labelEn: 'Register' },
    16: { label: '捐赠', labelEn: 'Donate' },
    17: { label: '空投', labelEn: 'Airdrop' },
    18: { label: '审核', labelEn: 'Validate' },
    19: { label: '绑定', labelEn: 'Bind' },
};

interface AirdropItem {
    uid: string;
    address: string;
    result: string;
}

interface ContractHistoryItem {
    Version: number;
    Id: number;
    Reason: string;
    Done: number;
    OrderType: number;
    UtxoId: number;
    OrderTime: number;
    AssetName: string;
    ServiceFee: number;
    UnitPrice: number | null;
    ExpectedAmt: number | null;
    Address: string;
    FromL1: boolean;
    InUtxo: string;
    InValue: number;
    InAmt: number | null;
    RemainingAmt: number | null;
    RemainingValue: number;
    ToL1: boolean;
    OutTxId: string;
    OutAmt: { Precision: number; Value: string } | null;
    OutValue: number;
    Padded: any;
    airdrop?: {
        items: AirdropItem[];
    };
    validate?: {
        uids: string;
        reason: string;
    };
}
const PAGE_SIZE = 10;

export function AirdropHistory({ contractUrl }: { contractUrl: string }) {
    const { t, i18n } = useTranslation();
    const { network } = useCommonStore();
    const [history, setHistory] = useState<ContractHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [selectedOrderType, setSelectedOrderType] = useState<number | 'all'>('all');
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ContractHistoryItem | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    const PAGE_SIZES = [10, 20, 50, 100];

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(
            () => toast.success(t('common.copied', { defaultValue: '已复制' })),
            (err) => toast.error(t('common.copy_failed', { defaultValue: '复制失败' }))
        );
    };

    const fetchHistory = useCallback(async () => {
        if (!contractUrl) return;

        setLoading(true);
        setError(null);
        try {
            if (selectedOrderType === 'all') {
                const start = (currentPage - 1) * pageSize;
                const limit = pageSize;
                const result = await contractService.getContractHistory(contractUrl, start, limit);
                setHistory(result.data);
                setTotal(result.total);
            } else {
                // 筛选状态下，一次性获取所有数据（假设不超过1000条）
                const MAX_LIMIT = 1000;
                const result = await contractService.getContractHistory(contractUrl, 0, MAX_LIMIT);
                // 客户端筛选
                const filtered = result.data.filter(item => item.OrderType === selectedOrderType);
                setHistory(filtered);
                setTotal(filtered.length);
                // 重置当前页码为1，因为数据已全部加载（由 useEffect 处理）
                // setCurrentPage(1); // 已移除，避免分页重置
            }
        } catch (err: any) {
            console.error('Failed to fetch contract history:', err);
            setError(err.message || t('common.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [contractUrl, t, currentPage, pageSize, selectedOrderType]);

    // 当筛选类型变化时，重置页码为1
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedOrderType]);

    useEffect(() => {
        if (contractUrl) {
            fetchHistory();
        }
    }, [contractUrl, fetchHistory]);

    // const handlePrevPage = () => {
    //     if (pageStart > 0) {
    //         setPageStart(Math.max(0, pageStart - pageLimit));
    //     }
    // };

    // const handleNextPage = () => {
    //     if (pageStart + pageLimit < total) {
    //         setPageStart(pageStart + pageLimit);
    //     }
    // };

    const formatAmount = (amt: number | { Precision: number; Value: string } | null): string => {
        if (amt === null || amt === undefined) return '-';
        if (typeof amt === 'number') {
            // 假设数字已经是正确单位（无额外精度）
            return amt.toString();
        }
        if (!amt.Value) return '0';
        const value = BigInt(amt.Value);
        const precision = amt.Precision || 18;
        const divisor = BigInt(10 ** precision);
        const integerPart = value / divisor;
        const fractionalPart = value % divisor;
        if (fractionalPart === BigInt(0)) {
            return integerPart.toString();
        }
        const fractionalStr = fractionalPart.toString().padStart(precision, '0');
        const trimmedFractional = fractionalStr.replace(/0+$/, '');
        return `${integerPart}.${trimmedFractional}`;
    };

    const formatTime = (timestamp: number): string => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const truncateAddress = (addr: string): string => {
        if (addr.length <= 16) return addr;
        return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
    };

    const truncateTxId = (txId: string): string => {
        if (!txId) return '';
        return `${txId.slice(0, 8)}...${txId.slice(-8)}`;
    };

    const getOrderTypeLabel = (orderType: number): string => {
        const mapping = ORDER_TYPE_MAP[orderType];
        if (!mapping) return `${orderType}`;
        return i18n.language.startsWith('zh') ? mapping.label : mapping.labelEn;
    };

    const filteredHistory = selectedOrderType === 'all'
        ? history
        : history.filter(item => item.OrderType === selectedOrderType);

    const totalPages = Math.ceil(total / pageSize);
    const start = (currentPage - 1) * pageSize;
    let paginatedHistory;
    if (selectedOrderType === 'all') {
        // 已按分页请求，无需切片
        paginatedHistory = filteredHistory;
    } else {
        paginatedHistory = filteredHistory.slice(start, start + pageSize);
    }

    const openDetailModal = (item: ContractHistoryItem) => {
        setSelectedItem(item);
        setDetailModalOpen(true);
    };

    if (loading && history.length === 0) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-zinc-400" />
                <div className="mt-2">{t('common.loading', { defaultValue: '加载中...' })}</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-amber-500">
                <div>{error}</div>
                <Button variant="outline" onClick={() => fetchHistory()} className="mt-4">
                    {t('common.retry')}
                </Button>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                <h3 className="text-lg font-semibold text-white">{t('pages.dao.workflow.airdrop_history.history_list', { defaultValue: '合约历史记录' })}</h3>
                <div className="flex items-center gap-3">
                    <div className="text-sm text-zinc-400">
                        {total > 0 ? t('pages.dao.workflow.airdrop_history.total_records', { total }) : t('pages.dao.workflow.airdrop_history.no_records')}
                    </div>
                    <Select value={String(selectedOrderType)} onValueChange={(value) => { setSelectedOrderType(value === 'all' ? 'all' : Number(value)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-white">
                            <SelectValue placeholder={t('pages.dao.workflow.airdrop_history.filter_placeholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('pages.dao.workflow.airdrop_history.filter_all')}</SelectItem>
                            {Object.entries(ORDER_TYPE_MAP).map(([key, { label }]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {filteredHistory.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">
                    {t('pages.dao.workflow.no_airdrop_history', { defaultValue: '暂无记录' })}
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-zinc-800">
                                    <TableHead className="text-zinc-400">No. </TableHead>
                                    <TableHead className="text-zinc-400">{t('pages.dao.workflow.airdrop_history.order_type')}</TableHead>
                                    <TableHead className="text-zinc-400">{t('pages.dao.workflow.airdrop_history.address')}</TableHead>
                                    <TableHead className="text-zinc-400">{t('pages.dao.workflow.airdrop_history.amount')}</TableHead>
                                    <TableHead className="text-zinc-400">{t('pages.dao.workflow.airdrop_history.time')}</TableHead>
                                    <TableHead className="text-zinc-400">{t('pages.dao.workflow.airdrop_history.txid')}</TableHead>
                                    <TableHead className="text-zinc-400">{t('pages.dao.workflow.airdrop_history.action')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedHistory.map((item, index) => {
                                    const hasDetails = (item.airdrop?.items && item.airdrop.items.length > 0) || item.validate;
                                    return (
                                        <React.Fragment key={item.Id}>
                                            <TableRow className="border-zinc-800">
                                                <TableCell className="font-mono text-sm text-white ">
                                                    {/* {item.Id} */}
                                                    &nbsp; {start + index + 1}
                                                </TableCell>
                                                <TableCell className="text-white">
                                                    <span className="px-2 py-1 rounded text-xs bg-zinc-800">
                                                        {getOrderTypeLabel(item.OrderType)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm text-white">
                                                    <div className="flex items-center gap-1">
                                                        <span title={item.Address}>
                                                            {truncateAddress(item.Address)}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-4 w-4 p-0"
                                                            onClick={() => copyToClipboard(item.Address)}
                                                        >
                                                            <Copy className="h-3 w-3 ml-3 text-gray-400" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-white">
                                                    {item.OrderType === 16 ? (item.InAmt !== null ? formatAmount(item.InAmt) : '-') : (item.OutAmt ? formatAmount(item.OutAmt) : '-')}
                                                </TableCell>
                                                <TableCell className="text-zinc-400 text-sm">{formatTime(item.OrderTime)}</TableCell>
                                                <TableCell className="font-mono text-sm text-zinc-400">
                                                    <div className="flex items-center gap-1">
                                                        <span title={item.OutTxId || item.InUtxo}>
                                                            {item.OutTxId ? (
                                                                <a
                                                                    href={generateMempoolUrl({
                                                                        network,
                                                                        path: `tx/${item.OutTxId}`,
                                                                        chain: item.ToL1 ? Chain.BTC : Chain.SATNET,
                                                                        env: 'dev'
                                                                    })}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="hover:text-primary underline text-inherit"
                                                                    title={item.OutTxId}
                                                                >
                                                                    {truncateTxId(item.OutTxId)}
                                                                </a>
                                                            ) : item.InUtxo ? (
                                                                <a
                                                                    href={generateMempoolUrl({
                                                                        network,
                                                                        path: `tx/${item.InUtxo}`,
                                                                        chain: item.FromL1 ? Chain.BTC : Chain.SATNET,
                                                                        env: 'dev'
                                                                    })}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="hover:text-primary underline text-inherit"
                                                                    title={item.InUtxo}
                                                                >
                                                                    {truncateTxId(item.InUtxo)}
                                                                </a>
                                                            ) : '-'}
                                                        </span>
                                                        {(item.OutTxId || item.InUtxo) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-4 w-4 p-0"
                                                                onClick={() => copyToClipboard(item.OutTxId || item.InUtxo)}
                                                            >
                                                                <Copy className="h-3 w-3 ml-3 text-gray-400" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {hasDetails && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openDetailModal(item)}
                                                        >
                                                            {t('pages.dao.workflow.airdrop_history.view_details')}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                        <DialogContent className="max-w-6xl max-h-[80vh] overflow-auto">
                            <DialogHeader>
                                <DialogTitle>&nbsp;&nbsp;{t('pages.dao.workflow.airdrop_history.view_details')}</DialogTitle>
                            </DialogHeader>
                            {selectedItem && (
                                <div className="my-4">
                                    {/* <div className="text-sm font-medium text-white mb-2">详情</div> */}
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-zinc-700">
                                                {selectedItem.OrderType === 18 ? (
                                                    <>
                                                        <TableHead className="text-zinc-400 bg-zinc-800">{t('pages.dao.workflow.airdrop_history.validate_id')}</TableHead>
                                                        <TableHead className="text-zinc-400 bg-zinc-800">{t('pages.dao.workflow.airdrop_history.reason')}</TableHead>
                                                        <TableHead className="text-zinc-400 bg-zinc-800">{t('pages.dao.workflow.airdrop_history.status')}</TableHead>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TableHead className="text-zinc-400">{t('pages.dao.workflow.airdrop_history.uid')}</TableHead>
                                                        <TableHead className="text-zinc-400">{t('pages.dao.workflow.airdrop_history.address')}</TableHead>
                                                        <TableHead className="text-zinc-400">{t('pages.dao.workflow.airdrop_history.result')}</TableHead>
                                                    </>
                                                )}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedItem.OrderType === 18 && selectedItem.validate ? (
                                                <TableRow className="border-zinc-700">
                                                    <TableCell className="font-mono text-white">
                                                        <div className="space-y-2">
                                                            <div>{selectedItem.validate.uids}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-white">
                                                        <div className="space-y-2">
                                                            <div>{selectedItem.validate.reason}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-white">
                                                        <div className="space-y-2">
                                                            <div>{selectedItem.Done === 1 ? (selectedItem.validate.reason === 'validated' ? '✅ Approved' : '❌ Rejected') : '⏳ Processing'}</div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : selectedItem.airdrop?.items ? (
                                                selectedItem.airdrop.items.map((detail, idx) => (
                                                    <TableRow key={idx} className="border-zinc-700">
                                                        <TableCell className="font-mono text-white">
                                                            <div className="flex items-center gap-1">
                                                                {detail.uid}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-4 w-4 p-0"
                                                                    onClick={() => copyToClipboard(detail.uid)}
                                                                >
                                                                    <Copy className="h-3 w-3 ml-3 text-gray-400" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-sm text-white">
                                                            <div className="flex items-center gap-1">
                                                                <span title={detail.address}>
                                                                    {truncateAddress(detail.address)}
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-4 w-4 p-0"
                                                                    onClick={() => copyToClipboard(detail.address)}
                                                                >
                                                                    <Copy className="h-3 w-3 ml-3 text-gray-400" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-white">{detail.result}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : null}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

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
                                isLoading={loading}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}