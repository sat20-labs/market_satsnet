"use client";
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRankPagination, formatPtsX100 } from '@/application/useRankService';
import { useTranslation } from 'react-i18next';

function shortAddr(addr?: string, head: number = 8, tail: number = 6) {
    if (!addr) return '-';
    const s = String(addr);
    if (s.length <= head + tail + 1) return s;
    return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export default function ReferralRankPanel() {
    const [period, setPeriod] = React.useState<'total' | 'month'>('month');
    const { entries, hasMore, loadMore, resetAndLoad, loading, initialized } = useRankPagination('referral', period, 20);
    const { t } = useTranslation();

    React.useEffect(() => { if (!initialized && !loading) resetAndLoad(); }, [initialized, loading, resetAndLoad, period]);

    const changePeriod = (p: 'total' | 'month') => {
        if (p === period) {
            resetAndLoad();
        } else {
            setPeriod(p);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-white font-medium">{t('pages.points.ref_rank_title')}</div>
                    <div className="text-zinc-400 text-xs">{t('pages.points.unit_with_colon', { unit: t('pages.points.unit', { defaultValue: 'SMP' }) })}</div>
                </div>
                <div className="flex gap-2">
                    <Button variant={period === 'month' ? undefined : 'outline'} className={`h-8 text-xs ${period === 'month' ? 'btn-gradient' : 'border-zinc-600'}`} onClick={() => changePeriod('month')}>{t('pages.points.month_rank')}</Button>
                    <Button variant={period === 'total' ? undefined : 'outline'} className={`h-8 text-xs ${period === 'total' ? 'btn-gradient' : 'border-zinc-600'}`} onClick={() => changePeriod('total')}>{t('pages.points.total_rank')}</Button>
                </div>
            </div>
            <div className="space-y-2">
                {loading && !initialized ? (
                    <div className="text-zinc-400 text-sm">{t('common.loading')}</div>
                ) : entries.length === 0 ? (
                    <div className="text-zinc-400 text-sm">{t('common.nodata')}</div>
                ) : (
                    entries.map((e, idx) => (
                        <Card key={`${e.address}-${idx}`} className="p-3 bg-zinc-950 border border-zinc-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 text-center text-xs text-zinc-400">{idx + 1}</div>
                                    <div className="text-zinc-300 font-mono truncate" title={e.address}>{shortAddr(e.address)}</div>
                                </div>
                                <div className="text-green-400 font-semibold">{formatPtsX100(e.pointsX100)} SMP</div>
                            </div>
                        </Card>
                    ))
                )}
                {hasMore && (
                    <div className="flex justify-center pt-2">
                        <Button disabled={loading} variant="outline" className="text-xs border-zinc-600" onClick={() => loadMore()}>{loading ? t('common.loading') : t('common.load_more')}</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
