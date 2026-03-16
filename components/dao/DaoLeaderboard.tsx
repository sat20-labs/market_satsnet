'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

interface LeaderboardItem {
    uid: string;
    address: string;
    amt: {
        Precision: number;
        Value: string;
    };
    referralCount: number;
}

interface DaoLeaderboardProps {
    items: LeaderboardItem[];
    type: 'donate' | 'airdrop';
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

export function DaoLeaderboard({ items, type }: DaoLeaderboardProps) {
    const { t } = useTranslation();

    if (!items || items.length === 0) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500">
                {t('pages.dao.leaderboard.no_data', { defaultValue: '暂无排行数据' })}
            </div>
        );
    }

    const title = type === 'donate'
        ? t('pages.dao.leaderboard.donate_title', { defaultValue: '捐赠排行榜' })
        : t('pages.dao.leaderboard.airdrop_title', { defaultValue: '空投排行榜' });

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm font-medium text-white mb-4">{title}</div>

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
                            <th className="text-right py-2 px-2 text-zinc-400 font-normal">
                                {t('pages.dao.leaderboard.referrals', { defaultValue: '推荐数' })}
                            </th>
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
                                <td className="py-3 px-2 text-right">
                                    <span className="text-zinc-300">{item.referralCount}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
