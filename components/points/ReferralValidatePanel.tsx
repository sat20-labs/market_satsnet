"use client";
import React from 'react';
import { Card } from '@/components/ui/card';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { fetchReferralValidateList, ReferralValidateResult } from '@/application/useReferralValidateService';
import { useTranslation } from 'react-i18next';

function shortAddr(addr?: string, head: number = 8, tail: number = 6) {
    if (!addr) return '-';
    const s = String(addr);
    if (s.length <= head + tail + 1) return s;
    return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export default function ReferralValidatePanel() {
    const { t } = useTranslation();
    const { address, connected } = useReactWalletStore(s => s);
    const [loading, setLoading] = React.useState(false);
    const [data, setData] = React.useState<ReferralValidateResult | undefined>(undefined);

    const load = React.useCallback(async (addr?: string) => {
        if (!addr) return;
        setLoading(true);
        const res = await fetchReferralValidateList(addr.trim());
        setData(res);
        setLoading(false);
    }, []);

    React.useEffect(() => { if (address) load(address); }, [address, load]);

    // Build unified list with valid first
    const unified = React.useMemo(() => {
        if (!data) return [] as Array<{ address: string; bindBlock?: number; points?: number; valid: boolean }>;
        const byAddr = new Map<string, { address: string; bindBlock?: number; points?: number }>();
        for (const it of data.externalList || []) {
            byAddr.set(it.address, { address: it.address, bindBlock: it.bindBlock, points: undefined });
        }
        for (const it of data.internalList || []) {
            const prev = byAddr.get(it.address) || { address: it.address };
            byAddr.set(it.address, { address: it.address, bindBlock: prev.bindBlock ?? it.bindBlock, points: it.points });
        }
        const validSet = new Set((data.validItems || []).map(v => v.address));
        const rows = Array.from(byAddr.values()).map(v => ({ ...v, valid: (v.points ?? 0) > 0 || validSet.has(v.address) }));
        rows.sort((a, b) => {
            if (a.valid !== b.valid) return a.valid ? -1 : 1; // valid first
            const pa = a.points ?? -1, pb = b.points ?? -1;
            if (pb !== pa) return pb - pa; // points desc
            const ba = a.bindBlock ?? -1, bb = b.bindBlock ?? -1;
            return bb - ba; // bind block desc
        });
        return rows;
    }, [data]);

    const summary = React.useMemo(() => {
        if (!data) return { total: 0, valid: 0, points: 0 };
        const total = Number(data.externalTotal || data.externalList?.length || 0);
        const valid = Number(data.validCount || (data.validItems?.length || 0));
        const points = (data.validItems || []).reduce((s, it) => s + (Number(it.points || 0)), 0);
        return { total, valid, points };
    }, [data]);

    if (!connected || !address) {
        return <div className="text-sm text-zinc-400">{t('pages.points.ref_validate_connect_tip')}</div>;
    }

    return (
        <div className="space-y-4">
            {loading && !data ? <div className="text-sm text-zinc-400">{t('common.loading')}</div> : null}

            {data && (
                <div className="space-y-4">
                    <div className="text-sm text-zinc-300 flex flex-wrap gap-4">
                        <span>{t('pages.points.ref_validate_summary_total', { value: summary.total })}</span>
                        <span>{t('pages.points.ref_validate_summary_valid', { value: summary.valid })}</span>
                        <span>{t('pages.points.ref_validate_summary_points', { value: summary.points })}</span>
                    </div>
                    <div className="text-sm text-zinc-400">{t('pages.points.ref_validate_referrer', { name: data.referrer || '-' })}</div>

                    <Card className="py-4 px-0">
                        <div className="text-white font-medium">{t('pages.points.ref_validate_list_title')}</div>
                        <div className="mt-3 grid grid-cols-12 text-xs font-medium text-zinc-500 px-2">
                            <div className="col-span-6">{t('pages.points.ref_validate_col_address')}</div>
                            <div className="col-span-2">{t('pages.points.ref_validate_col_block')}</div>
                            <div className="col-span-2">{t('pages.points.ref_validate_col_points')}</div>
                            <div className="col-span-2">{t('pages.points.ref_validate_col_status')}</div>
                        </div>
                        <div className="mt-1 divide-y divide-zinc-800">
                            {unified.length === 0 ? (
                                <div className="text-zinc-500 text-sm p-3">{t('pages.points.ref_validate_empty')}</div>
                            ) : unified.map((it, idx) => (
                                <div key={`${it.address}-${idx}`} className="grid grid-cols-12 items-center py-2 px-2 text-sm">
                                    <div className="col-span-6 font-mono truncate text-zinc-300" title={it.address}>{shortAddr(it.address, 10, 8)}</div>
                                    <div className="col-span-2 text-zinc-400">{it.bindBlock ?? '-'}</div>
                                    <div className="col-span-2 text-zinc-300">{it.points ?? '-'}</div>
                                    <div className="col-span-2">
                                        <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded ${it.valid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-200'}`}>{it.valid ? t('pages.points.ref_validate_status_valid') : t('pages.points.ref_validate_status_no_trade')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {!loading && !data ? <div className="text-sm text-zinc-500">{t('pages.points.ref_validate_no_data_or_failed')}</div> : null}
        </div>
    );
}
