'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useCommonStore } from '@/store/common';
import { toast } from 'sonner';

type Protocol = 'brc20' | 'ordx' | 'runes';

export default function DaoCreatePage() {
    const router = useRouter();
    const { btcFeeRate } = useCommonStore();

    const [bol, setBol] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        protocol: 'brc20' as Protocol,
        ticker: 'ordi',

        validatorNum: '5',
        registerFee: '30',
        registerTimeout: '2',

        holdingProtocol: 'brc20' as Protocol,
        holdingTicker: 'ordi',
        holdingThreshold: '100',

        airdropRatio: '0.1',
        airdropLimit: '100',
        airdropTimeout: '2',

        referralRatio: '10',
    });

    const assetNameString = useMemo(() => {
        const p = (form.protocol || '').trim();
        const t = (form.ticker || '').trim();
        return p && t ? `${p}:f:${t}` : '';
    }, [form.protocol, form.ticker]);

    const holdingAssetString = useMemo(() => {
        const p = (form.holdingProtocol || '').trim();
        const t = (form.holdingTicker || '').trim();
        return p && t ? `${p}:f:${t}` : '';
    }, [form.holdingProtocol, form.holdingTicker]);

    const isValid = useMemo(() => {
        if (!form.protocol || !form.ticker) return false;
        if (!form.holdingProtocol || !form.holdingTicker) return false;
        const nums = [
            Number(form.validatorNum),
            Number(form.registerFee),
            Number(form.registerTimeout),
            Number(form.holdingThreshold),
            Number(form.airdropRatio),
            Number(form.airdropLimit),
            Number(form.airdropTimeout),
            Number(form.referralRatio),
        ];
        return nums.every(n => Number.isFinite(n));
    }, [form]);

    const onChange = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

    const onSubmit = async () => {
        if (!isValid) {
            toast.error('Invalid parameters');
            return;
        }
        if (!window.sat20?.deployContract_Remote) {
            toast.error('sat20 wallet API not available');
            return;
        }

        setSubmitting(true);
        try {
            const contractType = 'dao.tc';
            const params: any = {
                contractType,
                assetName: {
                    Protocol: form.protocol,
                    Type: 'f',
                    Ticker: form.ticker,
                },
                ValidatorNum: Number(form.validatorNum),
                RegisterFee: Number(form.registerFee),
                RegisterTimeOut: Number(form.registerTimeout),
                HoldingAssetName: {
                    Protocol: form.holdingProtocol,
                    Type: 'f',
                    Ticker: form.holdingTicker,
                },
                HoldingAssetThreshold: String(form.holdingThreshold),
                AirDropRatio: String(form.airdropRatio),
                AirDropLimit: String(form.airdropLimit),
                AirDropTimeOut: Number(form.airdropTimeout),
                ReferralRatio: Number(form.referralRatio),
            };

            const feeRate = (btcFeeRate?.value ?? 0).toString();
            const res: any = await window.sat20.deployContract_Remote(contractType, JSON.stringify(params), feeRate, bol);

            const contractUrl = res?.contractUrl || res?.url || res?.data?.contractUrl;
            const txId = res?.txId || res?.txid || res?.data?.txId;

            if (!contractUrl) {
                console.warn('deployContract_Remote result:', res);
                toast.error(`Contract deployment submitted${txId ? `, tx: ${txId}` : ''}, but contractUrl not returned`);
                return;
            }

            toast.success('DAO contract deployed');
            router.push(`/dao/detail?contractUrl=${encodeURIComponent(contractUrl)}`);
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || 'Deploy failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <div className="mb-4">
                <h1 className="text-xl font-bold text-zinc-200">Create DAO Contract</h1>
                <div className="text-xs text-zinc-500">Deploy via wallet SDK (sat20)</div>
            </div>

            <div className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex flex-col gap-2">
                    <div className="text-sm text-zinc-400">Deploy on</div>
                    <Select value={bol ? 'btc' : 'satsnet'} onValueChange={(v) => setBol(v === 'btc')}>
                        <SelectTrigger className="w-56 py-4 h-12">{bol ? 'BTC' : 'SatsNet'}</SelectTrigger>
                        <SelectContent>
                            <SelectItem value="btc" className="h-9 py-2">BTC</SelectItem>
                            <SelectItem value="satsnet" className="h-9 py-2">SatsNet</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="text-xs text-zinc-500">feeRate: {btcFeeRate?.value ?? '-'} sat/vB</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="text-sm text-zinc-400 mb-1">Asset Protocol</div>
                        <Select value={form.protocol} onValueChange={(v) => onChange('protocol', v)}>
                            <SelectTrigger className="py-4 h-12">{form.protocol}</SelectTrigger>
                            <SelectContent>
                                <SelectItem value="brc20" className="h-9 py-2">brc20</SelectItem>
                                <SelectItem value="ordx" className="h-9 py-2">ordx</SelectItem>
                                <SelectItem value="runes" className="h-9 py-2">runes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <div className="text-sm text-zinc-400 mb-1">Asset Ticker</div>
                        <Input value={form.ticker} onChange={(e) => onChange('ticker', e.target.value)} />
                    </div>
                </div>

                <div className="text-xs text-zinc-500">assetName: {assetNameString || '-'}</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <div className="text-sm text-zinc-400 mb-1">ValidatorNum</div>
                        <Input value={form.validatorNum} onChange={(e) => onChange('validatorNum', e.target.value)} />
                    </div>
                    <div>
                        <div className="text-sm text-zinc-400 mb-1">RegisterFee (sats)</div>
                        <Input value={form.registerFee} onChange={(e) => onChange('registerFee', e.target.value)} />
                    </div>
                    <div>
                        <div className="text-sm text-zinc-400 mb-1">RegisterTimeOut (blocks)</div>
                        <Input value={form.registerTimeout} onChange={(e) => onChange('registerTimeout', e.target.value)} />
                    </div>
                </div>

                <div className="border-t border-zinc-800 pt-4">
                    <div className="text-sm text-zinc-300 font-semibold mb-3">Airdrop condition</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-zinc-400 mb-1">Holding Protocol</div>
                            <Select value={form.holdingProtocol} onValueChange={(v) => onChange('holdingProtocol', v)}>
                                <SelectTrigger className="py-4 h-12">{form.holdingProtocol}</SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="brc20" className="h-9 py-2">brc20</SelectItem>
                                    <SelectItem value="ordx" className="h-9 py-2">ordx</SelectItem>
                                    <SelectItem value="runes" className="h-9 py-2">runes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <div className="text-sm text-zinc-400 mb-1">Holding Ticker</div>
                            <Input value={form.holdingTicker} onChange={(e) => onChange('holdingTicker', e.target.value)} />
                        </div>
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">holdingAsset: {holdingAssetString || '-'}</div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                            <div className="text-sm text-zinc-400 mb-1">Holding Threshold</div>
                            <Input value={form.holdingThreshold} onChange={(e) => onChange('holdingThreshold', e.target.value)} />
                        </div>
                        <div>
                            <div className="text-sm text-zinc-400 mb-1">AirDropRatio</div>
                            <Input value={form.airdropRatio} onChange={(e) => onChange('airdropRatio', e.target.value)} />
                        </div>
                        <div>
                            <div className="text-sm text-zinc-400 mb-1">AirDropLimit</div>
                            <Input value={form.airdropLimit} onChange={(e) => onChange('airdropLimit', e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <div className="text-sm text-zinc-400 mb-1">AirDropTimeOut (blocks)</div>
                            <Input value={form.airdropTimeout} onChange={(e) => onChange('airdropTimeout', e.target.value)} />
                        </div>
                        <div>
                            <div className="text-sm text-zinc-400 mb-1">ReferralRatio (%)</div>
                            <Input value={form.referralRatio} onChange={(e) => onChange('referralRatio', e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" disabled={submitting} onClick={() => router.back()}>Cancel</Button>
                    <Button className="btn-gradient" disabled={!isValid || submitting} onClick={onSubmit}>
                        {submitting ? 'Deploying...' : 'Deploy'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
