import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { getAsset } from '@/api/market';
import AssetLogo from '@/components/AssetLogo';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface AssetInfoCardLimitOrderProps {
    asset: string;
    ticker: string;
    contractUrl: string;
    refresh: () => void;
    isRefreshing: boolean;
}

export function AssetInfoCardLimitOrder({
    asset,
    ticker,
    contractUrl,
    refresh,
    isRefreshing
}: AssetInfoCardLimitOrderProps) {
    const { t } = useTranslation();
    // 格式化 symbol 显示为 satdog(ordx)

    const { data: assetMetaResp, error: assetMetaError } = useQuery({
        queryKey: ['assetMeta', asset],
        queryFn: () => getAsset(asset ?? ''),
        enabled: !!asset,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
    const assetMeta: any = assetMetaResp?.data || assetMetaResp || {};
    const website = assetMeta?.website as string | undefined;
    const twitter = assetMeta?.twitter as string | undefined;
    const telegram = assetMeta?.telegram as string | undefined;
    const discord = assetMeta?.discord as string | undefined;
    const description = assetMeta?.description as string | undefined;
    const shortDesc = useMemo(() => {
        if (!description) return '';
        const s = description.trim();
        return s.length > 120 ? s.slice(0, 120) + '...' : s;
    }, [description]);

    // 处理资产未找到（404）情况，类型守卫防止 ts 报错
    if (
        assetMetaError &&
        (
            (typeof assetMetaError === 'object' && assetMetaError !== null && 'response' in assetMetaError && (assetMetaError as any).response?.status === 404) ||
            assetMetaError?.message?.includes('404')
        )
    ) {
        return (
            <div className="flex items-center gap-3 mb-2 pb-2">
                <div className="bg-zinc-900 rounded-xl p-4 flex flex-col text-sm w-full border border-zinc-700 shadow-lg relative">
                    <div className="text-red-400 text-center py-4">Asset not found.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 mb-2 pb-2">
            <div className="bg-zinc-900 rounded-xl p-4 flex flex-col text-sm w-full border border-zinc-700 shadow-lg relative">
                <div className="flex items-center mb-2 gap-4">
                    <div className="w-11 h-11 rounded-full bg-zinc-700 flex items-center justify-start text-zinc-300 text-xl font-bold">
                        <div className='text-base'>
                            <Avatar className="w-12 h-12 text-xl text-gray-300 font-medium bg-zinc-700">
                                <AssetLogo normalizedTicker={asset} className="w-12 h-12" />
                                <AvatarFallback>
                                    {ticker?.charAt(0)?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                    <div className=''>
                        <div className="flex justify-start items-center text-zinc-400 font-semibold text-base sm:text-lg">
                            <div>{ticker}</div>
                            {(twitter || telegram || discord) && (
                                <div className="ml-4 flex items-center gap-2">
                                    {website && (
                                        <Link
                                            href={website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Website"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-700 text-zinc-400 hover:bg-purple-500 hover:text-zinc-900 transition-colors"
                                        >
                                            <Icon icon="fa7-brands:weebly" className="w-4 h-4" />
                                        </Link>
                                    )}
                                    {twitter && (
                                        <Link
                                            href={twitter}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Twitter"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-700 text-zinc-400 hover:bg-purple-500 hover:text-zinc-900 transition-colors"
                                        >
                                            <Icon icon="fa7-brands:x-twitter" className="w-4 h-4" />
                                        </Link>
                                    )}
                                    {telegram && (
                                        <Link
                                            href={telegram}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Telegram"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-700 text-zinc-400 hover:bg-purple-500 hover:text-zinc-900 transition-colors"
                                        >
                                            <Icon icon="mdi:telegram" className="w-5 h-5" />
                                        </Link>
                                    )}
                                    {discord && (
                                        <Link
                                            href={discord}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Discord"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-700 text-indigo-400 hover:bg-indigo-400 hover:text-zinc-900 transition-colors"
                                        >
                                            <Icon icon="fa7-brands:discord" className="w-4 h-4" />
                                        </Link>
                                    )}

                                </div>

                            )}
                            <Button variant="outline" size="sm" className="ml-2">
                                <Link href={`/ticker/detail/?asset=${asset}`} prefetch className="text-zinc-400  text-xs sm:text-sm">
                                    Detail
                                </Link>
                            </Button>
                        </div>

                        <p className="text-zinc-500 mt-2 text-xs gap-2">
                            {t('common.contractAddress')}：<span className="text-blue-400 mr-2">{contractUrl?.slice(0, 8)}...{contractUrl?.slice(-4)}</span>
                        </p>
                    </div>
                </div>
                {shortDesc && (
                    <div className="ml-2 mb-2 text-sm text-zinc-500" title={description}>
                        {shortDesc}
                    </div>
                )}
            </div>
        </div>
    );
}
