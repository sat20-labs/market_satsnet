'use client';

import React, { useMemo, useState } from 'react';
import type { DaoAirdropItem, DaoContractStatus, DaoRegisterItem } from '@/domain/services/contract';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const [registerSelected, setRegisterSelected] = useState<Record<string, boolean>>({});
    const [airdropSelected, setAirdropSelected] = useState<Record<string, boolean>>({});

    const copy = (text: string) => {
        try {
            navigator.clipboard.writeText(text);
            toast.success(t('pages.dao.pending.copy_success'));
        } catch {
            toast.error(t('pages.dao.pending.copy_failed'));
        }
    };

    const truncateMiddle = (str: string, startLength = 8, endLength = 8) => {
        if (str.length <= startLength + endLength + 3) return str;
        return `${str.slice(0, startLength)}...${str.slice(-endLength)}`;
    };

    const [reasonPreset, setReasonPreset] = useState(REASONS[0]);
    const [reasonText, setReasonText] = useState('');
    const [reasonTouched, setReasonTouched] = useState(false);
    const [loading, setLoading] = useState(false);

    const validators = useMemo(() => {
        const validatorsData = status.Validators;
        // console.log('Debug - status.Validators:', validatorsData);
        // console.log('Debug - type:', typeof validatorsData);

        if (Array.isArray(validatorsData)) {
            // console.log('Debug - Validators is an array');
            return validatorsData;
        } else if (validatorsData && typeof validatorsData === 'object') {
            // console.log('Debug - Validators is an object');
            return Object.keys(validatorsData);
        } else {
            // console.log('Debug - Validators is empty or invalid');
            return [];
        }
    }, [status.Validators]);

    const { address, publicKey, connected } = useReactWalletStore();

    const isValidator = useMemo(() => {
        // console.log('Debug - Wallet connection:');
        // console.log('  connected:', connected);
        // console.log('  address:', address);
        // console.log('  publicKey:', publicKey);

        const result = validators.includes(publicKey || '') || validators.includes(address || '');
        // console.log('Debug - isValidator check:');
        // console.log('  PK:', publicKey);
        // console.log('  Addr:', address);
        // console.log('  Validators count:', validators.length);
        // console.log('  Result:', result);
        // if (!result && validators.length > 0) {
        //     console.log('  First few validators:', validators.slice(0, 3));
        // }
        return result;
    }, [validators, address, publicKey, connected]);

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

    const selectedRegisterUids = useMemo(() => {
        return Object.entries(registerSelected)
            .filter(([, v]) => v)
            .map(([uid]) => uid)
            .filter((uid): uid is string => uid !== undefined && uid !== '');
    }, [registerSelected]);

    const selectedAirdropUids = useMemo(() => {
        return Object.entries(airdropSelected)
            .filter(([, v]) => v)
            .map(([uid]) => uid)
            .filter((uid): uid is string => uid !== undefined && uid !== '');
    }, [airdropSelected]);

    const toggleAll = (kind: 'register' | 'airdrop', checked: boolean) => {
        if (kind === 'register') {
            const next: Record<string, boolean> = {};
            if (checked) registerItems.forEach((i, idx) => (next[i.UID ?? idx] = true));
            setRegisterSelected(next);
        } else {
            const next: Record<string, boolean> = {};
            if (checked) airdropItems.forEach((i, idx) => (next[i.UID ?? idx] = true));
            setAirdropSelected(next);
        }
    };

    const doValidateReject = async (orderType: number, ids: string[]) => {
        if (!isValidator) {
            // 调试信息已注释
            // console.log('Debug - Current user:');
            // console.log('  Public Key:', publicKey);
            // console.log('  Address:', address);
            // console.log('  Connected:', connected);
            // console.log('  Validators list:', validators);
            // console.log('  Is in validators? PK:', validators.includes(publicKey || ''), 'Addr:', validators.includes(address || ''));
            toast.error(t('pages.dao.pending.not_validator'));
            return;
        }
        if (!contractUrl) {
            toast.error(t('pages.dao.pending.missing_contract_url'));
            return;
        }
        if (!window.sat20?.invokeContract_SatsNet) {
            toast.error(t('pages.dao.pending.wallet_api_unavailable'));
            return;
        }
        if (!ids.length) {
            toast.error(t('pages.dao.pending.no_selected_items'));
            return;
        }

        setLoading(true);
        try {
            const invoke = buildValidateInvoke(orderType, ids, reason, -1);
            const res: any = await invokeDaoContractSatsNet(contractUrl, invoke);
            const txId = res?.txId || res?.txid || res?.data?.txId;
            toast.success(txId ? t('pages.dao.pending.reject_submitted_with_tx', { txId }) : t('pages.dao.pending.reject_submitted'));

            // reset selection after submission
            if (orderType === DAO_ORDERTYPE_REGISTER) setRegisterSelected({});
            if (orderType === DAO_ORDERTYPE_AIRDROP) setAirdropSelected({});

            onValidated?.();
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || t('pages.dao.pending.reject_failed'));
        } finally {
            setLoading(false);
        }
    };

    const doValidateAccept = async (orderType: number, ids: string[]) => {
        if (!isValidator) {
            // 调试信息已注释
            // console.log('Debug - Current user:');
            // console.log('  Public Key:', publicKey);
            // console.log('  Address:', address);
            // console.log('  Connected:', connected);
            // console.log('  Validators list:', validators);
            // console.log('  Is in validators? PK:', validators.includes(publicKey || ''), 'Addr:', validators.includes(address || ''));
            toast.error(t('pages.dao.pending.not_validator'));
            return;
        }
        if (!contractUrl) {
            toast.error(t('pages.dao.pending.missing_contract_url'));
            return;
        }
        if (!window.sat20?.invokeContract_SatsNet) {
            toast.error(t('pages.dao.pending.wallet_api_unavailable'));
            return;
        }
        if (!ids.length) {
            toast.error(t('pages.dao.pending.no_selected_items'));
            return;
        }

        setLoading(true);
        try {
            const invoke = buildValidateInvoke(orderType, ids, 'accept', 0); // result=0 表示接受
            const res: any = await invokeDaoContractSatsNet(contractUrl, invoke);
            const txId = res?.txId || res?.txid || res?.data?.txId;
            toast.success(txId ? t('pages.dao.pending.accept_submitted_with_tx', { txId }) : t('pages.dao.pending.accept_submitted'));

            // reset selection after submission
            if (orderType === DAO_ORDERTYPE_REGISTER) setRegisterSelected({});
            if (orderType === DAO_ORDERTYPE_AIRDROP) setAirdropSelected({});

            onValidated?.();
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || t('pages.dao.pending.accept_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-6">
            <div>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-zinc-200">{t('pages.dao.pending.pending_review_title')}</div>
                        <div className="text-xs text-zinc-500">{t('pages.dao.pending.select_items_hint')}</div>

                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full md:w-auto">
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">{t('pages.dao.pending.reason_label')}</div>
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
                            <div className="text-xs text-zinc-500 mb-1">{t('pages.dao.pending.custom_label')}</div>
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
                                placeholder={t('pages.dao.pending.custom_reason_placeholder')}
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
                                {t('pages.dao.pending.clear_button')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <hr className="my-3 border-zinc-700" />
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-zinc-200">{t('pages.dao.pending.pending_registers')}</div>
                        <div className="text-xs text-zinc-500">{t('pages.dao.pending.selected_count', { count: selectedRegisterUids.length })}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" disabled={loading || registerItems.length === 0} onClick={() => toggleAll('register', true)}>
                            {t('pages.dao.pending.select_all')}
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
                                    <TableHead className="w-[80px]">{t('pages.dao.pending.table_headers.sel')}</TableHead>
                                    {/* <TableHead>{t('pages.dao.pending.table_headers.id')}</TableHead> */}
                                    <TableHead className="w-[150px]">{t('pages.dao.pending.table_headers.uid')}</TableHead>
                                    <TableHead>{t('pages.dao.pending.table_headers.address')}</TableHead>
                                    <TableHead>{t('pages.dao.pending.table_headers.referrer_uid')}</TableHead>

                                    <TableHead>{t('pages.dao.pending.table_headers.in_utxo')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registerItems.map((it, index) => {
                                    const key = it.UID ?? index;
                                    return (
                                        <TableRow key={key}>
                                            <TableCell>&nbsp;&nbsp;&nbsp;
                                                <input
                                                    type="checkbox"
                                                    checked={!!registerSelected[key]}
                                                    onChange={(e) => setRegisterSelected((prev) => ({ ...prev, [key]: e.target.checked }))}
                                                />
                                            </TableCell>
                                            {/* <TableCell className="font-mono">{it.Id}</TableCell> */}
                                            <TableCell className="font-mono">
                                                <div className="flex items-center gap-1">
                                                    {it.UID}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-4 p-0"
                                                        onClick={() => copy(it.UID)}
                                                    >
                                                        <Copy className="h-3 w-3 ml-3 text-gray-400" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono">
                                                <div className="flex items-center gap-1">
                                                    {truncateMiddle(it.Address)}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-4 p-0"
                                                        onClick={() => copy(it.Address)}
                                                    >
                                                        <Copy className="h-3 w-3 ml-3 text-gray-400" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono">{it.ReferrerUID || '-'}</TableCell>

                                            <TableCell className="font-mono">
                                                <div className="flex items-center gap-1">
                                                    <a
                                                        href={`https://mempool.space/tx/${it.InUtxo.split(':')[0]}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-400 hover:underline"
                                                        title={it.InUtxo}
                                                    >
                                                        {truncateMiddle(it.InUtxo)}
                                                    </a>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-4 p-0"
                                                        onClick={() => copy(it.InUtxo)}
                                                    >
                                                        <Copy className="h-3 w-3 ml-3 text-gray-400" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
            <div className="flex items-left gap-2">
                <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={loading || selectedRegisterUids.length === 0}
                    onClick={() => doValidateAccept(DAO_ORDERTYPE_REGISTER, selectedRegisterUids)}
                >
                    {t('pages.dao.pending.accept_selected')}
                </Button>
                <Button
                    className="btn-gradient"
                    disabled={loading || selectedRegisterUids.length === 0}
                    onClick={() => doValidateReject(DAO_ORDERTYPE_REGISTER, selectedRegisterUids)}
                >
                    {t('pages.dao.pending.reject_selected')}
                </Button>
            </div>

            <div>
                <hr className="my-3 border-zinc-700" />
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-zinc-200">{t('pages.dao.pending.pending_airdrops')}</div>
                        <div className="text-xs text-zinc-500">{t('pages.dao.pending.selected_count', { count: selectedAirdropUids.length })}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" disabled={loading || airdropItems.length === 0} onClick={() => toggleAll('airdrop', true)}>
                            {t('pages.dao.pending.select_all')}
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
                                    <TableHead className="w-[80px]">{t('pages.dao.pending.table_headers.sel')}</TableHead>
                                    {/* <TableHead>{t('pages.dao.pending.table_headers.id')}</TableHead> */}
                                    <TableHead>{t('pages.dao.pending.table_headers.uid')}</TableHead>
                                    <TableHead>{t('pages.dao.pending.table_headers.address')}</TableHead>
                                    <TableHead>{t('pages.dao.pending.table_headers.referral_uids')}</TableHead>
                                    <TableHead>{t('pages.dao.pending.table_headers.in_utxo')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {airdropItems.map((it) => (
                                    <TableRow key={it.UID}>
                                        <TableCell>&nbsp;&nbsp;&nbsp;
                                            <input
                                                type="checkbox"
                                                checked={!!airdropSelected[it.UID]}
                                                onChange={(e) => setAirdropSelected((prev) => ({ ...prev, [it.UID]: e.target.checked }))}
                                            />
                                        </TableCell>
                                        {/* <TableCell className="font-mono">{it.Id}</TableCell> */}
                                        <TableCell className="font-mono">
                                            <div className="flex items-center gap-1">
                                                {it.UID}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 p-0"
                                                    onClick={() => copy(it.UID)}
                                                >
                                                    <Copy className="h-3 w-3 ml-3 text-gray-400" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            <div className="flex items-center gap-1">
                                                {truncateMiddle(it.Address)}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 p-0"
                                                    onClick={() => copy(it.Address)}
                                                >
                                                    <Copy className="h-3 w-3 ml-3 text-gray-400" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        {/* <TableCell className="font-mono break-all">{(it.ReferralUIDs || []).join(', ')}</TableCell> */}
                                        <TableCell className="font-mono">{it.ReferrerUID || '-'}</TableCell>

                                        <TableCell className="font-mono">
                                            <div className="flex items-center gap-1">
                                                <a
                                                    href={`https://mempool.space/tx/${it.InUtxo.split(':')[0]}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:underline"
                                                    title={it.InUtxo}
                                                >
                                                    {truncateMiddle(it.InUtxo)}
                                                </a>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 p-0"
                                                    onClick={() => copy(it.InUtxo)}
                                                >
                                                    <Copy className="h-3 w-3 ml-3 text-gray-400" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
            <div className="flex items-left gap-2">
                <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={loading || selectedAirdropUids.length === 0}
                    onClick={() => doValidateAccept(DAO_ORDERTYPE_AIRDROP, selectedAirdropUids)}
                >
                    {t('pages.dao.pending.accept_selected')}
                </Button>
                <Button
                    className="btn-gradient"
                    disabled={loading || selectedAirdropUids.length === 0}
                    onClick={() => doValidateReject(DAO_ORDERTYPE_AIRDROP, selectedAirdropUids)}
                >
                    {t('pages.dao.pending.reject_selected')}
                </Button>
            </div>
        </div>
    );
}
