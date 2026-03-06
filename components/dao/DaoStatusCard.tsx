'use client';

import React, { useMemo } from 'react';
import type { DaoContractStatus } from '@/domain/services/contract';
import { hideStr } from '@/utils';
import { useCommonStore } from '@/store/common';
import { generateMempoolUrl } from '@/utils/url';
import { Chain } from '@/types';

function assetToString(a?: { Protocol?: string; Type?: string; Ticker?: string }) {
    if (!a) return '-';
    const p = a.Protocol ?? '';
    const t = a.Type ?? '';
    const k = a.Ticker ?? '';
    if (!p && !t && !k) return '-';
    return `${p}:${t}:${k}`;
}

function pvToNumber(pv?: { Precision?: number; Value?: any } | null) {
    if (!pv) return 0;
    const prec = Number((pv as any).Precision ?? 0);
    const vRaw: any = (pv as any).Value;
    const v = typeof vRaw === 'string' ? Number(vRaw) : Number(vRaw ?? 0);
    if (!isFinite(v)) return 0;
    const d = Math.pow(10, prec);
    return d ? v / d : v;
}

export function DaoStatusCard({ status }: { status: DaoContractStatus }) {
    const { network } = useCommonStore();

    const validatorsList = useMemo(() => {
        const m = status.Validators || {};
        const arr = Object.entries(m).map(([address, pv]) => ({
            address,
            value: pvToNumber(pv as any),
            raw: pv,
        }));
        arr.sort((a, b) => b.value - a.value);
        return arr;
    }, [status.Validators]);

    const enableTxLink = status.enableTxId
        ? generateMempoolUrl({ network, chain: Chain.BTC, env: 'dev', path: `tx/${status.enableTxId}` })
        : '';

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-col gap-1">
                <div className="text-sm text-zinc-500">Contract</div>
                <div className="text-zinc-200 font-medium flex flex-wrap gap-x-3 gap-y-1 items-center">
                    <span>{status.contractType || '-'}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400">{assetToString(status.assetName as any)}</span>
                    {status.status != null && (
                        <>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-400">status: {status.status}</span>
                        </>
                    )}
                </div>
                {status.deployer && (
                    <div className="text-xs text-zinc-500 break-all">deployer: {status.deployer}</div>
                )}
                {status.enableTxId && enableTxLink && (
                    <a className="text-xs text-blue-400 underline break-all" href={enableTxLink} target="_blank" rel="noreferrer">
                        enableTx: {hideStr(status.enableTxId, 8)}
                    </a>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-500">Pool Asset</div>
                    <div className="text-zinc-200 font-semibold">{pvToNumber(status.AssetAmtInPool as any).toLocaleString()}</div>
                </div>
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-500">Pool Sats</div>
                    <div className="text-zinc-200 font-semibold">{Number(status.SatsValueInPool || 0).toLocaleString()}</div>
                </div>
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-500">UID Count</div>
                    <div className="text-zinc-200 font-semibold">{Number(status.uidCount || 0).toLocaleString()}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-500 mb-2">Blocks</div>
                    <div className="text-sm text-zinc-300">L2: enable {status.enableBlock ?? '-'} / current {status.currentBlock ?? '-'}</div>
                    <div className="text-sm text-zinc-300">L1: enable {status.enableBlockL1 ?? '-'} / current {status.currentBlockL1 ?? '-'}</div>
                </div>
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-500 mb-2">Params</div>
                    <div className="text-sm text-zinc-300">validators: {status.ValidatorNum}</div>
                    <div className="text-sm text-zinc-300">register fee: {status.RegisterFee} sats</div>
                    <div className="text-sm text-zinc-300">register timeout: {status.RegisterTimeOut} blocks</div>
                    <div className="text-sm text-zinc-300">holding threshold: {status.HoldingAssetThreshold}</div>
                    <div className="text-sm text-zinc-300">airdrop ratio: {status.AirDropRatio} / limit: {status.AirDropLimit}</div>
                    <div className="text-sm text-zinc-300">airdrop timeout: {status.AirDropTimeOut} blocks</div>
                </div>
            </div>

            <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-3">
                <div className="text-xs text-zinc-500 mb-2">Validators (top donate)</div>
                {validatorsList.length === 0 ? (
                    <div className="text-sm text-zinc-500">-</div>
                ) : (
                    <div className="space-y-2">
                        {validatorsList.map((v, idx) => (
                            <div key={v.address} className="flex items-center justify-between text-sm">
                                <div className="text-zinc-400 font-mono">#{idx + 1} {hideStr(v.address, 6)}</div>
                                <div className="text-zinc-200 font-semibold">{v.value.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
