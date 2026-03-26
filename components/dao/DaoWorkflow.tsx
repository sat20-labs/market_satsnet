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
import ReferreeBind from '@/components/dao/ReferreeBind';
import { DaoStatusCard } from '@/components/dao/DaoStatusCard';
import { useTranslation } from 'react-i18next';
import { AddressStatusDisplay } from '@/components/dao/AddressStatusDisplay';
import { AllAddressesList } from '@/components/dao/AllAddressesList';
import { AirdropReferralsSelector } from '@/components/dao/AirdropReferralsSelector';
import { DaoLeaderboard } from '@/components/dao/DaoLeaderboard';
import { AirdropHistory } from '@/components/dao/AirdropHistory';
import { contractService } from '@/domain/services/contract';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';

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
                .map(part => part.replace(/：/g, ':').trim())
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
    const { address } = useReactWalletStore();
    const pendingRegisterCount = useMemo(() => (status.registerList || []).length, [status.registerList]);
    const pendingAirdropCount = useMemo(() => (status.airdropList || []).length, [status.airdropList]);
    const pendingTotal = pendingRegisterCount + pendingAirdropCount;

    const defaultAssetName = useMemo(() => normalizeAssetName(status.assetName as any), [status.assetName]);

    const [processing, setProcessing] = useState<{ register: boolean; donate: boolean; airdrop: boolean; bind: boolean }>({
        register: false,
        donate: false,
        airdrop: false,
        bind: false,
    });

    const [lastSubmitAt, setLastSubmitAt] = useState<{ register: number; donate: number; airdrop: number; bind: number }>({
        register: 0,
        donate: 0,
        airdrop: 0,
        bind: 0,
    });

    const [userUid, setUserUid] = useState<string>('');

    // Leaderboard data
    const [donateLeaderboard, setDonateLeaderboard] = useState<any[]>([]);
    const [airdropLeaderboard, setAirdropLeaderboard] = useState<any[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

    const shouldBlockFastRepeat = (kind: 'register' | 'donate' | 'airdrop' | 'bind', ms: number = 100) => {
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
    const [manualUid, setManualUid] = useState('');
    const [manualAddress, setManualAddress] = useState('');

    const handleReset = () => {
        setSelectedReferrals([]);
        setAirdropUidsText('');
        setManualUid('');
        setManualAddress('');
    };

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
                // setAirdropUidsText('');
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

    // 处理从推荐选择器中选择的UID（保留手动添加的 uid:address 条目）
    const handleSelectReferrals = (uids: string[]) => {
        // 如果 uids 为空数组，则清空所有选择（包括手动添加的条目）
        if (uids.length === 0) {
            setSelectedReferrals([]);
            return;
        }
        // 基于UID去重，优先保留带有地址的条目
        const uidMap = new Map<string, string>();
        // 先遍历现有条目，建立映射（UID -> 条目）
        selectedReferrals.forEach(entry => {
            const uidPart = entry.split(':')[0];
            // 如果已有映射，优先保留带有地址的条目（即包含冒号的）
            if (!uidMap.has(uidPart) || entry.includes(':')) {
                uidMap.set(uidPart, entry);
            }
        });
        // 添加新的UID列表（不包含地址）
        uids.forEach(uid => {
            const uidPart = uid.split(':')[0];
            if (!uidMap.has(uidPart)) {
                uidMap.set(uidPart, uid);
            }
        });
        // 转换回数组
        const combined = Array.from(uidMap.values());
        setSelectedReferrals(combined);
    };

    // 添加选中的推荐到输入框
    const handleAddSelectedToText = () => {
        if (selectedReferrals.length > 0) {
            const newUids = selectedReferrals.join('\n');
            setAirdropUidsText(prev => prev ? `${prev}\n${newUids}` : newUids);
        }
    };

    // 添加手动输入的UID到选中列表（拆分UID和Address输入框）
    const handleAddManualUids = () => {
        if (!manualUid.trim()) return;
        const uid = manualUid.trim();
        const address = manualAddress.trim();
        const entry = address ? `${uid}:${address}` : uid;
        // 基于UID去重，优先保留带有地址的条目
        const uidMap = new Map<string, string>();
        selectedReferrals.forEach(existing => {
            const uidPart = existing.split(':')[0];
            // 如果已有映射，优先保留带有地址的条目（即包含冒号的）
            if (!uidMap.has(uidPart) || existing.includes(':')) {
                uidMap.set(uidPart, existing);
            }
        });
        const newUidPart = entry.split(':')[0];
        // 如果新条目带有地址或当前映射没有地址，则更新
        const existing = uidMap.get(newUidPart);
        if (!existing || (entry.includes(':') && !existing.includes(':'))) {
            uidMap.set(newUidPart, entry);
        }
        const combined = Array.from(uidMap.values());
        setSelectedReferrals(combined);
        // 清空输入框
        setManualUid('');
        setManualAddress('');
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

    // 获取排行榜数据
    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (!contractUrl) return;

            setLoadingLeaderboard(true);
            try {
                const analytics = await contractService.getContractAnalytics(contractUrl);
                if (analytics) {
                    setDonateLeaderboard(analytics.items_donate || []);
                    setAirdropLeaderboard(analytics.items_airdrop || []);
                }
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error);
            } finally {
                setLoadingLeaderboard(false);
            }
        };

        fetchLeaderboard();
    }, [contractUrl, status]);

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
                    <DaoStatusCard status={status} />

                    <Tabs defaultValue="airdrop-history" className="mt-8">
                        <TabsList>
                            <TabsTrigger value="airdrop-history">{t('pages.dao.workflow.overview.airdrop_history')}</TabsTrigger>
                            <TabsTrigger value="all-addresses">{t('pages.dao.workflow.overview.all_addresses')}</TabsTrigger>
                        </TabsList>
                        <TabsContent value="all-addresses">
                            <AllAddressesList contractUrl={contractUrl} />
                        </TabsContent>
                        <TabsContent value="airdrop-history">
                            <AirdropHistory contractUrl={contractUrl} />
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                <TabsContent value="register">
                    <div className="text-xs text-zinc-500 mb-2">{t('pages.dao.workflow.register_tip')}</div>
                    <div className="grid grid-cols-1 gap-4">
                        <AddressStatusDisplay contractUrl={contractUrl} />

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
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
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

                    {/* 绑定被推荐人 */}
                    <div className="mt-8 border-t border-zinc-800 pt-6">
                        <ReferreeBind contractUrl={contractUrl} refresh={refresh} userUid={userUid} />
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

                    {/* 捐赠排行榜 */}
                    <div className="mt-4">
                        {loadingLeaderboard ? (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500">
                                {t('common.loading', { defaultValue: '加载中...' })}
                            </div>
                        ) : (
                            <DaoLeaderboard
                                items={donateLeaderboard}
                                type="donate"
                                contractUrl={contractUrl}
                                userAddress={address}
                            />
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="airdrop">
                    <div className="text-xs text-zinc-500 mb-2">{t('pages.dao.workflow.airdrop_tip')}</div>
                    {/* 三段结构：系统推荐列表、用户手动输入、汇总区域 */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* 系统推荐列表 */}
                        <div className="lg:col-span-1">
                            <div className="text-sm font-semibold text-white mb-2">{t('pages.dao.workflow.airdrop.referrals_list', { defaultValue: defaultAssetName || '系统推荐列表' })}</div>
                            <AirdropReferralsSelector
                                contractUrl={contractUrl}
                                selectedUids={selectedReferrals.map(item => item.split(':')[0].trim())}
                                onSelectReferrals={handleSelectReferrals}
                            />
                        </div>

                        {/* 用户手动输入 */}
                        {/* <div className="lg:col-span-1">
                            <div className="text-sm font-semibold text-white mb-2">{t('pages.dao.workflow.airdrop.manual_input', { defaultValue: defaultAssetName || '手动输入' })}</div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                                <div>
                                    <div className="text-xs text-zinc-500 mb-1">UID</div>
                                    <Input
                                        value={manualUid}
                                        onChange={(e) => setManualUid(e.target.value)}
                                        placeholder={t('pages.dao.workflow.airdrop.manual_input_uid', { defaultValue: defaultAssetName || '请手动输入UID' })}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                    />
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500 mb-1">Address</div>
                                    <Input
                                        value={manualAddress}
                                        onChange={(e) => setManualAddress(e.target.value)}
                                        placeholder={t('pages.dao.workflow.airdrop.manual_input_address', { defaultValue: defaultAssetName || '请输入地址（可选）' })}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddManualUids}
                                        disabled={!manualUid.trim()}
                                    >
                                        {t('pages.dao.workflow.airdrop.add_manual')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { setManualUid(''); setManualAddress(''); }}
                                        disabled={!manualUid.trim() && !manualAddress.trim()}
                                    >
                                        {t('pages.dao.workflow.airdrop.clear_input')}
                                    </Button>
                                </div>
                            </div>
                        </div> */}

                        {/* 汇总区域 */}
                        <div className="lg:col-span-1">
                            <div className="text-sm font-semibold text-white mb-2">{t('pages.dao.workflow.airdrop.final_summary', { defaultValue: defaultAssetName || '空投汇总' })}</div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                                <div className="text-xs text-zinc-500 mb-1">
                                    Selected: {selectedReferrals.length}
                                </div>
                                {selectedReferrals.length > 0 ? (
                                    <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-800/50 max-h-48 overflow-y-auto">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {selectedReferrals.map((uid, index) => (
                                                <div
                                                    key={index}
                                                    className="bg-zinc-700/50 border border-zinc-700 rounded px-2 py-1 text-sm font-mono text-white truncate"
                                                    title={uid}
                                                >
                                                    {uid}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border border-zinc-800 rounded-lg p-6 text-center text-zinc-500">
                                        暂无选择
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-2">
                        <Button
                            className="btn-gradient"
                            disabled={processing.airdrop || selectedReferrals.length === 0}
                            onClick={() => doInvoke('airdrop', buildAirdropInvoke(selectedReferrals.map(item => item.replace(/：/g, ':').trim())))}
                        >
                            {processing.airdrop
                                ? t('common.processing', { defaultValue: '处理中...' })
                                : t('pages.dao.workflow.actions.submit_airdrop')}
                        </Button>

                        <Button variant="outline" disabled={processing.airdrop} onClick={handleReset}>
                            {t('pages.dao.workflow.actions.reset', { defaultValue: '重置' })}
                        </Button>

                        <Button variant="outline" disabled={processing.airdrop} onClick={() => refresh()}>
                            {t('pages.dao.detail.refresh')}
                        </Button>


                    </div>
                    <div className='mt-8'><hr /></div>
                    {/* 空投排行榜 */}
                    <div className="mt-8">
                        {loadingLeaderboard ? (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500">
                                {t('common.loading', { defaultValue: '加载中...' })}
                            </div>
                        ) : (
                            <DaoLeaderboard
                                items={airdropLeaderboard}
                                type="airdrop"
                                contractUrl={contractUrl}
                                userAddress={address}
                            />
                        )}
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
