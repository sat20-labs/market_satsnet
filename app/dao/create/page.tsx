'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from '@/components/ui/select';
import { useCommonStore } from '@/store/common';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getDefaultDaoTimeout } from '@/lib/utils/dao';

type Protocol = 'brc20' | 'ordx' | 'runes';

export default function DaoCreatePage() {
    // Use the default namespace; keys are stored under pages.json but are registered as default in this app.
    const { t } = useTranslation();
    const tp = (key: string, options?: any) =>
        String(t(`pages.dao.create.${key}`, options));
    const router = useRouter();
    const { btcFeeRate } = useCommonStore();

    const [bol, setBol] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // 根据环境自动设置超时默认值
    const [form, setForm] = useState({
        protocol: 'brc20' as Protocol,
        ticker: 'ordi',

        validatorNum: '5',
        registerFee: '30',
        registerTimeout: String(getDefaultDaoTimeout('register')),

        holdingProtocol: 'brc20' as Protocol,
        holdingTicker: 'ordi',
        holdingThreshold: '100',

        airdropRatio: '0.01',
        airdropLimit: '100',
        airdropTimeout: String(getDefaultDaoTimeout('airdrop')),

        referralRatio: '0',
    });

    // 初始化时根据环境设置超时值
    useEffect(() => {
        setForm((prev) => ({
            ...prev,
            registerTimeout: String(getDefaultDaoTimeout('register')),
            airdropTimeout: String(getDefaultDaoTimeout('airdrop')),
        }));
    }, []);

    const assetNameString = useMemo(() => {
        const p = (form.protocol || '').trim();
        const tkr = (form.ticker || '').trim();
        return p && tkr ? `${p}:f:${tkr}` : '';
    }, [form.protocol, form.ticker]);

    const holdingAssetString = useMemo(() => {
        const p = (form.holdingProtocol || '').trim();
        const tkr = (form.holdingTicker || '').trim();
        return p && tkr ? `${p}:f:${tkr}` : '';
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
        return nums.every((n) => Number.isFinite(n));
    }, [form]);

    const onChange = (k: keyof typeof form, v: string) =>
        setForm((prev) => ({ ...prev, [k]: v }));

    const onSubmit = async () => {
        if (!isValid) {
            toast.error(tp('toast_invalid_parameters'));
            return;
        }
        if (!window.sat20?.deployContract_Remote) {
            toast.error(tp('toast_wallet_api_not_available'));
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
            const res: any = await window.sat20.deployContract_Remote(
                contractType,
                JSON.stringify(params),
                feeRate,
                bol,
            );

            const contractUrl =
                res?.contractUrl || res?.url || res?.data?.contractUrl;
            const txId = res?.txId || res?.txid || res?.data?.txId;

            if (!contractUrl) {
                console.warn('deployContract_Remote result:', res);
                toast.error(
                    tp('toast_submitted_no_contract_url', {
                        tx: txId ? String(txId) : '',
                    }),
                );
                return;
            }

            toast.success(tp('toast_deployed'));
            router.push(`/dao/detail?contractUrl=${encodeURIComponent(contractUrl)}`);
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || tp('toast_deploy_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <div className="mb-4">
                <h1 className="text-xl font-bold text-zinc-200">{tp('title')}</h1>
                <div className="text-xs text-zinc-500">{tp('subtitle')}</div>
            </div>

            <div className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex flex-col gap-2">
                    <div className="text-sm text-zinc-400">{tp('deploy_on')}</div>
                    <Select
                        value={bol ? 'btc' : 'satsnet'}
                        onValueChange={(v) => setBol(v === 'btc')}
                    >
                        <SelectTrigger className="w-56 py-4 h-12">
                            {bol ? tp('network_btc') : tp('network_satsnet')}
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="btc" className="h-9 py-2">
                                {tp('network_btc')}
                            </SelectItem>
                            <SelectItem value="satsnet" className="h-9 py-2">
                                {tp('network_satsnet')}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="text-xs text-zinc-500">
                        {/* {tp('fee_rate', { value: btcFeeRate?.value ?? '-' })} */}
                        <br />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="text-sm text-zinc-400 mb-1">
                            {tp('asset_protocol')}
                        </div>
                        <Select
                            value={form.protocol}
                            onValueChange={(v) => onChange('protocol', v)}
                        >
                            <SelectTrigger className="py-4 h-12">
                                {form.protocol}
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="brc20" className="h-9 py-2">
                                    brc20
                                </SelectItem>
                                <SelectItem value="ordx" className="h-9 py-2">
                                    ordx
                                </SelectItem>
                                <SelectItem value="runes" className="h-9 py-2">
                                    runes
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <div className="text-sm text-zinc-400 mb-1">
                            {tp('asset_ticker')}
                        </div>
                        <Input
                            value={form.ticker}
                            onChange={(e) => onChange('ticker', e.target.value)}
                        />
                    </div>
                </div>

                <div className="text-xs text-zinc-500">
                    {/* {tp('asset_name', { value: assetNameString || '-' })} */}
                    <br />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <div className="text-sm text-zinc-400 mb-1">
                            {tp('validator_num')}
                        </div>
                        <Input
                            value={form.validatorNum}
                            onChange={(e) => onChange('validatorNum', e.target.value)}
                        />
                    </div>
                    <div>
                        <div className="text-sm text-zinc-400 mb-1">
                            {tp('register_fee')}
                        </div>
                        <Input
                            value={form.registerFee}
                            onChange={(e) => onChange('registerFee', e.target.value)}
                        />
                    </div>
                    <div>
                        <div className="text-sm text-zinc-400 mb-1">
                            {tp('register_timeout')}
                        </div>
                        <Input
                            value={form.registerTimeout}
                            onChange={(e) => onChange('registerTimeout', e.target.value)}
                        />
                    </div>
                </div>

                <div className="border-t border-zinc-800 pt-8">
                    <div className="text-sm text-zinc-300 font-semibold mb-3">
                        {tp('airdrop_condition')}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-zinc-400 mb-1">
                                {tp('holding_protocol')}
                            </div>
                            <Select
                                value={form.holdingProtocol}
                                onValueChange={(v) => onChange('holdingProtocol', v)}
                            >
                                <SelectTrigger className="py-4 h-12">
                                    {form.holdingProtocol}
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="brc20" className="h-9 py-2">
                                        brc20
                                    </SelectItem>
                                    <SelectItem value="ordx" className="h-9 py-2">
                                        ordx
                                    </SelectItem>
                                    <SelectItem value="runes" className="h-9 py-2">
                                        runes
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <div className="text-sm text-zinc-400 mb-1">
                                {tp('holding_ticker')}
                            </div>
                            <Input
                                value={form.holdingTicker}
                                onChange={(e) => onChange('holdingTicker', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">
                        {/* {tp('holding_asset', { value: holdingAssetString || '-' })} */}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                            <div className="text-sm text-zinc-400 mb-1">
                                {tp('holding_threshold')}
                            </div>
                            <Input
                                value={form.holdingThreshold}
                                onChange={(e) => onChange('holdingThreshold', e.target.value)}
                            />
                        </div>
                        {/* airdrop_ratio 参数已隐藏，默认值为0 */}
                        <div className="text-sm text-zinc-400 mb-1">
                            <div className="text-sm text-zinc-400 mb-1">
                                {tp('airdrop_ratio')}
                            </div>
                            <Input
                                value={form.airdropRatio}
                                onChange={(e) => onChange('airdropRatio', e.target.value)}
                            />
                        </div>
                        <div>
                            <div className="text-sm text-zinc-400 mb-1">
                                {tp('airdrop_limit')}
                            </div>
                            <Input
                                value={form.airdropLimit}
                                onChange={(e) => onChange('airdropLimit', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <div className="text-sm text-zinc-400 mb-1">
                                {tp('airdrop_timeout')}
                            </div>
                            <Input
                                value={form.airdropTimeout}
                                onChange={(e) => onChange('airdropTimeout', e.target.value)}
                            />
                        </div>
                        <div hidden>
                            <div className="text-sm text-zinc-400 mb-1">
                                {tp('referral_ratio')}
                            </div>
                            <Input
                                value={form.referralRatio}
                                onChange={(e) => onChange('referralRatio', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        variant="outline"
                        disabled={submitting}
                        onClick={() => router.back()}
                    >
                        {tp('cancel')}
                    </Button>
                    <Button
                        className="btn-gradient"
                        disabled={!isValid || submitting}
                        onClick={onSubmit}
                    >
                        {submitting ? tp('deploying') : tp('deploy')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
