'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCommonStore } from '@/store/common';
import { BtcPrice } from '../BtcPrice';
import { useRouter } from 'next/navigation';

interface Props {
    closeModal: () => void;
}

export default function CreatePoolBasic({ closeModal }: Props) {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { satsnetHeight, btcFeeRate } = useCommonStore();

    // 固定参数
    const FIXED = {
        maxSupply: 1_000_000_000,     // 10亿
        //maxSupply: 10_000_000,     // 10M
        mintAmtPerSat: 100,
        launchRatio: 90,               // 90%
        limit: 900_000_000,            // 9亿
        bindingSat: 10_000,             // ordx专用
    };

    // network 固定主网
    const bol = true;

    // 可变参数（开放）
    const [protocol, setProtocol] = useState<'ordx' | 'runes' | 'brc20'>('ordx');
    const [ticker, setTicker] = useState('');
    const [startBlock, setStartBlock] = useState<number>(0);
    const [endBlock, setEndBlock] = useState<number>(0);
    const [deploying, setDeploying] = useState(false);

    useEffect(() => {
        const s = Number(satsnetHeight || 0) + 50;
        setStartBlock(s);
        setEndBlock(s + 10000);
    }, [satsnetHeight]);

    const isValid = ticker.trim().length > 0;

    const estimatedPoolFunds = useMemo(() => {
        // 资金池以：maxSupply * launchRatio / mintAmtPerSat (sats) -> 转 BTC
        const sats = Math.floor((FIXED.maxSupply * (FIXED.launchRatio / 100)) / FIXED.mintAmtPerSat);
        const btc = sats / 1e8;
        return btc.toFixed(8).replace(/\.?0+$/, '');
    }, []);

    const estimatedPoolFundsUsd = estimatedPoolFunds ? <BtcPrice btc={estimatedPoolFunds} /> : 0;

    const handleDeploy = async () => {
        if (!isValid) {
            toast.error(t('common.input_required', { defaultValue: 'Please complete required fields' }));
            return;
        }
        try {
            setDeploying(true);
            const params: any = {
                contractType: 'launchpool.tc',
                startBlock,
                endBlock,
                assetName: {
                    Protocol: protocol,
                    Type: 'f',
                    Ticker: ticker,
                },
                mintAmtPerSat: FIXED.mintAmtPerSat,
                limit: FIXED.limit,
                maxSupply: FIXED.maxSupply,
                launchRation: FIXED.launchRatio,
            };
            if (protocol === 'ordx') {
                params.bindingSat = FIXED.bindingSat;
            }

            const result = await window.sat20.deployContract_Remote(
                'launchpool.tc',
                JSON.stringify(params),
                String(btcFeeRate.value),
                bol
            );

            if (result?.txId) {
                toast.success(t('common.submit_success', { defaultValue: 'Submitted' }));
                router.replace('/launchpool')
            } else {
                toast.error(t('common.submit_failed', { defaultValue: 'Submit failed' }));
            }
        } catch (e: any) {
            toast.error(e?.message || 'Deploy failed');
        } finally {
            setDeploying(false);
        }
    };

    return (
        <>
            <div className="sticky top-0 text bg-zinc-800/50 border border-zinc-800 z-10 p-6 mb-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-2">🚀 {t('pages.createPool.basic_title')}</h2>
                <p className="text-zinc-400">
                    {t('pages.createPool.basic_description')}
                    <a
                        href={`/files/LaunchPool_User_Guide_${i18n.language === 'en' ? 'en' : 'cn'}.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-500 hover:underline ml-1"
                    >
                        {t('pages.createPool.guide')}
                    </a>
                </p>
                <button className="absolute top-4 right-6 text-zinc-400 hover:text-white" onClick={closeModal}>
                    ✕
                </button>
            </div>

            <div className="p-6 my-4 max-w-[1360px] mx-auto bg-zinc-800/50 border border-zinc-800 rounded-lg shadow-lg">

                <div className="text-lg font-bold mb-4">
                    {/* {t('pages.createPool.basic.title', { defaultValue: 'Simple Mode' })} */}
                    <span className="text-sm text-zinc-400 mr-2">
                        {t('pages.createPool.step2.currentBlockHeight')}:{' '}
                        <span className="font-bold text-green-500">{satsnetHeight}</span>
                    </span>
                </div>


                {/* 网络固定主网（只读显示） */}
                <div className="flex items-center gap-3 mb-4 text-sm text-zinc-300">
                    <span className="opacity-80">{t('pages.createPool.network.title', { defaultValue: 'Network' })}:</span>
                    <span className="font-semibold text-white">
                        {t('pages.createPool.network.btc', { defaultValue: 'Bitcoin Mainnet' })}
                    </span>
                </div>

                {/* 协议选择 */}
                <div className="flex items-center gap-4 mb-4">
                    <label className="block text-sm font-medium text-gray-300">
                        {t('pages.createPool.protocol.title', { defaultValue: 'Protocol' })}
                    </label>
                    <Select value={protocol} onValueChange={(v) => setProtocol(v as 'ordx' | 'runes' | 'brc20')}>
                        <SelectTrigger className="w-56 py-4 h-12">
                            {protocol === 'ordx'
                                ? t('pages.createPool.protocol.ordx', { defaultValue: 'OrdX' })
                                : protocol === 'runes'
                                ? t('pages.createPool.protocol.runes', { defaultValue: 'Runes' })
                                : t('pages.createPool.protocol.brc20', { defaultValue: 'BRC20' })}
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ordx" className="h-9 py-2">
                                {t('pages.createPool.protocol.ordx', { defaultValue: 'OrdX' })}
                            </SelectItem>
                            <SelectItem value="runes" className="h-9 py-2">
                                {t('pages.createPool.protocol.runes', { defaultValue: 'Runes' })}
                            </SelectItem>
                            <SelectItem value="brc20" className="h-9 py-2">
                                {t('pages.createPool.protocol.brc20', { defaultValue: 'BRC20' })}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* 资产名称 */}
                <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('pages.createPool.ticker', { defaultValue: 'Ticker' })}
                </label>
                <Input
                    placeholder={t('pages.createPool.ticker', { defaultValue: 'Ticker' })}
                    value={ticker}
                    onChange={(e) => {
                        let v = e.target.value;
                        if (protocol === 'runes') {
                            v = v.toUpperCase().replace(/\s+/g, '•');
                        }
                        setTicker(v);
                    }}
                />
                {protocol === 'runes' && (
                    <p className="mt-1 text-xs text-gray-400">
                        {t('pages.createPool.runesTickerNote', { defaultValue: 'Runes ticker uppercased; spaces replaced.' })}
                    </p>
                )}

                {/* 固定参数只读展示 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm text-zinc-300">
                    <div className='h-8'>
                        {t('pages.createPool.maxSupply', { defaultValue: 'Max Supply' })}:
                        <span className="font-semibold text-white"> {FIXED.maxSupply.toLocaleString()}</span>
                    </div>
                    <div className='h-8'>
                        {t('pages.createPool.mintAmtPerSat', { defaultValue: 'Mint Amount Per Sat' })}:
                        <span className="font-semibold text-white"> {FIXED.mintAmtPerSat}</span>
                    </div>
                    <div className='h-8'>
                        {t('pages.createPool.launchRatio', { defaultValue: 'Launch Ratio' })}:
                        <span className="font-semibold text-white"> {FIXED.launchRatio}%</span>
                    </div>
                    <div className='h-8'>
                        {t('pages.createPool.limit', { defaultValue: 'Limit' })}:
                        <span className="font-semibold text-white"> {FIXED.limit.toLocaleString()}</span>
                    </div>
                    {protocol === 'ordx' && (
                        <div className='h-8'>
                            {t('pages.createPool.bindingSat', { defaultValue: 'Binding Sat' })}:
                            <span className="font-semibold text-white"> {FIXED.bindingSat.toLocaleString()}</span>
                        </div>
                    )}
                    <div className='h-8'>
                        {t('pages.createPool.step2.estimatedPoolFunds', { defaultValue: 'Estimated Pool Funds' })}:&nbsp;
                        <span className="text-red-500">{estimatedPoolFunds}</span> <span className="text-zinc-500">BTC</span>
                        <span className="text-zinc-500 ml-2">( ${estimatedPoolFundsUsd} )</span>
                    </div>
                    <div className='h-8'>
                        {t('pages.createPool.startBlock', { defaultValue: 'Start Block' })}:
                        <span className="font-semibold text-white"> {startBlock}</span>
                    </div>
                    <div className='h-8'>
                        {t('pages.createPool.endBlock', { defaultValue: 'End Block' })}:
                        <span className="font-semibold text-white"> {endBlock}</span>
                    </div>

                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={closeModal}>
                        {t('common.cancel', { defaultValue: 'Cancel' })}
                    </Button>
                    <Button className="btn-gradient" onClick={handleDeploy} disabled={!isValid || deploying}>
                        {deploying
                            ? t('common.submitting', { defaultValue: 'Submitting...' })
                            : t('pages.createPool.submitTemplate', { defaultValue: 'Submit Template' })}
                    </Button>
                </div>
            </div>
        </>
    );
}