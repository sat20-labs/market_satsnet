'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { contractService } from '@/domain/services/contract';

interface LeaderboardItem {
    uid: string;
    address: string;
    amt: {
        Precision: number;
        Value: string;
    };
    referralCount: number;
}

interface HistoryItem {
    Id: number;
    InUtxo: string;
    Address: string;
    UID?: string;
    Action: string;
    Param: string;
    BlockHeight: number;
    Timestamp: number;
    TxId?: string;
}

interface DaoLeaderboardProps {
    items: LeaderboardItem[];
    type: 'donate' | 'airdrop';
    contractUrl: string;
    userAddress?: string;
}

function formatAmount(amt: { Precision: number; Value: string }): string {
    if (!amt || !amt.Value) return '0';
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
}

function truncateAddress(address: string): string {
    if (!address || address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

function formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp * 1000;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
}

function LeaderboardTable({ items }: { items: LeaderboardItem[] }) {
    const { t } = useTranslation();

    if (!items || items.length === 0) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500">
                {t('pages.dao.leaderboard.no_data', { defaultValue: '暂无排行数据' })}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-zinc-800">
                        <th className="text-left py-2 px-2 text-zinc-400 font-normal">
                            {t('pages.dao.leaderboard.rank', { defaultValue: '排名' })}
                        </th>
                        <th className="text-left py-2 px-2 text-zinc-400 font-normal">
                            {t('pages.dao.leaderboard.uid', { defaultValue: 'UID' })}
                        </th>
                        <th className="text-left py-2 px-2 text-zinc-400 font-normal">
                            {t('pages.dao.leaderboard.address', { defaultValue: '地址' })}
                        </th>
                        <th className="text-right py-2 px-2 text-zinc-400 font-normal">
                            {t('pages.dao.leaderboard.amount', { defaultValue: '数量' })}
                        </th>
                        {/* <th className="text-right py-2 px-2 text-zinc-400 font-normal">
                            {t('pages.dao.leaderboard.referrals', { defaultValue: '推荐数' })}
                        </th> */}
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr
                            key={`${item.uid}-${index}`}
                            className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                        >
                            <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                    {index < 3 ? (
                                        <span className={`
                                            inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                                            ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' : ''}
                                            ${index === 1 ? 'bg-gray-400/20 text-gray-400' : ''}
                                            ${index === 2 ? 'bg-orange-600/20 text-orange-600' : ''}
                                        `}>
                                            {index + 1}
                                        </span>
                                    ) : (
                                        <span className="text-zinc-400 w-6 text-center">{index + 1}</span>
                                    )}
                                </div>
                            </td>
                            <td className="py-3 px-2">
                                <span className="font-mono text-white">{item.uid}</span>
                            </td>
                            <td className="py-3 px-2">
                                <span className="font-mono text-zinc-400 text-xs" title={item.address}>
                                    {truncateAddress(item.address)}
                                </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                                <span className="text-white font-medium">
                                    {formatAmount(item.amt)}
                                </span>
                            </td>
                            {/* <td className="py-3 px-2 text-right">
                                <span className="text-zinc-300">{item.referralCount}</span>
                            </td> */}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MyHistory({ contractUrl, userAddress, actionType }: { contractUrl: string; userAddress?: string; actionType: 'donate' | 'airdrop' }) {
    const { t } = useTranslation();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!userAddress || !contractUrl) return;

            setLoading(true);
            try {
                const result = await contractService.getUserHistoryInContract(contractUrl, userAddress, 0, 20);
                const filtered = result.data.filter((item: HistoryItem) => item.Action === actionType);
                setHistory(filtered);
            } catch (error) {
                console.error('Failed to fetch user history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [contractUrl, userAddress, actionType]);

    if (!userAddress) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500">
                {t('pages.dao.leaderboard.connect_wallet', { defaultValue: '请连接钱包查看记录' })}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500">
                {t('common.loading', { defaultValue: '加载中...' })}
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500">
                {t('pages.dao.leaderboard.no_history', { defaultValue: '暂无记录' })}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {history.map((item, index) => {
                let amount = '0';
                try {
                    const param = JSON.parse(item.Param);
                    amount = param.amt || '0';
                } catch (e) {
                    // ignore
                }

                return (
                    <div
                        key={`${item.Id}-${index}`}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:bg-zinc-800/50 transition-colors"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-zinc-400 text-sm">
                                    {formatTimeAgo(item.Timestamp)}
                                </span>
                                <span className="font-mono text-xs text-zinc-500" title={item.Address}>
                                    {truncateAddress(item.Address)}
                                </span>
                            </div>
                            <div className="text-white font-medium">
                                {amount}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function RecentActivity({ contractUrl, actionType, assetTicker }: { contractUrl: string; actionType: 'donate' | 'airdrop'; assetTicker?: string }) {
    const { t } = useTranslation();
    const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRecentHistory = async () => {
            if (!contractUrl) return;

            setLoading(true);
            try {
                const result = await contractService.getContractHistory(contractUrl, 0, 50);
                const filtered = result.data.filter((item: HistoryItem) => item.Action === actionType).slice(0, 10);
                setRecentHistory(filtered);
            } catch (error) {
                console.error('Failed to fetch recent history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentHistory();
    }, [contractUrl, actionType]);

    if (loading) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500">
                {t('common.loading', { defaultValue: '加载中...' })}
            </div>
        );
    }

    if (recentHistory.length === 0) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500">
                {t('pages.dao.leaderboard.no_recent', { defaultValue: '暂无最近记录' })}
            </div>
        );
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm font-medium text-white mb-3">
                {t('pages.dao.leaderboard.recent_activity', { defaultValue: '最近记录' })}
            </div>
            <div className="space-y-2">
                {recentHistory.map((item, index) => {
                    let amount = '0';
                    try {
                        const param = JSON.parse(item.Param);
                        amount = param.amt || '0';
                    } catch (e) {
                        // ignore
                    }

                    const actionText = actionType === 'donate'
                        ? t('pages.dao.leaderboard.donated', { defaultValue: '捐赠' })
                        : t('pages.dao.leaderboard.airdropped', { defaultValue: '空投' });

                    return (
                        <div
                            key={`${item.Id}-${index}`}
                            className="flex items-center justify-between text-sm py-2 border-b border-zinc-800/50 last:border-0"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-zinc-400 text-xs min-w-[80px]">
                                    {formatTimeAgo(item.Timestamp)}
                                </span>
                                <span className="font-mono text-xs text-zinc-500" title={item.Address}>
                                    {truncateAddress(item.Address)}
                                </span>
                                <span className="text-zinc-400">{actionText}</span>
                                <span className="text-white font-medium">{amount}</span>
                                {assetTicker && <span className="text-zinc-400">{assetTicker}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function DaoLeaderboard({ items, type, contractUrl, userAddress }: DaoLeaderboardProps) {
    const { t } = useTranslation();

    const title = type === 'donate'
        ? t('pages.dao.leaderboard.donate_title', { defaultValue: '捐赠排行榜' })
        : t('pages.dao.leaderboard.airdrop_title', { defaultValue: '空投排行榜' });

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <Tabs defaultValue="leaderboard">
                <TabsList>
                    <TabsTrigger value="leaderboard">
                        {type === 'donate'
                            ? t('pages.dao.leaderboard.donate_ranking', { defaultValue: '捐赠排行' })
                            : t('pages.dao.leaderboard.airdrop_ranking', { defaultValue: '空投排行' })
                        }
                    </TabsTrigger>
                    <TabsTrigger value="my">
                        {type === 'donate'
                            ? t('pages.dao.leaderboard.my_donate', { defaultValue: '我的捐赠' })
                            : t('pages.dao.leaderboard.my_airdrop', { defaultValue: '我的空投' })
                        }
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="leaderboard" className="space-y-4">
                    <LeaderboardTable items={items} />
                    <RecentActivity contractUrl={contractUrl} actionType={type} />
                </TabsContent>

                <TabsContent value="my">
                    <MyHistory contractUrl={contractUrl} userAddress={userAddress} actionType={type} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
