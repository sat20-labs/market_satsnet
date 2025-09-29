"use client";
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAsset } from '@/api/market';
import { AvatarImage } from '@/components/ui/avatar';

interface AssetLogoProps {
    protocol?: string;
    ticker?: string;
    normalizedTicker?: string; // if provided, used directly
    className?: string;
    enabled?: boolean; // control whether to fetch logo
}

const normalizeTicker = (protocol?: string, ticker?: string, normalizedTicker?: string) => {
    if (normalizedTicker) return normalizedTicker;
    if (!ticker) return '';
    if (ticker.includes(':')) return ticker;
    if (protocol) return `${protocol}:f:${ticker}`;
    return ticker;
};

const normalizeLogoUrl = (url?: string): string | undefined => {
    const base = (process.env.NEXT_PUBLIC_POINTS_API_BASE || '').replace(/\/$/, '');
    if (!url) return undefined;
    try {
        if (url.startsWith('/')) return `${base}${url}`;
        if (!/^https?:\/\//i.test(url)) return `${base}/${url.replace(/^\/+/, '')}`;
        const parsed = new URL(url);
        const baseOrigin = new URL(base).origin;
        // if (parsed.hostname === 'localhost' || parsed.host === 'localhost:3002' || parsed.hostname === '127.0.0.1') {
        return `${baseOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
        // }
        // return url;
    } catch {
        return url;
    }
};

export const AssetLogo: React.FC<AssetLogoProps> = ({ protocol, ticker, normalizedTicker, className, enabled = true }) => {
    const norm = normalizeTicker(protocol, ticker, normalizedTicker);
    const shouldFetch = !!norm && enabled;

    const { data, error } = useQuery({
        queryKey: ['assetLogo', norm],
        queryFn: async () => {
            if (!shouldFetch) return null;
            try {
                const res: any = await getAsset(norm);
                const data = res?.data || res;
                const logo = data?.logo as string | undefined;
                return normalizeLogoUrl(logo) || null;
            } catch (e) {
                // suppress errors for missing assets; just fallback to initial
                return null;
            }
        },
        enabled: shouldFetch,
        retry: 0,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
    });

    if (error) {
        const isNotFound = (typeof error === 'object' && error !== null && 'response' in error && (error as any).response?.status === 404) || error?.message?.includes('404');
        return (
            <div className="flex items-center justify-center w-10 h-10 bg-zinc-800 rounded-full">
                {isNotFound ? 'Asset not found' : `failed to load: ${error.message}`}
            </div>
        );
    }

    if (!data) return null; // no logo -> let AvatarFallback show
    return <AvatarImage src={data} alt="Logo" className={className} />;
};

export default AssetLogo;
