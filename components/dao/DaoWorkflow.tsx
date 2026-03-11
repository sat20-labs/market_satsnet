'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type { DaoContractStatus } from '@/domain/services/contract';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DaoPendingLists } from '@/components/dao/DaoPendingLists';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    buildAirdropInvoke,
    buildDonateInvoke,
    buildRegisterInvoke,
    invokeDaoContractDonateSatsNet,
    invokeDaoContractSatsNet,
} from '@/domain/services/dao';
import { DaoStatusCard } from '@/components/dao/DaoStatusCard';
import { useTranslation } from 'react-i18next';
import { AddressStatusDisplay } from '@/components/dao/AddressStatusDisplay';
import { AllAddressesList } from '@/components/dao/AllAddressesList';
import { AirdropReferralsSelector } from '@/components/dao/AirdropReferralsSelector';

function normalizeAssetName(a?: { Protocol?: string; Type?: string; Ticker?: string }) {
    if (!a?.Protocol || !a?.Type || !a?.Ticker) return '';
    return `${a.Protocol}:${a.Type}:${a.Ticker}`;
}

function parseUidList(text: string) {
    return Array.from(
        new Set(
            (text || '')
                .split(/[\s,\n\r]+/)
                .map(s => s.trim())
                .filter(Boolean)
        )
    );
}

export function DaoWorkflow({
    contractUrl,
    status,
    refresh,
    defaultTab,
}: {
    contractUrl: string;
    status: DaoContractStatus;
    refresh: () => void;
    defaultTab?: 'overview' | 'register' | 'donate' | 'airdrop' | 'review';
}) {
    const { t } = useTranslation();
    const pendingRegisterCount = useMemo(() => (status.registerList || []).length, [status.registerList]);
    const pendingAirdropCount = useMemo(() => (status.airdropList || []).length, [status.airdropList]);
    const pendingTotal = pendingRegisterCount + pendingAirdropCount;

    const defaultAssetName = useMemo(() => normalizeAssetName(status.assetName as any), [status.assetName]);

    const [processing, setProcessing] = useState<{ register: boolean; donate: boolean; airdrop: boolean }>({
        register: false,
        donate: false,
        airdrop: false,
    });

    const [lastSubmitAt, setLastSubmitAt] = useState<{ register: number; donate: number; airdrop: number }>({
        register: 0,
        donate: 0,
        airdrop: 0,
    });

    const shouldBlockFastRepeat = (kind: 'register' | 'donate' | 'airdrop', ms: number = 500) => {
        const now = Date.now();
        if (now - lastSubmitAt[kind] < ms) return true;
        setLastSubmitAt((p) => ({ ...p, [kind]: now }));
        return false;
    };

    // Register
    const [uid, setUid] = useState('');
    const [referrerUid, setReferrerUid] = useState('');

    // Donate (assetName fixed by contract)
    const [donateAsset, setDonateAsset] = useState(defaultAssetName);
    const [donateAmt, setDonateAmt] = useState('');
    const [donateSats, setDonateSats] = useState('0');

    const [donateSatsTouched, setDonateSatsTouched] = useState(false);

    useEffect(() => {
        setDonateAsset(defaultAssetName);
    }, [defaultAssetName]);

    // Airdrop
    const [airdropUidsText, setAirdropUidsText] = useState('');
    const [selectedReferrals, setSelectedReferrals] = useState<string[]>([]);

    const doInvoke = async (kind: 'register' | 'donate' | 'airdrop', invoke: any) => {
        if (processing[kind]) return;
        if (shouldBlockFastRepeat(kind)) return;

        setProcessing((p) => ({ ...p, [kind]: true }));
        try {
            await invokeDaoContractSatsNet(contractUrl, invoke);
            toast.success(t('common.submitted_waiting', { defaultValue: '已提交，等待审核/确认' }));

            // clear inputs only on success
            if (kind === 'register') {
                setUid('');
                setReferrerUid('');
            }
            if (kind === 'airdrop') {
                setAirdropUidsText('');
                setSelectedReferrals([]);
            }

            refresh();
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || 'Invoke failed');
        } finally {
            setProcessing((p) => ({ ...p, [kind]: false }));
        }
    };

    const doDonateInvoke = async () => {
        if (processing.donate) return;
        if (shouldBlockFastRepeat('donate')) return;

        const assetName = defaultAssetName;
        const amt = donateAmt.trim();
        const satsVal = Number(donateSats || 0);
        const invoke = buildDonateInvoke(assetName, amt, satsVal);

        setProcessing((p) => ({ ...p, donate: true }));
        try {
            await invokeDaoContractDonateSatsNet(contractUrl, invoke, assetName, amt);
            toast.success(t('common.submitted_waiting', { defaultValue: '已提交，等待审核/确认' }));

            // clear inputs only on success
            setDonateAmt('');
            setDonateSats('0');
            setDonateSatsTouched(false);

            refresh();
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || 'Invoke failed');
        } finally {
            setProcessing((p) => ({ ...p, donate: false }));
        }
    };

    // 处理从推荐选择器中选择的UID
    const handleSelectReferrals = (uids: string[]) => {
        setSelectedReferrals(uids);
    };

    // 添加选中的推荐到输入框
    const handleAddSelectedToText = () => {
        if (selectedReferrals.length > 0) {
            const newUids = selectedReferrals.join('\n');
            setAirdropUidsText(prev => prev ? `${prev}\n${newUids}` : newUids);
        }
    };

    // 监听自定义事件
    useEffect(() => {
        const handleSelectedUids = (event: CustomEvent) => {
            const { uidsText } = event.detail;
            if (uidsText) {
                setAirdropUidsText(prev => prev ? `${prev}\n${uidsText}` : uidsText);
            }
        };

        window.addEventListener('airdrop:selected-uids', handleSelectedUids as EventListener);
        return () => {
            window.removeEventListener('airdrop:selected-uids', handleSelectedUids as EventListener);
        };
    }, []);

    return (
        <div className="bg-zinc-950/20 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm text-zinc-400 mb-2">{t('pages.dao.workflow.title')}</div>

            <Tabs defaultValue={defaultTab || 'register'}>
                <TabsList>
                    <TabsTrigger value="overview">{t('pages.dao.workflow.tabs.overview')}</TabsTrigger>
                    <TabsTrigger value="donate">{t('pages.dao.workflow.tabs.donate')}</TabsTrigger>
                    <TabsTrigger value="register">{t('pages.dao.workflow.tabs.register')}</TabsTrigger>
                    <TabsTrigger value="airdrop">{t('pages.dao.workflow.tabs.airdrop')}</TabsTrigger>
                    <TabsTrigger value="review">{t('pages.dao.workflow.tabs.review')}{pendingTotal ? ` (${pendingTotal})` : ''}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <div className="text-xs text-zinc-500 mb-2">{t('pages.dao.workflow.overview_tip')}</div>
                    <div className="space-y-4">
                        <DaoStatusCard status={status} />
                        <AllAddressesList contractUrl={contractUrl} />
                    </div>
                </TabsContent>

                <TabsContent value="register">
                    <div className="text-xs text-zinc-500 mb-2">{t('pages.dao.workflow.register_tip')}</div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <div className="text-xs text-zinc-500 mb-1">{t('pages.dao.workflow.fields.uid')}</div>
                                    <Input
                                        value={uid}
                                        onChange={(e) => setUid(e.target.value)}
                                        placeholder={t('pages.dao.workflow.placeholders.uid', { defaultValue: '请输入 UID' })}
                                        disabled={processing.register}
                                    />
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500 mb-1">{t('pages.dao.workflow.fields.referrer_uid')}</div>
                                    <Input
                                        value={referrerUid}
                                        onChange={(e) => setReferrerUid(e.target.value)}
                                        placeholder={t('pages.dao.workflow.placeholders.referrer_uid', { defaultValue: '可选：推荐人 UID' })}
                                        disabled={processing.register}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    className="btn-gradient"
                                    disabled={processing.register || !uid.trim()}
                                    onClick={() => doInvoke('register', buildRegisterInvoke(uid, referrerUid || undefined))}
                                >
                                    {processing.register
                                        ? t('common.processing', { defaultValue: '处理中...' })
                                        : t('pages.dao.workflow.actions.submit_register')}
                                </Button>
                                <Button variant="outline" disabled={processing.register} onClick={() => refresh()}>
                                    {t('pages.dao.detail.refresh')}
                                </Button>
                            </div>
                        </div>

                        <AddressStatusDisplay contractUrl={contractUrl} />
                    </div>
                </TabsContent>

                <TabsContent value="donate">
                    <div className="text-xs text-zinc-500 mb-2">{t('pages.dao.workflow.donate_tip')}</div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <div className="text-xs text-zinc-500 mb-1">{t('pages.dao.workflow.fields.asset_name')}</div>
                                <Input
                                    value={donateAsset}
                                    readOnly
                                    placeholder={t('pages.dao.workflow.placeholders.asset_name', { defaultValue: defaultAssetName || '—' })}
                                    disabled
                                />
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 mb-1">{t('pages.dao.workflow.fields.amt')}</div>
                                <Input
                                    value={donateAmt}
                                    onChange={(e) => setDonateAmt(e.target.value)}
                                    placeholder={t('pages.dao.workflow.placeholders.amt', { defaultValue: '请输入数量，例如 4000' })}
                                    disabled={processing.donate}
                                />
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 mb-1">{t('pages.dao.workflow.fields.sats_value')}</div>
                                <Input
                                    value={donateSats}
                                    onFocus={() => {
                                        if (!donateSatsTouched) {
                                            setDonateSats('');
                                            setDonateSatsTouched(true);
                                        }
                                    }}
                                    onChange={(e) => {
                                        setDonateSatsTouched(true);
                                        setDonateSats(e.target.value);
                                    }}
                                    placeholder={t('pages.dao.workflow.placeholders.sats_value', { defaultValue: '可选：转账聪值，例如 0' })}
                                    disabled={processing.donate}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                className="btn-gradient"
                                disabled={processing.donate || !donateAmt.trim()}
                                onClick={doDonateInvoke}
                            >
                                {processing.donate
                                    ? t('common.processing', { defaultValue: '处理中...' })
                                    : t('pages.dao.workflow.actions.submit_donate')}
                            </Button>
                            <Button variant="outline" disabled={processing.donate} onClick={() => refresh()}>
                                {t('pages.dao.detail.refresh')}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="airdrop">
                    <div className="text-xs text-zinc-500 mb-2">{t('pages.dao.workflow.airdrop_tip')}</div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                                <div>
                                    <div className="text-xs text-zinc-500 mb-1">{t('pages.dao.workflow.fields.uids')}</div>
                                    <textarea
                                        value={airdropUidsText}
                                        onChange={(e) => setAirdropUidsText(e.target.value)}
                                        className="min-h-[96px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
                                        placeholder="id3\nid4\nid5"
                                        disabled={processing.airdrop}
                                    />
                                    <div className="text-xs text-zinc-500 mt-1">{t('pages.dao.workflow.fields.count')}: {parseUidList(airdropUidsText).length}</div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        className="btn-gradient"
                                        disabled={processing.airdrop || parseUidList(airdropUidsText).length === 0}
                                        onClick={() => doInvoke('airdrop', buildAirdropInvoke(parseUidList(airdropUidsText)))}
                                    >
                                        {processing.airdrop
                                            ? t('common.processing', { defaultValue: '处理中...' })
                                            : t('pages.dao.workflow.actions.submit_airdrop')}
                                    </Button>
                                    <Button variant="outline" disabled={processing.airdrop} onClick={() => refresh()}>
                                        {t('pages.dao.detail.refresh')}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <AirdropReferralsSelector
                            contractUrl={contractUrl}
                            onSelectReferrals={handleSelectReferrals}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="review">
                    <div className="text-xs text-zinc-500 mb-2">{t('pages.dao.workflow.review_tip')}</div>
                    <DaoPendingLists status={status} contractUrl={contractUrl} onValidated={refresh} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
