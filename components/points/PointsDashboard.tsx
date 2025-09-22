import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { useMarketPoints } from "@/application/usePointsService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useReferralDetailsPagination } from '@/application/useReferralService';
import { useTradeAssets, useTradeOrdersPagination } from '@/application/useTradePointsBackend';
import { useManualPointsPagination } from '@/application/useManualPointsService';
import { useTranslation } from 'react-i18next';
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import UserPointsDonut from '@/components/points/UserPointsDonut';
import ReferralValidatePanel from './ReferralValidatePanel';

function formatPoints(v: number): number { return Number(v.toFixed(2)); }
function maskAdmin(addr?: string): string { if (!addr) return '-'; const s = String(addr); return `***${s.slice(-4)}`; }
const VIP_THRESHOLDS = [0, 50000, 200000, 800000, 3000000, 10000000]; // VIP0..VIP5 起始所需累计积分

export default function PointsDashboard() {
    const { t, i18n } = useTranslation();
    const { address, connected } = useReactWalletStore((s) => s);
    const { data, isLoading } = useMarketPoints(undefined as any, address);
    const { data: tradeAssets = [], isLoading: assetsLoading } = useTradeAssets(connected ? address : undefined);
    const { orders, hasMore: ordersHasMore, loadMore: ordersLoadMore, resetAndLoad: ordersReset, loading: ordersLoading, initialized: ordersInitialized } = useTradeOrdersPagination(connected ? address : undefined, 40);
    const { items: referralDetails, hasMore: referralHasMore, loadMore: referralLoadMore, resetAndLoad: referralReset, loading: referralLoading, initialized: referralInitialized } = useReferralDetailsPagination(address);
    // manualAddress controls which address's manual records are shown in the dialog
    const [manualAddress, setManualAddress] = useState<string | undefined>(connected ? address : undefined);
    const { records: manualRecords, hasMore: manualHasMore, loadMore: manualLoadMore, resetAndLoad: manualReset, loading: manualLoading, initialized: manualInitialized } = useManualPointsPagination(manualAddress, 40);
    const queryClient = useQueryClient();

    // Admin allowlist via env: NEXT_PUBLIC_POINTS_ADMINS (comma/space separated) or '*' for all
    const ADMIN_ADDRS = (process.env.NEXT_PUBLIC_POINTS_ADMINS || '').toLowerCase();
    const isAdmin = !!(connected && address && (ADMIN_ADDRS === '*' || ADMIN_ADDRS.split(/[\s,]+/).filter(Boolean).includes(address.toLowerCase())));

    const totalPoints = data?.total ?? 0;
    const monthlyAdd = (data?.trade?.monthlyPoints || 0) + (data?.referralMonthly || 0) + (data?.rewardMonthly || 0);
    const vipLevel = data?.vipLevel ?? 0;
    const vipProgress = data?.vipProgress ?? 0;
    const effectiveRate = data?.effectiveRate ?? 0.35;
    const hasReferrer = !!data?.hasReferrer;
    const referralPoints = Number(data?.referral || 0);
    const referralMonthly = Number(data?.referralMonthly || 0);
    const tradePoints = Number(data?.trade?.totalPoints || 0);
    const tradeMonthlyPoints = Number(data?.trade?.monthlyPoints || 0);
    const rewardPoints = Number(data?.reward || 0);
    const rewardMonthly = Number(data?.rewardMonthly || 0);

    const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
    const [refOpen, setRefOpen] = useState(false);
    const [rewardOpen, setRewardOpen] = useState(false);

    // Lazy load orders & referral details when dialogs first open
    React.useEffect(() => { if (tradeDialogOpen && !ordersInitialized && !ordersLoading) ordersReset(); }, [tradeDialogOpen, ordersInitialized, ordersLoading, ordersReset]);
    React.useEffect(() => { if (refOpen && !referralInitialized && !referralLoading) referralReset(); }, [refOpen, referralInitialized, referralLoading, referralReset]);
    React.useEffect(() => { if (rewardOpen && !manualInitialized && !manualLoading) manualReset(); }, [rewardOpen, manualInitialized, manualLoading, manualReset]);

    // Keep manualAddress in sync with wallet if not set
    React.useEffect(() => {
        if (connected && address && !manualAddress) setManualAddress(address);
    }, [connected, address, manualAddress]);

    const tradeAggregatedPoints = formatPoints(tradePoints);
    const totalDisplay = formatPoints(totalPoints || (tradePoints + referralPoints + rewardPoints));
    const monthlyDisplay = formatPoints(monthlyAdd);

    // VIP thresholds derived data
    const currentVipLevel = vipLevel;
    const nextThreshold = VIP_THRESHOLDS[currentVipLevel + 1];
    const pointsToNext = nextThreshold ? Math.max(0, nextThreshold - totalPoints) : 0;

    const refreshPoints = async (addr?: string) => {
        const target = addr || address;
        if (target) {
            try { await queryClient.invalidateQueries({ queryKey: ['points-summary-v2', target] }); } catch { }
        }
        // refresh manual list
        try { manualReset(); } catch { }
    };

    return (
        <div className="p-1 sm:p-4 mx-auto space-y-4 sm:space-y-6">
            {/* Header & notice */}
            <div className="flex flex-col gap-2 sm:gap-3">
                <h1 className="relative text-lg sm:text-3xl font-semibold text-zinc-300 inline-block">
                    {t('pages.points.title')}<span className="text-zinc-500 text-base sm:text-2xl">({t('pages.points.unit')})</span>
                    <span className="relative -top-1 sm:-top-2 right-1 px-1.5 py-0.5 text-[10px] sm:text-xs rounded bg-indigo-500/20 text-indigo-400">
                        {t('pages.points.beta')}
                    </span>
                </h1>
                <div className="text-zinc-400 text-[11px] sm:text-xs leading-snug">
                    <div>{t('pages.points.notice')}</div>
                </div>
            </div>

            <Card className="rounded-2xl shadow-xl py-4 px-0 sm:p-6 bg-white/5 border border-gradient-to-r from-purple-500 to-pink-500">
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
                    <div className="order-2 md:order-1">
                        <p className="text-zinc-400 text-sm">{t('pages.points.balance')}</p>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">{isLoading && connected ? '…' : totalDisplay}<span className='text-zinc-400 text-base sm:text-xl'> {t('pages.points.unit')}</span></h2>
                        <p className="text-green-400 text-xs sm:text-sm mt-1">{connected ? t('pages.points.monthly_added', { value: monthlyDisplay }) : t('pages.points.connect_to_view')}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-zinc-400">
                            <span>{t('pages.points.composition')}</span>
                            <Badge className="bg-zinc-700 text-white px-1 py-1 rounded-full text-[11px] sm:text-xs">{t('pages.points.trade')} {tradeAggregatedPoints}</Badge>
                            <Badge className="bg-zinc-700 text-white px-1 py-1 rounded-full text-[11px] sm:text-xs">{t('pages.points.referral')} {referralPoints}</Badge>
                            {rewardPoints > 0 && <Badge className="bg-zinc-700 text-white px-1 py-1 rounded-full text-[11px] sm:text-xs">{t('pages.points.reward')} {formatPoints(rewardPoints)}</Badge>}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Badge className="bg-indigo-600 text-white px-2 py-1 rounded-full text-[11px] sm:text-xs">{t('pages.points.ratio', { value: Math.round(effectiveRate * 100) })}</Badge>
                            {connected ? (hasReferrer ? (
                                <Badge className="bg-emerald-600 text-white px-2 py-1 rounded-full text-[11px] sm:text-xs">{t('pages.points.ref_bound')}</Badge>
                            ) : (
                                <a href="#" className="text-[11px] sm:text-xs text-blue-400 hover:underline">{t('pages.points.ref_unbound')}</a>
                            )) : null}
                        </div>
                    </div>
                    <div className="order-1 md:order-2 flex justify-center md:justify-end">
                        <UserPointsDonut className="mx-auto md:mx-0" />
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="history" className="w-full">
                <TabsList className={`grid grid-cols-3 bg-zinc-800`}>
                    <TabsTrigger value="history">{t('pages.points.tabs.history')}</TabsTrigger>
                    <TabsTrigger value="refValidate">{t('pages.points.tabs.ref_validate')}</TabsTrigger>
                    <TabsTrigger value="rewards">{t('pages.points.tabs.rewards')}</TabsTrigger>
                </TabsList>
                <TabsContent value="history" className="mt-4 space-y-2">
                    <Card className="p-4 text-sm bg-zinc-900 border border-zinc-700">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <div className="text-white font-medium">{t('pages.points.history_trade_title')}</div>
                                <div className="text-zinc-400 mt-1">{connected ? (assetsLoading ? t('pages.points.loading') : `${t('pages.points.trade')} ${tradeAggregatedPoints} (${t('pages.points.monthly_added', { value: formatPoints(tradeMonthlyPoints) })})`) : t('pages.points.connect_to_view')}</div>
                                {!assetsLoading && connected ? (
                                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {tradeAssets.length === 0 ? <div className="text-zinc-500 text-xs">{t('pages.points.none')}</div> : tradeAssets.map((a, idx) => (
                                            <div
                                                key={idx}
                                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-zinc-400 gap-0 sm:gap-2 leading-tight"
                                            >
                                                <div className="flex items-center min-w-0">
                                                    <span className="text-zinc-500 mr-1 hidden sm:inline">{t('pages.points.record_asset')}</span>
                                                    <span className="truncate max-w-[150px] xs:max-w-[180px] sm:max-w-[220px]" title={a.asset || a.contract}>{a.asset || a.contract || 'unknown'}</span>
                                                </div>
                                                <div className="mt-0.5 sm:mt-0 text-[11px] sm:text-xs text-zinc-500 sm:text-zinc-400 flex-shrink-0">
                                                    {`${t('pages.points.trade')} ${formatPoints(a.totalPoints)} (${t('pages.points.monthly_added', { value: formatPoints(a.monthlyPoints) })}) · ${a.tradeCount}`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                            <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" disabled={!connected} className="text-sm border-zinc-600">{t('pages.points.view_details')}</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-3xl bg-zinc-900 border-zinc-700">
                                    <DialogHeader><DialogTitle>{t('pages.points.history_trade_title')}</DialogTitle></DialogHeader>
                                    <div className="mt-2 max-h-[65vh] overflow-y-auto space-y-2">
                                        {!connected ? <div className="text-zinc-400 text-sm">{t('pages.points.connect_to_view')}</div> : ordersLoading && !ordersInitialized ? <div className="text-zinc-400 text-sm">{t('pages.points.loading')}</div> : orders.length === 0 ? <div className="text-zinc-400 text-sm">{t('pages.points.none')}</div> : orders.map((o, idx) => {
                                            const date = new Date(o.orderTime * 1000);
                                            return (
                                                <Card key={idx} className="p-3 bg-zinc-950 border border-zinc-800">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-zinc-400">
                                                            <span className="text-zinc-500">{t('pages.points.record_asset')}: </span><span title={o.asset || o.contract}>{o.asset || o.contract || '-'}</span>
                                                            <span className="ml-3 text-zinc-500">{t('pages.points.record_type')}: <span className="text-xs text-zinc-400">{o.orderType === 1 ? t('pages.points.type_sell') : t('pages.points.type_buy')}</span></span>
                                                            <span className="ml-3 text-zinc-500">{t('pages.points.mode')}: <span className="text-xs text-zinc-400">{o.mode || '-'}</span></span>
                                                        </div>
                                                        <div className="text-green-400 font-semibold">+{o.points.toFixed(2)} {t('pages.points.unit')}</div>
                                                    </div>
                                                    <div className="mt-1 text-xs text-zinc-500 flex flex-wrap gap-3 justify-between">
                                                        <span>{date.toLocaleString()}</span>
                                                        <span>{t('pages.points.fee')} {o.fee} sats</span>
                                                        {o.txid ? <span className="truncate max-w-[50%]">{t('pages.points.txid')}: <a className="text-blue-400 hover:underline" href={`https://mempool.sat20.org/tx/${o.txid}`} target="_blank" rel="noopener noreferrer" title={o.txid}>{o.txid}</a></span> : <span>{t('pages.points.txid')}: -</span>}
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                        {ordersHasMore ? (
                                            <div className="flex justify-center pt-2">
                                                <Button disabled={ordersLoading} variant="outline" className="text-xs border-zinc-600 text-zinc-300" onClick={() => ordersLoadMore()}>{ordersLoading ? t('pages.points.loading') : t('pages.points.more')}</Button>
                                            </div>
                                        ) : null}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </Card>

                    <Card className="p-4 mt-4 text-sm bg-zinc-900 border border-zinc-700">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <div className="text-white font-medium">{t('pages.points.referral_title')}</div>
                                <div className="text-zinc-400 mt-1">{connected ? `${t('pages.points.trade')} ${referralPoints} ${t('pages.points.unit')} (${t('pages.points.monthly_added', { value: referralMonthly })})` : t('pages.points.connect_to_view')}</div>
                            </div>
                            <Dialog open={refOpen} onOpenChange={setRefOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" disabled={!connected} className="text-sm border-zinc-600 text-zinc-300 ">{t('pages.points.view_details')}</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-2xl bg-zinc-900 border-zinc-700">
                                    <DialogHeader><DialogTitle>{t('pages.points.referral_title')}</DialogTitle></DialogHeader>
                                    <div className="mt-2 max-h-[60vh] overflow-y-auto space-y-2">
                                        {!connected ? <div className="text-zinc-400 text-sm">{t('pages.points.connect_to_view')}</div> : referralLoading && !referralInitialized ? <div className="text-zinc-400 text-sm">{t('pages.points.loading')}</div> : referralDetails.length === 0 ? <div className="text-zinc-400 text-sm">{t('pages.points.none')}</div> : (
                                            <div className="space-y-2">
                                                {referralDetails.map((d, idx) => (
                                                    <Card key={idx} className="p-3 bg-zinc-950 border border-zinc-800">
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-zinc-400 truncate pr-4">
                                                                <span className="text-zinc-500">{t('common.address')}:</span>
                                                                <span className="truncate inline-block max-w-[46ch] align-bottom" title={d.address}>{d.address}</span>
                                                            </div>
                                                            <div className="text-green-400 font-semibold">+{Math.floor(d.points)} {t('pages.points.unit')}</div>
                                                        </div>
                                                        <div className="mt-1 text-xs text-zinc-500">{typeof d.bindBlock === 'number' ? (<span>{t('pages.points.bind_block')}: {d.bindBlock}</span>) : (<span>{t('pages.points.bind_block')}: -</span>)}</div>
                                                    </Card>
                                                ))}
                                                {referralHasMore ? (
                                                    <div className="flex justify-center pt-2">
                                                        <Button disabled={referralLoading} variant="outline" className="text-xs border-zinc-600" onClick={() => referralLoadMore()}>{referralLoading ? t('pages.points.loading') : t('pages.points.more')}</Button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </Card>

                    <Card className="p-4 mt-4 text-sm bg-zinc-900 border border-zinc-700">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <div className="text-white font-medium">{t('pages.points.reward_title')}</div>
                                <div className="text-zinc-400 mt-1">{connected ? `${t('pages.points.reward')} ${formatPoints(rewardPoints)} ${t('pages.points.unit')}${rewardMonthly ? ` (${t('pages.points.monthly_added', { value: formatPoints(rewardMonthly) })})` : ''}` : t('pages.points.connect_to_view')}</div>
                            </div>
                            <Dialog open={rewardOpen} onOpenChange={setRewardOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" disabled={!connected} className="text-sm border-zinc-600 text-zinc-300 ">{t('pages.points.view_details')}</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-2xl bg-zinc-900 border-zinc-700">
                                    <DialogHeader>
                                        <DialogTitle>{t('pages.points.reward_title')}</DialogTitle>
                                        {isAdmin && manualAddress && (
                                            <div className="text-xs text-zinc-500">{t('common.address')}: <span className="text-zinc-300">{manualAddress}</span></div>
                                        )}
                                    </DialogHeader>
                                    <div className="mt-2 max-h-[60vh] overflow-y-auto space-y-2">
                                        {!connected ? <div className="text-zinc-400 text-sm">{t('pages.points.connect_to_view')}</div> : manualLoading && !manualInitialized ? <div className="text-zinc-400 text-sm">{t('pages.points.loading')}</div> : manualRecords.length === 0 ? <div className="text-zinc-400 text-sm">{t('pages.points.none')}</div> : (
                                            <div className="space-y-2">
                                                {manualRecords.map((r, idx) => {
                                                    const date = r.createdAt ? new Date(r.createdAt) : null;
                                                    const pts = formatPoints(r.points);
                                                    const pos = (r.points || 0) >= 0;
                                                    const ptsColor = pos ? 'text-green-400' : 'text-red-400';
                                                    return (
                                                        <Card key={r.id || `${idx}-${r.createdAt}`} className="p-3 bg-zinc-950 border border-zinc-800">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="text-zinc-400 truncate pr-4">
                                                                    <span className="text-zinc-500">{t('pages.points.reason')}: </span>
                                                                    <span className="truncate inline-block max-w-[46ch] align-bottom" title={r.reason || '-'}>{r.reason || '-'}</span>
                                                                </div>
                                                                <div className={`${ptsColor} font-semibold`}>{pos ? '+' : ''}{pts} {t('pages.points.unit')}</div>
                                                            </div>
                                                            <div className="mt-1 text-xs text-zinc-500 flex flex-wrap items-center gap-3 justify-between">
                                                                <span>{date ? date.toLocaleString() : '-'}</span>
                                                                <div className="flex items-center gap-3">
                                                                    {r.operator && <span>{t('pages.points.operator')}: {maskAdmin(r.operator)}</span>}
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    );
                                                })}
                                                {manualHasMore ? (
                                                    <div className="flex justify-center pt-2">
                                                        <Button disabled={manualLoading} variant="outline" className="text-xs border-zinc-600" onClick={() => manualLoadMore()}>{manualLoading ? t('pages.points.loading') : t('pages.points.more')}</Button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="refValidate" className="mt-4">
                    <Card className="p-4 bg-zinc-900 border border-zinc-700">
                        <ReferralValidatePanel />
                    </Card>
                </TabsContent>

                <TabsContent value="rewards" className="mt-4 space-y-4">
                    <Card className="p-4 bg-zinc-900 border border-zinc-700"><h3 className="text-lg font-semibold">{t('pages.points.how_trade_title')}</h3><p className="text-sm text-zinc-400 mt-1">{t('pages.points.how_trade_desc')}</p></Card>
                    <Card className="p-4 bg-zinc-900 border border-zinc-700"><h3 className="text-lg font-semibold">{t('pages.points.how_stake_title')}</h3><p className="text-sm text-zinc-400 mt-1">{t('pages.points.how_stake_desc')}</p></Card>
                    <Card className="p-4 bg-zinc-900 border border-zinc-700"><h3 className="text-lg font-semibold">{t('pages.points.how_launch_title')}</h3><p className="text-sm text-zinc-400 mt-1">{t('pages.points.how_launch_desc')}</p></Card>
                </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-xl border border-zinc-700">
                <p className="text-sm text-white">{t('pages.points.use_points_tip')}</p>
                <Button disabled variant="outline" className="text-sm border-zinc-600">{t('pages.points.enable')}</Button>
            </div>
        </div>
    );
}
