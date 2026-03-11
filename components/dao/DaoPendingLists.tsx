'use client';

import React, { useMemo, useState } from 'react';
import type { DaoAirdropItem, DaoContractStatus, DaoRegisterItem } from '@/domain/services/contract';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    buildValidateInvoke,
    DAO_ORDERTYPE_AIRDROP,
    DAO_ORDERTYPE_REGISTER,
    invokeDaoContractSatsNet,
} from '@/domain/services/dao';

function safeParseJson<T>(s: string): T | null {
    try {
        return JSON.parse(s) as T;
    } catch {
        return null;
    }
}

function copy(text: string) {
    try {
        navigator.clipboard.writeText(text);
        toast.success('Copied');
    } catch {
        toast.error('Copy failed');
    }
}

const REASONS = [
    'reject: invalid uid',
    'reject: invalid referrer',
    'reject: duplicate uid',
    'reject: insufficient asset',
    'reject: other',
];

export function DaoPendingLists({
    status,
    contractUrl,
    onValidated,
}: {
    status: DaoContractStatus;
    contractUrl: string;
    onValidated?: () => void;
}) {
    const [registerSelected, setRegisterSelected] = useState<Record<number, boolean>>({});
    const [airdropSelected, setAirdropSelected] = useState<Record<number, boolean>>({});

    const [reasonPreset, setReasonPreset] = useState(REASONS[0]);
    const [reasonText, setReasonText] = useState('');
    const [reasonTouched, setReasonTouched] = useState(false);
    const [loading, setLoading] = useState(false);

    const validators = useMemo(() => {
        const obj = status.Validators || {};
        return Object.keys(obj); // 返回地址数组
    }, [status.Validators]);

    const isValidator = useMemo(() => {
        const pk = (window as any)?.sat20?.publicKey || '';
        const addr = (window as any)?.sat20?.selectedAddress || '';
        return validators.includes(pk) || validators.includes(addr);
    }, [validators]);

    const reason = useMemo(() => {
        const t = reasonText.trim();
        return reasonPreset === 'reject: other' ? (t ? `reject: ${t}` : 'reject: other') : reasonPreset;
    }, [reasonPreset, reasonText]);

    const registerItems = useMemo(() => {
        const arr = (status.registerList || [])
            .map((s) => safeParseJson<DaoRegisterItem>(s))
            .filter(Boolean) as DaoRegisterItem[];
        arr.sort((a, b) => (a.Id ?? 0) - (b.Id ?? 0));
        return arr;
    }, [status.registerList]);

    const airdropItems = useMemo(() => {
        const arr = (status.airdropList || [])
            .map((s) => safeParseJson<DaoAirdropItem>(s))
            .filter(Boolean) as DaoAirdropItem[];
        arr.sort((a, b) => (a.Id ?? 0) - (b.Id ?? 0));
        return arr;
    }, [status.airdropList]);

    const selectedRegisterIds = useMemo(() => {
        return Object.entries(registerSelected)
            .filter(([, v]) => v)
            .map(([k]) => Number(k))
            .filter((n) => Number.isFinite(n));
    }, [registerSelected]);

    const selectedAirdropIds = useMemo(() => {
        return Object.entries(airdropSelected)
            .filter(([, v]) => v)
            .map(([k]) => Number(k))
            .filter((n) => Number.isFinite(n));
    }, [airdropSelected]);

    const toggleAll = (kind: 'register' | 'airdrop', checked: boolean) => {
        if (kind === 'register') {
            const next: Record<number, boolean> = {};
            if (checked) registerItems.forEach((i) => (next[i.Id] = true));
            setRegisterSelected(next);
        } else {
            const next: Record<number, boolean> = {};
            if (checked) airdropItems.forEach((i) => (next[i.Id] = true));
            setAirdropSelected(next);
        }
    };

    const doValidateReject = async (orderType: number, ids: number[]) => {
        if (!isValidator) {
            toast.error('You are not a validator');
            return;
        }
        if (!contractUrl) {
            toast.error('Missing contractUrl');
            return;
        }
        if (!window.sat20?.invokeContract_SatsNet) {
            toast.error('sat20 wallet API not available');
            return;
        }
        if (!ids.length) {
            toast.error('No selected items');
            return;
        }

        setLoading(true);
        try {
            const invoke = buildValidateInvoke(orderType, ids, reason, -1);
            const res: any = await invokeDaoContractSatsNet(contractUrl, invoke);
            const txId = res?.txId || res?.txid || res?.data?.txId;
            toast.success(txId ? `Reject submitted: ${txId}` : 'Reject submitted');

            // reset selection after submission
            if (orderType === DAO_ORDERTYPE_REGISTER) setRegisterSelected({});
            if (orderType === DAO_ORDERTYPE_AIRDROP) setAirdropSelected({});

            onValidated?.();
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || 'Reject failed');
        } finally {
            setLoading(false);
        }
    };

    const doValidateAccept = async (orderType: number, ids: number[]) => {
        if (!isValidator) {
            toast.error('You are not a validator');
            return;
        }
        if (!contractUrl) {
            toast.error('Missing contractUrl');
            return;
        }
        if (!window.sat20?.invokeContract_SatsNet) {
            toast.error('sat20 wallet API not available');
            return;
        }
        if (!ids.length) {
            toast.error('No selected items');
            return;
        }

        setLoading(true);
        try {
            const invoke = buildValidateInvoke(orderType, ids, 'accept', 0); // result=0 表示接受
            const res: any = await invokeDaoContractSatsNet(contractUrl, invoke);
            const txId = res?.txId || res?.txid || res?.data?.txId;
            toast.success(txId ? `Accept submitted: ${txId}` : 'Accept submitted');

            // reset selection after submission
            if (orderType === DAO_ORDERTYPE_REGISTER) setRegisterSelected({});
            if (orderType === DAO_ORDERTYPE_AIRDROP) setAirdropSelected({});

            onValidated?.();
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || 'Accept failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-6">
            <div>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-zinc-200">Pending Review</div>
                        <div className="text-xs text-zinc-500">Select items to accept or reject, then submit validate (batch).</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full md:w-auto">
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">Reason</div>
                            <select
                                value={reasonPreset}
                                onChange={(e) => setReasonPreset(e.target.value)}
                                className="h-10 w-full md:w-[220px] rounded-md border border-zinc-700 bg-zinc-800 px-2 text-sm text-zinc-200"
                            >
                                {REASONS.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">Custom</div>
                            <input
                                value={reasonText}
                                onFocus={() => {
                                    if (!reasonTouched) {
                                        setReasonText('');
                                        setReasonTouched(true);
                                    }
                                }}
                                onChange={(e) => {
                                    setReasonTouched(true);
                                    setReasonText(e.target.value);
                                }}
                                disabled={reasonPreset !== 'reject: other'}
                                className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 disabled:opacity-50"
                                placeholder="e.g. invalid UID format"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <Button
                                variant="outline"
                                disabled={loading}
                                onClick={() => {
                                    toggleAll('register', false);
                                    toggleAll('airdrop', false);
                                }}
                            >
                                Clear
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-zinc-200">Pending Registers</div>
                        <div className="text-xs text-zinc-500">Selected: {selectedRegisterIds.length}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" disabled={loading || registerItems.length === 0} onClick={() => toggleAll('register', true)}>
                            Select all
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={loading || selectedRegisterIds.length === 0}
                            onClick={() => doValidateAccept(DAO_ORDERTYPE_REGISTER, selectedRegisterIds)}
                        >
                            Accept selected
                        </Button>
                        <Button
                            className="btn-gradient"
                            disabled={loading || selectedRegisterIds.length === 0}
                            onClick={() => doValidateReject(DAO_ORDERTYPE_REGISTER, selectedRegisterIds)}
                        >
                            Reject selected
                        </Button>
                    </div>
                </div>

                {registerItems.length === 0 ? (
                    <div className="mt-2 text-sm text-zinc-500">-</div>
                ) : (
                    <div className="mt-3 overflow-x-auto">
                        <Table className="min-w-[1000px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Sel</TableHead>
                                    <TableHead>ID</TableHead>
                                    <TableHead>UID</TableHead>
                                    <TableHead>ReferrerUID</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead>InUtxo</TableHead>
                                    <TableHead>Copy</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registerItems.map((it) => (
                                    <TableRow key={it.Id}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                checked={!!registerSelected[it.Id]}
                                                onChange={(e) => setRegisterSelected((prev) => ({ ...prev, [it.Id]: e.target.checked }))}
                                            />
                                        </TableCell>
                                        <TableCell className="font-mono">{it.Id}</TableCell>
                                        <TableCell className="font-mono">{it.UID}</TableCell>
                                        <TableCell className="font-mono">{it.ReferrerUID || '-'}</TableCell>
                                        <TableCell className="font-mono">{it.Address}</TableCell>
                                        <TableCell className="font-mono">{it.InUtxo}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => copy(String(it.Id))}>ID</Button>
                                                <Button size="sm" variant="outline" onClick={() => copy(it.UID)}>UID</Button>
                                                <Button size="sm" variant="outline" onClick={() => copy(it.Address)}>Addr</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <div>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-zinc-200">Pending Airdrops</div>
                        <div className="text-xs text-zinc-500">Selected: {selectedAirdropIds.length}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" disabled={loading || airdropItems.length === 0} onClick={() => toggleAll('airdrop', true)}>
                            Select all
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={loading || selectedAirdropIds.length === 0}
                            onClick={() => doValidateAccept(DAO_ORDERTYPE_AIRDROP, selectedAirdropIds)}
                        >
                            Accept selected
                        </Button>
                        <Button
                            className="btn-gradient"
                            disabled={loading || selectedAirdropIds.length === 0}
                            onClick={() => doValidateReject(DAO_ORDERTYPE_AIRDROP, selectedAirdropIds)}
                        >
                            Reject selected
                        </Button>
                    </div>
                </div>

                {airdropItems.length === 0 ? (
                    <div className="mt-2 text-sm text-zinc-500">-</div>
                ) : (
                    <div className="mt-3 overflow-x-auto">
                        <Table className="min-w-[1000px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Sel</TableHead>
                                    <TableHead>ID</TableHead>
                                    <TableHead>UID</TableHead>
                                    <TableHead>ReferralUIDs</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead>InUtxo</TableHead>
                                    <TableHead>Copy</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {airdropItems.map((it) => (
                                    <TableRow key={it.Id}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                checked={!!airdropSelected[it.Id]}
                                                onChange={(e) => setAirdropSelected((prev) => ({ ...prev, [it.Id]: e.target.checked }))}
                                            />
                                        </TableCell>
                                        <TableCell className="font-mono">{it.Id}</TableCell>
                                        <TableCell className="font-mono">{it.UID}</TableCell>
                                        <TableCell className="font-mono break-all">{(it.ReferralUIDs || []).join(', ')}</TableCell>
                                        <TableCell className="font-mono">{it.Address}</TableCell>
                                        <TableCell className="font-mono">{it.InUtxo}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => copy(String(it.Id))}>ID</Button>
                                                <Button size="sm" variant="outline" onClick={() => copy(it.UID)}>UID</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
