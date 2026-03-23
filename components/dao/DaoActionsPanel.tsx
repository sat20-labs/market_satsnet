'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { DaoContractStatus } from '@/domain/services/contract';
import {
    buildAirdropInvoke,
    buildDonateInvoke,
    buildRegisterInvoke,
    DAO_ORDERTYPE_AIRDROP,
    DAO_ORDERTYPE_REGISTER,
    buildValidateInvoke,
    invokeDaoContractSatsNet,
} from '@/domain/services/dao';

function normalizeAssetName(a?: { Protocol?: string; Type?: string; Ticker?: string }) {
    if (!a?.Protocol || !a?.Type || !a?.Ticker) return '';
    return `${a.Protocol}:${a.Type}:${a.Ticker}`;
}

export function DaoActionsPanel({ contractUrl, status, onInvoked }: { contractUrl: string; status: DaoContractStatus; onInvoked?: () => void }) {
    const [loading, setLoading] = useState(false);

    const defaultAssetName = useMemo(() => normalizeAssetName(status.assetName as any), [status.assetName]);

    // register
    const [uid, setUid] = useState('');
    const [referrerUid, setReferrerUid] = useState('');

    // donate
    const [donateAsset, setDonateAsset] = useState(defaultAssetName);
    const [donateAmt, setDonateAmt] = useState('');
    const [donateSats, setDonateSats] = useState('0');

    // airdrop
    const [airdropUidsText, setAirdropUidsText] = useState('');

    // validate (manual)
    const [validateType, setValidateType] = useState<'register' | 'airdrop'>('register');
    const [validateIds, setValidateIds] = useState('');
    const [validateReason, setValidateReason] = useState('reject: invalid uid');

    const parseUidList = (text: string) => {
        const parts = text
            .split(/[\s,\n\r]+/)
            .map(s => s.trim())
            .filter(Boolean)
            .map(part => part.split(/[:：]/)[0].trim());
        return Array.from(new Set(parts));
    };

    const parseIds = (text: string) => {
        const parts = text
            .split(/[\s,\n\r]+/)
            .map(s => s.trim())
            .filter(Boolean);
        const ids = parts.map(p => {
            const n = Number(p);
            if (!Number.isFinite(n)) throw new Error(`Invalid id: ${p}`);
            return n;
        });
        return Array.from(new Set(ids));
    };

    const doInvoke = async (invoke: any) => {
        setLoading(true);
        try {
            const res: any = await invokeDaoContractSatsNet(contractUrl, invoke);
            const txId = res?.txId || res?.txid || res?.data?.txId;
            toast.success(txId ? `Submitted: ${txId}` : 'Submitted');
            onInvoked?.();
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || 'Invoke failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm text-zinc-400">Manage</div>
                    <div className="text-xs text-zinc-500 break-all">Invokes are sent on SatsNet.</div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="text-sm font-semibold text-zinc-200">Register</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <div className="text-xs text-zinc-500 mb-1">UID</div>
                        <Input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="your uid" />
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 mb-1">Referrer UID (optional)</div>
                        <Input value={referrerUid} onChange={(e) => setReferrerUid(e.target.value)} placeholder="referrer uid" />
                    </div>
                </div>
                <Button
                    className="btn-gradient"
                    disabled={loading || !uid.trim()}
                    onClick={() => doInvoke(buildRegisterInvoke(uid, referrerUid || undefined))}
                >
                    Invoke Register
                </Button>
            </div>

            <div className="space-y-3">
                <div className="text-sm font-semibold text-zinc-200">Donate</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <div className="text-xs text-zinc-500 mb-1">AssetName</div>
                        <Input value={donateAsset} onChange={(e) => setDonateAsset(e.target.value)} placeholder={defaultAssetName} />
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 mb-1">Amt</div>
                        <Input value={donateAmt} onChange={(e) => setDonateAmt(e.target.value)} placeholder="4000" />
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 mb-1">Sats value</div>
                        <Input value={donateSats} onChange={(e) => setDonateSats(e.target.value)} placeholder="0" />
                    </div>
                </div>
                <Button
                    className="btn-gradient"
                    disabled={loading || !donateAsset.trim() || !donateAmt.trim()}
                    onClick={() => doInvoke(buildDonateInvoke(donateAsset.trim(), donateAmt.trim(), Number(donateSats || 0)))}
                >
                    Invoke Donate
                </Button>
            </div>

            <div className="space-y-3">
                <div className="text-sm font-semibold text-zinc-200">Airdrop</div>
                <div>
                    <div className="text-xs text-zinc-500 mb-1">Uids (split by whitespace/comma/newline)</div>
                    <textarea
                        value={airdropUidsText}
                        onChange={(e) => setAirdropUidsText(e.target.value)}
                        className="min-h-[88px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
                        placeholder="id3\nid4\nid5"
                    />
                </div>
                <Button
                    className="btn-gradient"
                    disabled={loading || parseUidList(airdropUidsText).length === 0}
                    onClick={() => doInvoke(buildAirdropInvoke(parseUidList(airdropUidsText)))}
                >
                    Invoke Airdrop
                </Button>
            </div>

            <div className="space-y-3">
                <div className="text-sm font-semibold text-zinc-200">Validate (manual)</div>
                <div className="text-xs text-zinc-500">This sends a reject result for selected history item ids.</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <div className="text-xs text-zinc-500 mb-1">Type</div>
                        <select
                            value={validateType}
                            onChange={(e) => setValidateType(e.target.value as any)}
                            className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 text-sm text-zinc-200"
                        >
                            <option value="register">Register</option>
                            <option value="airdrop">Airdrop</option>
                        </select>
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 mb-1">History item ids</div>
                        <Input value={validateIds} onChange={(e) => setValidateIds(e.target.value)} placeholder="10 15 18" />
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 mb-1">Reason</div>
                        <Input value={validateReason} onChange={(e) => setValidateReason(e.target.value)} placeholder="reject: invalid uid" />
                    </div>
                </div>

                <Button
                    className="btn-gradient"
                    disabled={loading || !validateIds.trim()}
                    onClick={() => {
                        try {
                            const ids = parseIds(validateIds);
                            const orderType = validateType === 'register' ? DAO_ORDERTYPE_REGISTER : DAO_ORDERTYPE_AIRDROP;
                            const invoke = buildValidateInvoke(orderType, ids, validateReason, -1);
                            doInvoke(invoke);
                        } catch (e: any) {
                            toast.error(e?.message || 'Invalid validate ids');
                        }
                    }}
                >
                    Invoke Validate Reject
                </Button>
            </div>
        </div>
    );
}
