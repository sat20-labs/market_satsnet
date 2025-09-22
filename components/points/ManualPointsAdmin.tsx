"use client";
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useManualPointsPagination, addManualPoints, reverseManualPoints, type ManualPointRecord, useManualPointsByOperatorPagination, getManualPointById } from '@/application/useManualPointsService';

function maskAdmin(addr?: string): string { if (!addr) return '-'; const s = String(addr); return `***${s.slice(-4)}`; }
function fmt(v: number) { return Number(v.toFixed(2)); }
function shortAddr(addr?: string, head: number = 10, tail: number = 6) {
    if (!addr) return '-';
    const s = String(addr);
    if (s.length <= head + tail + 1) return s;
    return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export default function ManualPointsAdmin({ initialAddress }: { initialAddress?: string }) {
    const { t } = useTranslation();
    const { address, connected } = useReactWalletStore(s => s);
    const queryClient = useQueryClient();

    const ADMIN_ADDRS = (process.env.NEXT_PUBLIC_POINTS_ADMINS || '').toLowerCase();
    const isAdmin = !!(connected && address && (ADMIN_ADDRS === '*' || ADMIN_ADDRS.split(/[\s,]+/).filter(Boolean).includes(address.toLowerCase())));

    // Inputs default to empty per requirement; no prefill from wallet or storage
    const [target, setTarget] = React.useState<string>('');

    const [points, setPoints] = React.useState<string>('');
    const [reason, setReason] = React.useState<string>('');
    const [revId, setRevId] = React.useState<string>('');
    const [revReason, setRevReason] = React.useState<string>('');
    const [msg, setMsg] = React.useState<string | null>(null);
    const [err, setErr] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [reversing, setReversing] = React.useState(false);
    const [optimistic, setOptimistic] = React.useState<ManualPointRecord[]>([]);

    // Reverse confirmation modal state
    const [revModalOpen, setRevModalOpen] = React.useState(false);
    const [revModalId, setRevModalId] = React.useState<string>('');
    const [revModalReason, setRevModalReason] = React.useState<string>('');
    const [revModalPreview, setRevModalPreview] = React.useState<ManualPointRecord | undefined>(undefined);

    // View tabs: by target address or by operator
    const [viewTab, setViewTab] = React.useState<'operator' | 'address'>('operator');
    const [operatorFilter, setOperatorFilter] = React.useState<string>(''); // optional target filter in operator view

    // Lists
    // Only load address list when user enters a target
    const listAddress = target;
    const { records: addrRecords, hasMore: addrHasMore, loadMore: addrLoadMore, resetAndLoad: addrReset, loading: addrLoading, initialized: addrInitialized, setRecords: setAddrRecords } = useManualPointsPagination(listAddress, 20);
    const { records: opRecords, hasMore: opHasMore, loadMore: opLoadMore, resetAndLoad: opReset, loading: opLoading, initialized: opInitialized, setRecords: setOpRecords } = useManualPointsByOperatorPagination(address, operatorFilter || undefined, 20);

    // idempotency refs
    const refAdd = React.useRef<string | undefined>(undefined);
    const refRev = React.useRef<string | undefined>(undefined);
    const newRef = () => `mp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    React.useEffect(() => { refAdd.current = undefined; }, [target, points, reason]);
    React.useEffect(() => { refRev.current = undefined; }, [revId, revReason]);

    // initial loads
    React.useEffect(() => { if (listAddress && !addrInitialized && !addrLoading) addrReset(); }, [listAddress, addrInitialized, addrLoading, addrReset]);
    React.useEffect(() => { if (address && isAdmin && !opInitialized && !opLoading) opReset(); }, [address, isAdmin, opInitialized, opLoading, opReset]);

    const invalidateSummary = async (addr?: string) => {
        const a = addr || listAddress;
        if (a) await queryClient.invalidateQueries({ queryKey: ['points-summary-v2', a] });
    };

    const onAdd = async () => {
        setMsg(null); setErr(null);
        if (!isAdmin) { setErr(t('pages.points.admin_only')); return; }
        if (!connected || !address) { setErr(t('pages.points.connect_first')); return; }
        const tgt = (target || '').trim();
        if (!tgt) { setErr(t('pages.points.target_required')); return; }
        const p = parseFloat(points);
        if (!isFinite(p)) { setErr(t('pages.points.points_must_number')); return; }
        if ((reason || '').trim() === '') { setErr(t('pages.points.reason_required')); return; }
        if (!refAdd.current) refAdd.current = newRef();
        setSubmitting(true);
        try {
            const res = await addManualPoints({ address: tgt, points: p, reason, operator: address, ref_id: refAdd.current });
            if (!res) setErr(t('common.request_failed', { defaultValue: 'Request failed' }));
            else {
                setMsg(res.created ? t('pages.points.submitted_with_id', { points: fmt(res.record.points), id: res.record.id }) : t('pages.points.idempotent_with_id', { id: res.record.id }));
                // optimistic prepend to both views
                setOptimistic(prev => [res.record, ...prev]);
                setAddrRecords(prev => [res.record, ...prev]);
                setOpRecords(prev => [res.record, ...prev]);
                await invalidateSummary(tgt);
                addrReset();
                opReset();
                setViewTab('operator');
            }
        } catch (e: any) { setErr(e?.message || t('common.error', { defaultValue: 'Error' })); } finally { setSubmitting(false); }
    };

    const openReverseModalById = async () => {
        setMsg(null); setErr(null);
        if (!revId.trim()) { setErr(t('pages.points.record_id_required')); return; }
        const preview = await getManualPointById(revId.trim());
        setRevModalId(revId.trim());
        setRevModalReason(revReason || '');
        setRevModalPreview(preview);
        setRevModalOpen(true);
    };

    const confirmReverse = async () => {
        setMsg(null); setErr(null);
        if (!isAdmin) { setErr(t('pages.points.admin_only')); return; }
        if (!connected || !address) { setErr(t('pages.points.connect_first')); return; }
        const idRaw = (revModalId || '').trim(); if (!idRaw) { setErr(t('pages.points.record_id_required')); return; }
        if (!refRev.current) refRev.current = newRef();
        setReversing(true);
        try {
            const idVal = /^(\d+)$/.test(idRaw) ? Number(idRaw) : idRaw;
            const rec = await reverseManualPoints({ id: idVal, reason: revModalReason || undefined, operator: address, ref_id: refRev.current });
            if (!rec) setErr(t('common.request_failed', { defaultValue: 'Request failed' })); else {
                setMsg(t('pages.points.reversed_with_id', { id: rec.id }));
                await invalidateSummary(rec.address);
                addrReset();
                opReset();
                setRevModalOpen(false);
            }
        } catch (e: any) { setErr(e?.message || t('common.error', { defaultValue: 'Error' })); } finally { setReversing(false); }
    };

    const handleReverseInline = async (rec: ManualPointRecord) => {
        setRevModalId(String(rec.id));
        setRevModalReason('');
        setRevModalPreview(rec);
        setRevModalOpen(true);
    };

    const copy = async (text?: string) => {
        try { if (text) await navigator.clipboard.writeText(text); setMsg(t('common.copied_successfully')); } catch { }
    };

    if (!isAdmin) {
        return (
            <Card className="rounded-xl bg-zinc-900/70 border-zinc-700 p-4">
                <div className="text-sm text-zinc-400">{t('pages.points.admin_only')}</div>
            </Card>
        );
    }

    return (
        <div className="space-y-4 mt-4">
            {/* Reverse confirmation modal */}
            <Dialog open={revModalOpen} onOpenChange={setRevModalOpen}>
                <DialogContent className="sm:max-w-xl bg-zinc-900 border border-zinc-700">
                    <DialogHeader>
                        <DialogTitle>{t('pages.points.reverse_confirm_title')}</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm text-zinc-300 space-y-2">
                        <div><span className="text-zinc-500">{t('pages.points.id_label')}：</span>{revModalId || '-'}</div>
                        <div><span className="text-zinc-500">{t('pages.points.target_label')}：</span><span className="font-mono" title={revModalPreview?.address || ''}>{shortAddr(revModalPreview?.address)}</span></div>
                        <div><span className="text-zinc-500">{t('pages.points.points_label')}：</span>{revModalPreview ? fmt(revModalPreview.points) : '-'}</div>
                        <div><span className="text-zinc-500">{t('pages.points.time_label')}：</span>{revModalPreview?.createdAt ? new Date(revModalPreview.createdAt).toLocaleString() : '-'}</div>
                        <div><span className="text-zinc-500">{t('pages.points.admin_label')}：</span>{revModalPreview?.operator ? maskAdmin(revModalPreview.operator) : (address ? maskAdmin(address) : '-')}</div>
                        <div className="pt-1">
                            <Input placeholder={t('pages.points.reverse_reason_optional') as string} value={revModalReason} onChange={e => setRevModalReason(e.target.value)} className="bg-zinc-950 border-zinc-700" />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" className="border-zinc-600" onClick={() => setRevModalOpen(false)}>{t('common.close')}</Button>
                        <Button className='btn-gradient' onClick={confirmReverse} disabled={reversing}>{reversing ? t('common.submitting') : t('pages.points.reverse_confirm_button')}</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Card className="rounded-xl bg-amber-500/5 border-amber-500/30 p-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-amber-300">{t('pages.points.admin_section_title')}</h2>
                </div>
                <div className="mt-3 grid gap-3">
                    <div className="text-xs text-zinc-400 flex items-center gap-2">
                        <span>{t('pages.points.operator_label')}</span>
                        <span className="font-mono text-zinc-200 truncate max-w-[55vw] sm:max-w-none" title={address || ''}>{shortAddr(address)}</span>
                        <Button variant="outline" className="h-6 px-2 text-[11px] border-zinc-600" onClick={() => copy(address)}>{t('common.copy')}</Button>
                        <span className="text-zinc-500">{t('pages.points.not_modifiable')}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
                        <Input placeholder={t('pages.points.target_placeholder') as string} value={target} onChange={e => setTarget(e.target.value)} className="sm:col-span-2 bg-zinc-950 border-zinc-700 font-mono text-[12px] sm:text-sm" />
                        <Input placeholder={t('pages.points.points_placeholder') as string} value={points} onChange={e => setPoints(e.target.value)} className="bg-zinc-950 border-zinc-700" />

                    </div>
                    <div>
                        <Textarea placeholder={t('pages.points.reason_placeholder') as string} value={reason} onChange={e => setReason(e.target.value)} className="bg-zinc-950 border-zinc-700 min-h-[72px]" />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={onAdd} disabled={submitting || !connected} className="btn-gradient h-8 text-sm">{submitting ? t('common.submitting') : t('pages.points.admin_submit')}</Button>
                    </div>
                    {(msg || err) && <div className={`text-xs ${err ? 'text-red-400' : 'text-emerald-400'}`}>{err || msg}</div>}
                </div>
            </Card>

            <Card className="rounded-xl bg-zinc-900/70  p-4">
                <Tabs defaultValue={viewTab} value={viewTab} onValueChange={(v) => setViewTab(v as any)} className="w-full">
                    <TabsList className="grid grid-cols-2 bg-zinc-800">
                        <TabsTrigger value="operator">{t('pages.points.tab_by_operator')}</TabsTrigger>
                        <TabsTrigger value="address">{t('pages.points.tab_by_address')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="operator" className="mt-3 space-y-3">
                        <div className="flex items-center gap-2">
                            <Input placeholder={t('pages.points.filter_by_target_optional') as string} value={operatorFilter} onChange={e => setOperatorFilter(e.target.value)} className="bg-zinc-950 border-zinc-700" />
                            <Button variant="outline" className="border-zinc-600 h-8" onClick={() => opReset()}>{t('common.refresh')}</Button>
                        </div>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {opLoading && !opInitialized ? <div className="text-zinc-400 text-sm">{t('common.loading')}</div> : (opRecords.length === 0 ? <div className="text-zinc-400 text-sm">{t('common.nodata')}</div> : (
                                <div className="space-y-2">
                                    {opRecords.map((r, idx) => {
                                        const date = r.createdAt ? new Date(r.createdAt) : null;
                                        const pos = (r.points || 0) >= 0; const pts = fmt(r.points);
                                        return (
                                            <Card key={`${r.id}-op-${idx}`} className="p-3 bg-zinc-950 border border-zinc-800">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center text-zinc-400 truncate pr-4">
                                                        <span className="text-zinc-500">{t('pages.points.target_label')}：</span>
                                                        <span className="truncate inline-block font-mono" title={r.address}>{shortAddr(r.address)}</span>
                                                        <Button variant="outline" className="ml-2 h-6 px-2 text-[11px] border-zinc-600" onClick={() => copy(r.address)}>{t('common.copy')}</Button>
                                                        <span className="ml-3 text-zinc-500">{t('pages.points.reason')}：</span>
                                                        <span className="truncate inline-block max-w-[30ch]" title={r.reason || '-'}>{r.reason || '-'}</span>
                                                    </div>
                                                    <div className={`${pos ? 'text-green-400' : 'text-red-400'} font-semibold`}>{pos ? '+' : ''}{pts} SMP</div>
                                                </div>
                                                <div className="mt-1 text-xs text-zinc-500 flex flex-wrap items-center gap-3 justify-between">
                                                    <span>{date ? date.toLocaleString() : '-'}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span>{t('pages.points.admin_label')}：{maskAdmin(r.operator)}</span>
                                                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs border-zinc-600" onClick={() => handleReverseInline(r)}>{t('pages.points.reverse_record')}</Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                    {opHasMore && (
                                        <div className="flex justify-center pt-2">
                                            <Button disabled={opLoading} variant="outline" className="text-xs border-zinc-600" onClick={() => opLoadMore()}>{opLoading ? t('common.loading') : t('common.load_more')}</Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="address" className="mt-3 space-y-3">
                        <div className="flex items-center gap-2">
                            <Input placeholder={t('pages.points.enter_address_to_view') as string} value={target} onChange={e => setTarget(e.target.value)} className="bg-zinc-950 border-zinc-700 font-mono text-[12px] sm:text-sm" />
                            <Button variant="outline" className="border-zinc-600 h-8" onClick={() => addrReset()}>{t('common.view')}</Button>
                        </div>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {(!listAddress) ? <div className="text-zinc-400 text-sm">{t('pages.points.please_enter_address')}</div> : (addrLoading && !addrInitialized) ? <div className="text-zinc-400 text-sm">{t('common.loading')}</div> : (addrRecords.length === 0 && optimistic.length === 0) ? <div className="text-zinc-400 text-sm">{t('common.nodata')}</div> : (
                                <div className="space-y-2">
                                    {[...optimistic, ...addrRecords].map((r, idx) => {
                                        const date = r.createdAt ? new Date(r.createdAt) : null;
                                        const pos = (r.points || 0) >= 0; const pts = fmt(r.points);
                                        return (
                                            <Card key={`${r.id}-addr-${idx}`} className="p-3 bg-zinc-950 border border-zinc-800">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="text-zinc-400 truncate pr-4">
                                                        <span className="text-zinc-500">{t('pages.points.reason')}：</span>
                                                        <span className="truncate inline-block max-w-[46ch] align-bottom" title={r.reason || '-'}>{r.reason || '-'}</span>
                                                    </div>
                                                    <div className={`${pos ? 'text-green-400' : 'text-red-400'} font-semibold`}>{pos ? '+' : ''}{pts} SMP</div>
                                                </div>
                                                <div className="mt-1 text-xs text-zinc-500 flex flex-wrap items-center gap-3 justify-between">
                                                    <span>{date ? date.toLocaleString() : '-'}</span>
                                                    <div className="flex items-center gap-3">
                                                        {r.operator && <span>{t('pages.points.admin_label')}：{maskAdmin(r.operator)}</span>}
                                                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs border-zinc-600" onClick={() => handleReverseInline(r)}>{t('pages.points.reverse_record')}</Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                    {addrHasMore && (
                                        <div className="flex justify-center pt-2">
                                            <Button disabled={addrLoading} variant="outline" className="text-xs border-zinc-600" onClick={() => addrLoadMore()}>{addrLoading ? t('common.loading') : t('common.load_more')}</Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    );
}
