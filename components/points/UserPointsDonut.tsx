"use client";
import React from 'react';
import { Card } from '@/components/ui/card';
import { useMarketPoints } from '@/application/usePointsService';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function UserPointsDonut({ address: propAddress, className }: { address?: string; className?: string }) {
    const { t } = useTranslation();
    const { address: wallet, connected } = useReactWalletStore(s => s);
    const addr = propAddress || wallet;
    const { data } = useMarketPoints(undefined as any, addr);
    const [pulse, setPulse] = React.useState(false);

    React.useEffect(() => {
        const onHalving = () => {
            setPulse(true);
            const tmr = setTimeout(() => setPulse(false), 1600);
            return () => clearTimeout(tmr);
        };
        window.addEventListener('points:halving', onHalving as any);
        return () => window.removeEventListener('points:halving', onHalving as any);
    }, []);

    const trade = Number(data?.trade?.totalPoints || 0);
    const referral = Number(data?.referral || 0);
    const reward = Number(data?.reward || 0);
    const total = Math.max(0.00001, trade + referral + reward);

    const pTrade = (trade / total) * 100;
    const pReferral = (referral / total) * 100;
    const pReward = (reward / total) * 100;

    const c1 = '#60a5fa'; // blue-400
    const c2 = '#34d399'; // emerald-400
    const c3 = '#f59e0b'; // amber-500

    const bg = `conic-gradient(${c1} 0 ${pTrade}%, ${c2} ${pTrade}% ${pTrade + pReferral}%, ${c3} ${pTrade + pReferral}% 100%)`;

    return (
        <Card className={cn('p-1 sm:p-4 bg-zinc-900/70 border border-zinc-700 rounded-xl', className)}>
            <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400">{t('pages.points.donut_title')}</div>
                <div className="text-xs text-zinc-500">{addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : t('pages.points.not_connected_short')}</div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3 items-center">
                <div className="col-span-2 flex items-center justify-center">
                    <div className={cn('relative w-40 h-40 rounded-full', pulse && 'ring-2 ring-amber-400/60 transition-all')} style={{ background: bg }}>
                        <div className="absolute inset-4 rounded-full bg-zinc-900/95 border border-zinc-700 flex flex-col items-center justify-center">
                            <div className="text-xs text-zinc-500">{t('common.total')}</div>
                            <div className="text-lg font-semibold text-white">{(trade + referral + reward).toFixed(2)}</div>
                            <div className="text-[10px] text-zinc-500">{t('pages.points.unit')}</div>
                        </div>
                    </div>
                </div>
                <div className="col-span-1 flex flex-col gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c1 }} />
                        <span className="text-zinc-300">{t('pages.points.trade')}</span>
                        <span className="ml-auto text-zinc-400">{trade.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c2 }} />
                        <span className="text-zinc-300">{t('pages.points.referral')}</span>
                        <span className="ml-auto text-zinc-400">{referral.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c3 }} />
                        <span className="text-zinc-300">{t('pages.points.reward')}</span>
                        <span className="ml-auto text-zinc-400">{reward.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
