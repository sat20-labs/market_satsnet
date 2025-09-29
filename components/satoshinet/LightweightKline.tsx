// filepath: components/satoshinet/LightweightKline.tsx
'use client';

import { createChart, ColorType, UTCTimestamp } from 'lightweight-charts';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getMarketKline, getMarketPriceChanges } from '@/api/market';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AssetLogo from '@/components/AssetLogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LightweightKlineProps {
    symbol?: string; // contractUrl
    height?: number; // overall chart container height (optional, fallback)
    className?: string;
    initialResolution?: string; // '15'
    theme?: 'dark' | 'light';
    chartHeights?: { volumeRatio?: number; height?: string }; // volumeRatio + optional explicit height override
    priceDecimals?: number;
    changeDecimals?: number;
    lang?: 'zh' | 'en';
}

// Updated: API currently supports only 1m,5m,15m,1h,4h,1d. Remove unsupported composite intervals (2H,12H)
// TEMP: hide 1m & 5m (low volume) -> only show 15m,1H,4H,1D
const RESOLUTIONS = ['15', '60', '240', 'D'];
const RES_SECONDS: Record<string, number> = { '1': 60, '5': 300, '15': 900, '60': 3600, '240': 14400, 'D': 86400 };
const RES_INTERVAL: Record<string, string> = { '1': '1m', '5': '5m', '15': '15m', '60': '1h', '240': '4h', 'D': '1d' };
// No composite resolutions for now
const COMPOSITE: Record<string, { base: string; factor: number }> = {};
const BATCH_SIZE = 300; // bars per historical fetch

// Simple in-memory LRU cache for kline query (key = symbol|res|start|end|limit)
const KLINE_LRU_MAX = 120;
interface KlineCacheEntry { key: string; ts: number; data: any; }
const klineLRU: Map<string, KlineCacheEntry> = new Map();
function klineCacheGet(key: string) {
    const item = klineLRU.get(key);
    if (!item) return null;
    klineLRU.delete(key); klineLRU.set(key, item);
    return item.data;
}
function klineCacheSet(key: string, data: any) {
    if (klineLRU.has(key)) klineLRU.delete(key);
    klineLRU.set(key, { key, ts: Date.now(), data });
    if (klineLRU.size > KLINE_LRU_MAX) {
        const first = klineLRU.keys().next().value;
        if (first) klineLRU.delete(first);
    }
}

// Volume scaling disabled: backend volume_asset_raw / volume_asset assumed already display-ready (snapshot, cumulative).
// If a token has decimals in future, introduce per-asset decimals instead of hard-coded division.
const ASSET_SCALE = 1; // no scaling
// Exponential backoff wrapper
async function retryAsync<T>(fn: () => Promise<T>, retries = 3, baseDelay = 300): Promise<T> {
    let lastErr: any;
    for (let i = 0; i <= retries; i++) {
        try { return await fn(); } catch (e) { lastErr = e; if (i === retries) break; await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i))); }
    }
    throw lastErr;
}

// Utility: sanitize & merge duplicate timestamp bars (strict ascending required by lightweight-charts)
function sanitizeAndMergeBars(raw: Array<any>) {
    if (!raw.length) return raw;
    raw.sort((a, b) => a.time - b.time);
    const merged: any[] = [];
    let last = raw[0];
    for (let i = 1; i < raw.length; i++) {
        const cur = raw[i];
        if (cur.time === last.time) {
            // Snapshot semantics: later record overwrites volume values (do NOT accumulate) to avoid inflation of live candle.
            last.high = Math.max(last.high, cur.high);
            last.low = Math.min(last.low, cur.low);
            last.close = cur.close;
            if (typeof cur.volumeAssetRaw === 'number') last.volumeAssetRaw = cur.volumeAssetRaw;
            if (typeof cur.volumeBtc === 'number') last.volumeBtc = cur.volumeBtc;
            last.volumeAsset = last.volumeAssetRaw; // no scaling
            last.volume = last.volumeAsset;
            if (typeof cur.trades === 'number') last.trades = cur.trades;
            last.isOpen = !!(last.isOpen || cur.isOpen);
            last.synthetic = !!last.synthetic && !!cur.synthetic;
        } else if (cur.time > last.time) {
            merged.push(last);
            last = cur;
        }
    }
    merged.push(last);
    return merged;
}

const gapSynthetic = (time: UTCTimestamp, price: number): any => ({
    time,
    open: price,
    high: price,
    low: price,
    close: price,
    volume: 0,
    volumeAsset: 0,
    volumeAssetRaw: 0,
    volumeBtc: 0,
    trades: 0,
    synthetic: true,
    isOpen: false,
});

// 支持 initialResolution 传入 '4H'/'1H'/'1D' 等友好写法
function normalizeResolution(res: string) {
    if (res === '4H') return '240';
    if (res === '1H') return '60';
    if (res === '1D') return 'D';
    if (res === '15m') return '15';
    if (res === '1m') return '1';
    if (res === '5m') return '5';
    return res;
}

export const LightweightKline: React.FC<LightweightKlineProps> = ({ symbol, height = 505, className = '', initialResolution = '240', theme = 'dark', chartHeights, priceDecimals = 4, changeDecimals = 2, lang: forcedLang }) => {
    const effectiveHeight = chartHeights?.height ?? height;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<any>(null);
    const candleSeriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);
    const ma5SeriesRef = useRef<any>(null);
    const ma10SeriesRef = useRef<any>(null);
    const ma20SeriesRef = useRef<any>(null);
    const firstDataLoadedRef = useRef(false);
    const candleSeriesModeRef = useRef<'candle' | 'area'>('candle');


    const [resolution, setResolution] = useState(() => normalizeResolution(initialResolution));
    const [chartReady, setChartReady] = useState(false);
    // Fallback: if initial (or previously stored) resolution is now hidden (1 or 5), switch to 15
    useEffect(() => {
        if (resolution === '1' || resolution === '5') setResolution('15');
    }, [resolution]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // FIX: remove duplicate conflicting state declarations (were redefining setLoading/setError) and keep a single loadingMore state
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const barsRef = useRef<Array<{ time: UTCTimestamp; open: number; high: number; low: number; close: number; volume: number; volumeAsset: number; volumeAssetRaw: number; volumeBtc: number; trades?: number | null; synthetic?: boolean; isOpen?: boolean }>>([]);
    const cacheRef = useRef<Record<string, { bars: typeof barsRef.current; earliest: number | null; ts: number }>>({});
    const earliestTimeRef = useRef<number | null>(null);
    const lastPriceRef = useRef<number | null>(null);
    const [priceInfo, setPriceInfo] = useState<{ last?: number; pct24h?: number }>({});
    const [hoverInfo, setHoverInfo] = useState<{ time?: number; close?: number; open?: number; high?: number; low?: number; volume?: number; ma5?: number; ma10?: number; ma20?: number }>();
    const [showMA5, setShowMA5] = useState(false); const [showMA10, setShowMA10] = useState(false); const [showMA20, setShowMA20] = useState(false);
    const [fillGaps, setFillGaps] = useState(false);
    // Mobile adaptation & controls
    const [isMobile, setIsMobile] = useState(false);
    const [showVolume, setShowVolume] = useState(true); // collapsible volume (D)
    const [followLatest, setFollowLatest] = useState(true); // auto scroll to latest (C)
    const [showSettings, setShowSettings] = useState(false);
    const lastPriceLineRef = useRef<any>(null);
    const lastViewportRef = useRef<any>(null);
    const [rangeInfo, setRangeInfo] = useState<{ start?: number; end?: number }>({});
    // Native DOM tooltip element to reduce React re-renders
    const tooltipElRef = useRef<HTMLDivElement | null>(null);
    // Language: follow global i18n unless overridden by prop
    const { i18n } = useTranslation();
    const [lang, setLang] = useState<'zh' | 'en'>(forcedLang || (i18n?.language?.startsWith('zh') ? 'zh' : 'en'));
    useEffect(() => {
        if (forcedLang === 'zh' || forcedLang === 'en') {
            if (lang !== forcedLang) setLang(forcedLang);
        } else {
            const auto = i18n?.language?.startsWith('zh') ? 'zh' : 'en';
            if (lang !== auto) setLang(auto);
        }
    }, [forcedLang, i18n?.language, lang]);

    useEffect(() => { const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640); check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check); }, []);
    useEffect(() => { if (isMobile) { setShowVolume(false); setShowMA5(false); setShowMA10(false); setShowMA20(false); } }, [isMobile]);

    const configuredVolumeRatio = Math.min(0.5, Math.max(0.05, chartHeights?.volumeRatio ?? 0.30));

    const { data: priceChangeData } = useQuery({
        queryKey: ['price_changes', symbol],
        enabled: !!symbol,
        refetchInterval: 60_000,
        queryFn: async () => {
            if (!symbol) return null;
            return await getMarketPriceChanges(symbol);
        },
    });
    useEffect(() => { if (priceChangeData) { setPriceInfo({ last: priceChangeData.last_price, pct24h: priceChangeData.pct_24h }); } }, [priceChangeData]);

    const applyMAs = useCallback(() => {
        // FIX: Preserve exact viewport when toggling MA; do NOT auto scroll to real-time here.
        if (candleSeriesModeRef.current === 'area') return;
        const data = barsRef.current;
        if (!data.length) return;
        const ts = chartRef.current?.timeScale();
        const prevLogical = ts?.getVisibleLogicalRange(); // capture before mutating
        function buildMA(period: number) {
            const out: any[] = []; let sum = 0;
            for (let i = 0; i < data.length; i++) { sum += data[i].close; if (i >= period) sum -= data[i - period].close; if (i >= period - 1) out.push({ time: data[i].time, value: Number((sum / period).toFixed(8)) }); }
            return out;
        }
        if (showMA5) { ma5SeriesRef.current?.setData(buildMA(5)); } else { ma5SeriesRef.current?.setData([]); }
        if (showMA10) { ma10SeriesRef.current?.setData(buildMA(10)); } else { ma10SeriesRef.current?.setData([]); }
        if (showMA20) { ma20SeriesRef.current?.setData(buildMA(20)); } else { ma20SeriesRef.current?.setData([]); }
        if (ts && prevLogical) {
            // Restore exactly previous logical range to avoid any shrink / shift.
            requestAnimationFrame(() => { try { ts.setVisibleLogicalRange(prevLogical); } catch { } });
        }
    }, [showMA5, showMA10, showMA20]);

    const setAllData = useCallback(() => {
        if (!candleSeriesRef.current) return;
        barsRef.current = sanitizeAndMergeBars(barsRef.current as any) as any;
        const isArea = candleSeriesModeRef.current === 'area';
        if (isArea) {
            const areaData = barsRef.current.map(b => ({ time: b.time, value: b.close }));
            candleSeriesRef.current.setData(areaData);
        } else {
            // Add per-bar styling: highlight isOpen bars with golden border
            const candles = barsRef.current.map(b => ({
                time: b.time,
                open: b.open,
                high: b.high,
                low: b.low,
                close: b.close,
                ...(b.isOpen ? { borderColor: '#f5d259', wickColor: '#f5d259' } : {})
            }));
            candleSeriesRef.current.setData(candles);
            // Add star markers for open bars
            try {
                const markers = barsRef.current.filter(b => b.isOpen).map(b => ({ time: b.time, position: 'aboveBar', color: '#f5d259', shape: 'star', text: '*' }));
                candleSeriesRef.current.setMarkers(markers);
            } catch { /* ignore */ }
        }
        if (volumeSeriesRef.current) {
            // 十字星颜色跟随上一个candle
            const vols = barsRef.current.map((b, i, arr) => {
                let color = '#1faa7a';
                if (b.close > b.open) color = '#e74c4c';
                else if (b.close < b.open) color = '#1faa7a';
                else if (i > 0) color = arr[i - 1].close > arr[i - 1].open ? '#e74c4c' : arr[i - 1].close < arr[i - 1].open ? '#1faa7a' : '#e74c4c';
                return {
                    time: b.time,
                    value: b.volume,
                    color
                };
            });
            volumeSeriesRef.current.setData(vols);
        }
        if (!isArea) applyMAs(); else { ma5SeriesRef.current = null; ma10SeriesRef.current = null; ma20SeriesRef.current = null; }
        if (!firstDataLoadedRef.current) {
            firstDataLoadedRef.current = true;
            // 已全局禁用fitContent，防止任何分辨率切换或数据回补时抖动
        }
        console.log('[LWK] data bars=', barsRef.current.length, 'mode=', candleSeriesModeRef.current);
    }, [applyMAs]);

    const mergeAndSet = useCallback((newBars: typeof barsRef.current, direction: 'prepend' | 'append') => {
        if (direction === 'prepend') {
            const existing = barsRef.current;
            const merged = [...newBars, ...existing];
            const map = new Map<number, any>();
            merged.forEach(b => map.set(b.time, b));
            barsRef.current = Array.from(map.values()).sort((a, b) => a.time - b.time) as any;
        } else {
            const existing = barsRef.current;
            const map = new Map<number, any>();
            existing.forEach(b => map.set(b.time, b));
            newBars.forEach(b => map.set(b.time, b));
            barsRef.current = Array.from(map.values()).sort((a, b) => a.time - b.time) as any;
        }
        earliestTimeRef.current = barsRef.current.length ? barsRef.current[0].time : earliestTimeRef.current;
        setAllData();
    }, [setAllData]);

    const gapFillBase = (arr: any[], intervalSec: number) => {
        if (!fillGaps) return arr;
        if (!arr.length) return arr; const filled: any[] = []; let prev = arr[0]; filled.push(prev);
        for (let i = 1; i < arr.length; i++) { const cur = arr[i]; let expected = prev.time + intervalSec; while (expected < cur.time) { filled.push(gapSynthetic(expected as UTCTimestamp, prev.close)); expected += intervalSec; } filled.push(cur); prev = cur; }
        return filled;
    };

    const loadHistory = useCallback(async (sym: string, res: string, mode: 'init' | 'prepend' = 'init') => {
        if (mode === 'prepend' && (loadingMore || !hasMore)) return;
        if (mode === 'init') { setLoading(true); setError(null); setHasMore(true); }
        if (mode === 'prepend') setLoadingMore(true);
        try {
            const isComposite = !!COMPOSITE[res];
            const baseRes = isComposite ? COMPOSITE[res].base : res;
            const factor = isComposite ? COMPOSITE[res].factor : 1;
            const intervalStr = RES_INTERVAL[baseRes] || '15m';
            const intervalSecBase = RES_SECONDS[baseRes];
            let params: any = { contract: sym, interval: intervalStr };
            if (mode === 'init' || !earliestTimeRef.current) {
                params.limit = Math.min(500, 500 * factor);
            } else {
                const end = (earliestTimeRef.current as number) - 1;
                const start = end - intervalSecBase * BATCH_SIZE * factor;
                params.start = start; params.end = end; params.limit = BATCH_SIZE * factor;
            }
            const key = `${sym}|${res}|${params.start || 'latest'}|${params.end || 'latest'}|${params.limit}`;
            let klineData = klineCacheGet(key);
            if (!klineData) {
                klineData = await retryAsync(() => getMarketKline(params));
                klineCacheSet(key, klineData);
            }
            const rawBars = klineData?.bars || [];
            console.debug('[KLINE] loadHistory mode=%s res=%s got rawBars=%d params=%o', mode, res, rawBars.length, params);
            if (!rawBars.length) {
                if (mode === 'prepend') setHasMore(false);
                if (mode === 'init') setError('no data');
            } else {
                // Robust field mapping: support ts/time/timestamp and volume variants; auto ms->s
                let baseBars = rawBars.map((b: any) => {
                    let tRaw = b.ts ?? b.time ?? b.timestamp;
                    if (tRaw == null) return null;
                    let tNum = typeof tRaw === 'number' ? tRaw : Number(tRaw);
                    if (tNum > 1e12) tNum = Math.floor(tNum / 1000); // convert ms to s
                    const rawAsset = Number(b.volume_asset_raw ?? b.volume_asset ?? (b.volume_base != null ? b.volume_base : 0));
                    const volumeBtc = Number(b.volume_btc ?? b.volume_sats ?? 0);
                    const scaledAsset = rawAsset; // unchanged (no scaling)
                    return {
                        time: tNum as UTCTimestamp,
                        open: Number(b.open),
                        high: Number(b.high),
                        low: Number(b.low),
                        close: Number(b.close),
                        volumeAssetRaw: rawAsset,
                        volumeAsset: scaledAsset,
                        volumeBtc: volumeBtc,
                        volume: scaledAsset, // for histogram
                        trades: b.trades ?? null,
                        isOpen: !!b.is_open,
                    };
                }).filter(Boolean).sort((a: any, b: any) => a.time - b.time);
                if (!baseBars.length) {
                    console.warn('[KLINE] raw bars present but mapping produced empty result. First raw:', rawBars[0]);
                }
                baseBars = gapFillBase(baseBars, intervalSecBase);
                let finalBars = baseBars;
                if (isComposite) {
                    const agg: any[] = [];
                    const bucketSec = intervalSecBase * factor;
                    let bucket: any = null;
                    for (const b of baseBars) {
                        const bucketStart = Math.floor(b.time / bucketSec) * bucketSec;
                        if (!bucket || bucket.time !== bucketStart) {
                            if (bucket) agg.push(bucket);
                            bucket = { time: bucketStart as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume, volumeAsset: b.volumeAsset, volumeAssetRaw: b.volumeAssetRaw, volumeBtc: b.volumeBtc, trades: b.trades ?? 0, synthetic: !!b.synthetic };
                        } else {
                            bucket.high = Math.max(bucket.high, b.high);
                            bucket.low = Math.min(bucket.low, b.low);
                            bucket.close = b.close;
                            // Replace snapshot values for the latest sub-bar inside bucket (avoid duplicate addition if API returns cumulative volume)
                            bucket.volume = b.volume;
                            bucket.volumeAsset = b.volumeAsset;
                            bucket.volumeAssetRaw = b.volumeAssetRaw;
                            bucket.volumeBtc = b.volumeBtc;
                            if (b.trades != null) bucket.trades = b.trades;
                            bucket.synthetic = bucket.synthetic && !!b.synthetic;
                        }
                    }
                    if (bucket) agg.push(bucket);
                    const filledAgg: any[] = [];
                    if (agg.length) {
                        let prev = agg[0]; filledAgg.push(prev);
                        for (let i = 1; i < agg.length; i++) {
                            const cur = agg[i]; let expected = prev.time + bucketSec;
                            while (fillGaps && expected < cur.time) { filledAgg.push(gapSynthetic(expected as UTCTimestamp, prev.close)); expected += bucketSec; }
                            filledAgg.push(cur); prev = cur;
                        }
                    }
                    finalBars = filledAgg.length ? filledAgg : agg;
                }
                if (mode === 'init') {
                    barsRef.current = finalBars;
                    barsRef.current = sanitizeAndMergeBars(barsRef.current as any) as any;
                    earliestTimeRef.current = barsRef.current[0]?.time || null;
                    setAllData();
                    // Auto backfill if too few bars (e.g., API only returned latest slice)
                    if (finalBars.length > 0 && finalBars.length < 50) {
                        try {
                            const target = 120;
                            const intervalSecBase = RES_SECONDS[baseRes];
                            let guard = 0;
                            while (barsRef.current.length < target && earliestTimeRef.current && guard < 10) {
                                guard++;
                                const end = (earliestTimeRef.current as number) - 1;
                                const span = intervalSecBase * BATCH_SIZE * (isComposite ? factor : 1);
                                const start = end - span;
                                const backParams: any = { contract: sym, interval: intervalStr, start, end, limit: BATCH_SIZE * (isComposite ? factor : 1) };
                                const backKey = `${sym}|${res}|${start}|${end}|${backParams.limit}`;
                                let backData = klineCacheGet(backKey);
                                if (!backData) { backData = await retryAsync(() => getMarketKline(backParams)); klineCacheSet(backKey, backData); }
                                const backRaw = backData?.bars || [];
                                if (!backRaw.length) { setHasMore(false); break; }
                                let backBars = backRaw.map((b: any) => {
                                    let tRaw = b.ts ?? b.time ?? b.timestamp; if (tRaw == null) return null; let tNum = typeof tRaw === 'number' ? tRaw : Number(tRaw); if (tNum > 1e12) tNum = Math.floor(tNum / 1000);
                                    const rawAsset = Number(b.volume_asset_raw ?? b.volume_asset ?? (b.volume_base != null ? b.volume_base : 0));
                                    const volumeBtc = Number(b.volume_btc ?? b.volume_sats ?? 0);
                                    return { time: tNum as UTCTimestamp, open: Number(b.open), high: Number(b.high), low: Number(b.low), close: Number(b.close), volumeAssetRaw: rawAsset, volumeAsset: rawAsset, volumeBtc, volume: rawAsset, trades: b.trades ?? null, isOpen: !!b.is_open };
                                }).filter(Boolean).sort((a: any, b: any) => a.time - b.time);
                                backBars = gapFillBase(backBars, intervalSecBase);
                                let backFinal = backBars;
                                if (isComposite) {
                                    const agg: any[] = []; const bucketSec = intervalSecBase * factor; let bucket: any = null;
                                    for (const b of backBars) {
                                        const bucketStart = Math.floor(b.time / bucketSec) * bucketSec;
                                        if (!bucket || bucket.time !== bucketStart) { if (bucket) agg.push(bucket); bucket = { time: bucketStart as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume, volumeAsset: b.volumeAsset, volumeAssetRaw: b.volumeAssetRaw, volumeBtc: b.volumeBtc, trades: b.trades ?? 0, synthetic: !!b.synthetic }; }
                                        else { bucket.high = Math.max(bucket.high, b.high); bucket.low = Math.min(bucket.low, b.low); bucket.close = b.close; bucket.volume = b.volume; bucket.volumeAsset = b.volumeAsset; bucket.volumeAssetRaw = b.volumeAssetRaw; bucket.volumeBtc = b.volumeBtc; if (b.trades != null) bucket.trades = b.trades; bucket.synthetic = bucket.synthetic && !!b.synthetic; }
                                    }
                                    if (bucket) agg.push(bucket);
                                    const filledAgg: any[] = []; if (agg.length) { let prev = agg[0]; filledAgg.push(prev); for (let i = 1; i < agg.length; i++) { const cur = agg[i]; let expected = prev.time + bucketSec; while (fillGaps && expected < cur.time) { filledAgg.push(gapSynthetic(expected as UTCTimestamp, prev.close)); expected += bucketSec; } filledAgg.push(cur); prev = cur; } }
                                    backFinal = filledAgg.length ? filledAgg : agg;
                                }
                                mergeAndSet(backFinal, 'prepend');
                                barsRef.current = sanitizeAndMergeBars(barsRef.current as any) as any;
                                earliestTimeRef.current = barsRef.current[0]?.time || earliestTimeRef.current;
                                if (backRaw.length < BATCH_SIZE * (isComposite ? factor : 1)) { setHasMore(false); break; }
                            }
                            console.debug('[KLINE] backfill completed bars=%d', barsRef.current.length);
                            setAllData();
                            // 已全局禁用fitContent，防止任何分辨率切换或数据回补时抖动
                        } catch (bfErr) { console.warn('[KLINE] backfill failed', bfErr); }
                    }
                } else {
                    mergeAndSet(finalBars, 'prepend');
                    barsRef.current = sanitizeAndMergeBars(barsRef.current as any) as any;
                    setAllData();
                }
                if (rawBars.length < (mode === 'init' ? 500 : BATCH_SIZE * (isComposite ? factor : 1))) setHasMore(false);
                cacheRef.current[`${sym}|${res}`] = { bars: [...barsRef.current], earliest: earliestTimeRef.current, ts: Date.now() };
            }
        } catch (e: any) {
            if (mode === 'init') setError(e?.message || 'load error');
        } finally {
            if (mode === 'init') setLoading(false);
            if (mode === 'prepend') setLoadingMore(false);
        }
    }, [hasMore, loadingMore, mergeAndSet, setAllData]);

    useEffect(() => {
        if (!containerRef.current) return;
        if (chartRef.current) { try { chartRef.current.remove?.(); } catch { } chartRef.current = null; }
        setChartReady(false);
        const chart = createChart(containerRef.current, {
            height: Number(effectiveHeight),
            layout: { background: { type: ColorType.Solid, color: theme === 'dark' ? '#0c0c0f' : '#ffffff' }, textColor: theme === 'dark' ? '#b3b3b3' : '#222' },
            grid: { vertLines: { color: 'rgba(70, 70, 70, 0.3)' }, horzLines: { color: 'rgba(70,70,70,0.30)' } },
            rightPriceScale: { borderVisible: false },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
                rightOffset: resolution === 'D' ? 2 : 6, // reduced to shrink unnecessary empty space on right
                barSpacing: resolution === 'D' ? 14 : 9,
                fixLeftEdge: false,
                fixRightEdge: false,
                lockVisibleTimeRangeOnResize: true,
                tickMarkFormatter: (time: any) => {
                    const d = new Date(time * 1000);
                    if (resolution === '1' || resolution === '5' || resolution === '15' || resolution === '60') {
                        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}`;
                    }
                    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
                }
            },
            crosshair: { mode: 1 },
        });
        chartRef.current = chart as any;

        try {
            candleSeriesRef.current = chart.addCandlestickSeries({
                upColor: '#e74c4c', downColor: '#1faa7a', wickUpColor: '#e74c4c', wickDownColor: '#1faa7a', borderVisible: false
            });
            // apply scale margins on the main (right) price scale
            try { chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.05, bottom: configuredVolumeRatio + 0.02 } }); } catch { }
            candleSeriesModeRef.current = 'candle';
        } catch (e) {
            console.error('[LWK v4] addCandlestickSeries failed', e);
            candleSeriesRef.current = undefined as any;
        }
        if (candleSeriesRef.current) {
            try {
                volumeSeriesRef.current = chart.addHistogramSeries({
                    priceScaleId: 'vol',
                    priceFormat: { type: 'volume' },
                    color: 'rgba(130,130,130,0.4)'
                });
                try { chart.priceScale('vol').applyOptions({ scaleMargins: { top: 1 - configuredVolumeRatio, bottom: 0.02 } }); } catch { }
            } catch (e) { console.warn('[LWK v4] addHistogramSeries failed', e); }
            try { ma5SeriesRef.current = chart.addLineSeries({ color: '#ffc04d', lineWidth: 1 }); ma5SeriesRef.current.applyOptions({ priceScaleId: 'right' }); } catch { }
            try { ma10SeriesRef.current = chart.addLineSeries({ color: '#4da6ff', lineWidth: 1 }); ma10SeriesRef.current.applyOptions({ priceScaleId: 'right' }); } catch { }
            try { ma20SeriesRef.current = chart.addLineSeries({ color: '#b28cff', lineWidth: 1 }); ma20SeriesRef.current.applyOptions({ priceScaleId: 'right' }); } catch { }
        } else {
            ma5SeriesRef.current = null; ma10SeriesRef.current = null; ma20SeriesRef.current = null; volumeSeriesRef.current = null;
        }

        const applyPaneMargins = () => {
            try {
                chartRef.current?.priceScale('right').applyOptions({ scaleMargins: showVolume ? { top: 0.05, bottom: configuredVolumeRatio + 0.02 } : { top: 0.05, bottom: 0.07 } });
            } catch { }
            try {
                if (showVolume) {
                    chartRef.current?.priceScale('vol').applyOptions({ scaleMargins: { top: 1 - configuredVolumeRatio, bottom: 0.02 } });
                } else {
                    chartRef.current?.priceScale('vol').applyOptions({ scaleMargins: { top: 0.99, bottom: 0.0 } });
                }
            } catch { }
        };
        applyPaneMargins();

        const handleResize = () => { if (!containerRef.current || !chartRef.current) return; chartRef.current.applyOptions({ width: containerRef.current.clientWidth }); applyPaneMargins(); };
        handleResize(); window.addEventListener('resize', handleResize);

        const ts = chart.timeScale();
        const onVisibleChange = () => {
            if (!hasMore || loadingMore || !barsRef.current.length) return;
            const range = ts.getVisibleRange();
            if (range) lastViewportRef.current = ts.getVisibleLogicalRange();
            if (!range) return;
            const fromTime = range.from as number; const toTime = range.to as number;
            const earliest = earliestTimeRef.current || 0;
            const secPerBar = RES_SECONDS[resolution] || 900;
            // detect user manual scroll (turn off followLatest if away from tail)
            const lastBarTime = barsRef.current[barsRef.current.length - 1]?.time || 0;
            if (lastBarTime && toTime < lastBarTime - secPerBar * 0.5) {
                if (followLatest) setFollowLatest(false);
            } else if (!followLatest && lastBarTime && toTime >= lastBarTime - secPerBar * 0.5) {
                setFollowLatest(true);
            }
            if (fromTime - earliest <= secPerBar * 3) {
                if (symbol) loadHistory(symbol, resolution, 'prepend');
            }
        };
        ts.subscribeVisibleTimeRangeChange(onVisibleChange);

        setChartReady(true);
        return () => {
            window.removeEventListener('resize', handleResize);
            ts.unsubscribeVisibleTimeRangeChange(onVisibleChange);
            try { chart.remove(); } catch { }
            chartRef.current = null; candleSeriesRef.current = null; volumeSeriesRef.current = null;
            setChartReady(false);
        };
    }, [effectiveHeight, theme, resolution, symbol, loadHistory, hasMore, loadingMore, configuredVolumeRatio]);

    // New effect: toggle volume pane without recreating chart
    useEffect(() => {
        if (!chartRef.current) return;
        try {
            chartRef.current.priceScale('right').applyOptions({ scaleMargins: showVolume ? { top: 0.05, bottom: configuredVolumeRatio + 0.02 } : { top: 0.05, bottom: 0.07 } });
        } catch { }
        if (volumeSeriesRef.current) {
            try {
                volumeSeriesRef.current.applyOptions({ visible: showVolume });
                chartRef.current.priceScale('vol').applyOptions(showVolume ? { scaleMargins: { top: 1 - configuredVolumeRatio, bottom: 0.02 } } : { scaleMargins: { top: 0.99, bottom: 0 } });
            } catch { }
        }
    }, [showVolume, configuredVolumeRatio]);

    useEffect(() => {
        (window as any).__lwKlineDebug = {
            getVersion: () => (window as any).lightweightCharts?.version,
            getChart: () => chartRef.current,
            getSeriesMode: () => candleSeriesModeRef.current,
            getBars: () => [...barsRef.current],
            getCapabilities: () => {
                const c: any = chartRef.current; if (!c) return null; return {
                    hasAddSeries: typeof c.addSeries === 'function',
                    hasAddCandlestickSeries: typeof c.addCandlestickSeries === 'function',
                    hasAddHistogramSeries: typeof c.addHistogramSeries === 'function',
                    hasAddLineSeries: typeof c.addLineSeries === 'function',
                    hasAddAreaSeries: typeof c.addAreaSeries === 'function',
                    chartKeys: Object.keys(c).slice(0, 50),
                };
            },
            forceArea: () => {
                const c: any = chartRef.current; if (!c) return false; try {
                    if (candleSeriesRef.current) { try { candleSeriesRef.current.setData([]); } catch { } }
                    if (typeof c.addAreaSeries === 'function') { candleSeriesRef.current = c.addAreaSeries({ lineColor: '#ff4d4f', topColor: 'rgba(255,77,79,0.25)', bottomColor: 'rgba(255,77,79,0.05)' }); candleSeriesModeRef.current = 'area'; setAllData(); return true; }
                    if (typeof c.addSeries === 'function') { candleSeriesRef.current = c.addSeries({ type: 'Area', lineColor: '#ff4d4f', topColor: 'rgba(255,77,79,0.25)', bottomColor: 'rgba(255,77,79,0.05)' }); candleSeriesModeRef.current = 'area'; setAllData(); return true; }
                } catch (e) { console.error('forceArea failed', e); }
                return false;
            },
            restoreViewport: () => { const ts = chartRef.current?.timeScale(); if (ts && lastViewportRef.current) ts.setVisibleLogicalRange(lastViewportRef.current); }
        };
    }, [setAllData, showMA5, showMA10, showMA20]);

    useEffect(() => { if (symbol) { const key = `${symbol}|${resolution}`; const cached = cacheRef.current[key]; if (cached && Date.now() - cached.ts < 60_000) { barsRef.current = [...cached.bars]; earliestTimeRef.current = cached.earliest; setAllData(); } else { barsRef.current = []; earliestTimeRef.current = null; loadHistory(symbol, resolution, 'init'); } } }, [symbol, resolution, loadHistory, setAllData]);

    useEffect(() => {
        if (!symbol) return; const id = setInterval(async () => {
            try {
                if (!barsRef.current.length) return;
                const isComposite = !!COMPOSITE[resolution];
                const baseRes = isComposite ? COMPOSITE[resolution].base : resolution;
                const factor = isComposite ? COMPOSITE[resolution].factor : 1;
                const intervalStr = RES_INTERVAL[baseRes] || '15m';
                const intervalSecBase = RES_SECONDS[baseRes];
                const params: any = { contract: symbol, interval: intervalStr, limit: Math.max(1, factor) };
                let data = await retryAsync(() => getMarketKline(params));
                const latestArr = data?.bars || [];
                if (!latestArr.length) return;
                let baseBars = latestArr.map((b: any) => {
                    let tRaw = b.ts ?? b.time ?? b.timestamp; if (tRaw == null) return null; let tNum = typeof tRaw === 'number' ? tRaw : Number(tRaw); if (tNum > 1e12) tNum = Math.floor(tNum / 1000);
                    const rawAsset = Number(b.volume_asset_raw ?? b.volume_asset ?? (b.volume_base != null ? b.volume_base : 0));
                    const volumeAsset = rawAsset;
                    const volumeBtc = Number(b.volume_btc ?? b.volume_sats ?? 0);
                    return { time: tNum as UTCTimestamp, open: Number(b.open), high: Number(b.high), low: Number(b.low), close: Number(b.close), volumeAssetRaw: rawAsset, volumeAsset, volumeBtc, volume: volumeAsset, trades: b.trades ?? null, isOpen: !!b.is_open };
                }).filter(Boolean).sort((a: any, b: any) => a.time - b.time);
                baseBars = sanitizeAndMergeBars(baseBars);
                const pushAggregated = (finalBars: any[]) => { barsRef.current = finalBars; setAllData(); cacheRef.current[`${symbol}|${resolution}`] = { bars: [...finalBars], earliest: earliestTimeRef.current, ts: Date.now() }; };
                if (!isComposite) {
                    const last = baseBars[baseBars.length - 1];
                    const existingLast = barsRef.current[barsRef.current.length - 1];
                    if (!existingLast || last.time > existingLast.time) {
                        let prev = existingLast; const intervalSec = RES_SECONDS[resolution];
                        if (prev && fillGaps) { let expected = prev.time + intervalSec; while (expected < last.time) { barsRef.current.push(gapSynthetic(expected as UTCTimestamp, prev.close)); expected += intervalSec; } }
                        barsRef.current.push(last as any);
                        barsRef.current = sanitizeAndMergeBars(barsRef.current as any) as any;
                        pushAggregated(barsRef.current);
                        if (followLatest) { try { chartRef.current?.timeScale().scrollToRealTime(); } catch { } }
                    } else if (last.time === existingLast.time) {
                        existingLast.high = Math.max(existingLast.high, last.high);
                        existingLast.low = Math.min(existingLast.low, last.low);
                        existingLast.close = last.close;
                        // Snapshot replace (do not accumulate to prevent inflation)
                        existingLast.volume = last.volume;
                        existingLast.volumeAsset = last.volumeAsset;
                        existingLast.volumeAssetRaw = last.volumeAssetRaw;
                        existingLast.volumeBtc = last.volumeBtc;
                        if (last.trades != null) existingLast.trades = last.trades;
                        barsRef.current = sanitizeAndMergeBars(barsRef.current as any) as any;
                        pushAggregated(barsRef.current);
                        if (followLatest) { try { chartRef.current?.timeScale().scrollToRealTime(); } catch { } }
                    }
                } else {
                    const compFactor = factor; const bucketSec = intervalSecBase * compFactor;
                    let updated = false;
                    for (const b of baseBars) {
                        const bucketTime = Math.floor(b.time / bucketSec) * bucketSec;
                        let existingBucket = barsRef.current[barsRef.current.length - 1];
                        if (!existingBucket || bucketTime > existingBucket.time) {
                            if (existingBucket) { let expected = existingBucket.time + bucketSec; while (fillGaps && expected < bucketTime) { barsRef.current.push(gapSynthetic(expected as UTCTimestamp, existingBucket.close)); expected += bucketSec; } }
                            barsRef.current.push({ time: bucketTime as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume, volumeAsset: b.volumeAsset, volumeAssetRaw: b.volumeAssetRaw, volumeBtc: b.volumeBtc, trades: b.trades ?? 0, synthetic: !!b.synthetic }); updated = true;
                        } else if (bucketTime === existingBucket.time) {
                            existingBucket.high = Math.max(existingBucket.high, b.high);
                            existingBucket.low = Math.min(existingBucket.low, b.low);
                            existingBucket.close = b.close;
                            existingBucket.volume = b.volume;
                            existingBucket.volumeAsset = b.volumeAsset;
                            existingBucket.volumeAssetRaw = b.volumeAssetRaw;
                            existingBucket.volumeBtc = b.volumeBtc;
                            if (b.trades != null) existingBucket.trades = b.trades;
                            updated = true;
                        }
                    }
                    if (updated) { barsRef.current = sanitizeAndMergeBars(barsRef.current as any) as any; pushAggregated(barsRef.current); if (followLatest) { try { chartRef.current?.timeScale().scrollToRealTime(); } catch { } } }
                }
                lastPriceRef.current = barsRef.current[barsRef.current.length - 1]?.close;
            } catch { }
        }, 10_000); return () => clearInterval(id);
    }, [symbol, resolution, setAllData, followLatest]);

    // crosshair事件只依赖chartReady和chartRef.current，避免因MA切换等导致事件丢失
    useEffect(() => {
        if (!chartReady || !chartRef.current || !candleSeriesRef.current) return;
        const chart = chartRef.current;
        let rafPending = false;
        const handler = (param: any) => {
            // eslint-disable-next-line no-console
            console.log('crosshair move', param);
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => {
                rafPending = false;
                if (!param || param.time == null) {
                    setHoverInfo(undefined);
                    if (tooltipElRef.current) tooltipElRef.current.style.display = 'none';
                    return;
                }
                // lightweight-charts: for daily/weekly resolutions param.time is BusinessDay object, not number
                const rawTime = param.time;
                let t: number;
                if (typeof rawTime === 'object') {
                    // BusinessDay: { year, month, day }
                    const { year, month, day } = rawTime as { year: number; month: number; day: number };
                    t = Math.floor(Date.UTC(year, month - 1, day) / 1000);
                } else {
                    t = rawTime as number;
                }
                const arr = barsRef.current;
                let l = 0, r = arr.length - 1, idx = -1;
                while (l <= r) {
                    const m = (l + r) >> 1;
                    const mt = arr[m].time;
                    if (mt === t) { idx = m; break; }
                    if (mt < t) l = m + 1; else r = m - 1;
                }
                if (idx === -1) { return; }
                const bar = arr[idx];
                const getMA = (period: number) => { if (idx + 1 < period) return undefined; let sum = 0; for (let i = idx - period + 1; i <= idx; sum += arr[i].close, i++); return +(sum / period).toFixed(8); };
                setHoverInfo({ time: t, close: bar.close, open: bar.open, high: bar.high, low: bar.low, volume: bar.volume, ma5: getMA(5), ma10: getMA(10), ma20: getMA(20) });
                // --- Native tooltip update ---
                if (!tooltipElRef.current && containerRef.current) {
                    const el = document.createElement('div');
                    el.className = 'lwk-tooltip';
                    Object.assign(el.style, {
                        position: 'absolute', zIndex: '60', pointerEvents: 'none',
                        background: 'rgba(20,20,24,0.78)', backdropFilter: 'blur(4px)',
                        borderRadius: '6px', padding: '6px 8px',
                        fontSize: '11px', lineHeight: '1.25', color: '#d4d4d8',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)', minWidth: '130px', display: 'none'
                    });
                    containerRef.current.appendChild(el);
                    tooltipElRef.current = el;
                }
                const el = tooltipElRef.current;
                if (!el) return;
                // Position
                let xCoord: number | null = (param.point && typeof param.point.x === 'number') ? param.point.x : null;
                let yCoord: number | null = (param.point && typeof param.point.y === 'number') ? param.point.y : null;
                try {
                    if ((xCoord == null || yCoord == null) && chartRef.current && candleSeriesRef.current) {
                        const tsApi = chartRef.current.timeScale();
                        const px = tsApi.timeToCoordinate(param.time);
                        const py = candleSeriesRef.current.priceToCoordinate(bar.close);
                        if (typeof px === 'number') xCoord = px;
                        if (typeof py === 'number') yCoord = py;
                    }
                } catch { }
                if (xCoord == null || yCoord == null) { el.style.display = 'none'; return; }
                const cw = containerRef.current?.clientWidth || 0; const ch = containerRef.current?.clientHeight || 0;
                const boxW = el.offsetWidth || 150; const boxH = el.offsetHeight || 120;
                let left = xCoord + 14; let top = yCoord + 14;
                if (left + boxW > cw - 4) left = xCoord - boxW - 14;
                if (left < 4) left = 4;
                if (top + boxH > ch - 4) top = yCoord - boxH - 14;
                if (top < 4) top = 4;
                el.style.left = left + 'px';
                el.style.top = top + 'px';
                const dt = new Date(t * 1000);
                const timeStr = `${dt.getFullYear()}-${(dt.getMonth() + 1).toString().padStart(2, '0')}-${dt.getDate().toString().padStart(2, '0')} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
                const diff = bar.close - bar.open;
                const pct = bar.open ? diff / bar.open * 100 : 0;
                // 绿色涨 红色跌
                const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
                const ma5 = showMA5 && getMA(5) != null ? getMA(5) : undefined;
                const ma10 = showMA10 && getMA(10) != null ? getMA(10) : undefined;
                const ma20 = showMA20 && getMA(20) != null ? getMA(20) : undefined;
                const formatVol = (v: number) => {
                    if (!isFinite(v)) return '-';
                    if (v === 0) return '0';
                    if (v >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
                    if (v >= 1e-3) return v.toPrecision(6).replace(/0+$/, '').replace(/\.$/, '');
                    if (v >= 1e-6) return v.toPrecision(6);
                    return v.toExponential(2);
                };
                const volAssetStr = formatVol(bar.volumeAsset); // already raw units
                const volBtcStr = formatVol(bar.volumeBtc);
                const tradesStr = bar.trades != null ? String(bar.trades) : null;
                // Localization labels
                const labels = lang === 'zh' ? {
                    time: '时间', open: '开', high: '高', low: '低', close: '收', volAsset: '量(资产)', volBtc: '额(BTC)', trades: '笔数', diff: '差值', pct: '涨幅', ma: '均线', openFlag: '未闭合'
                } : {
                    time: 'Time', open: 'O', high: 'H', low: 'L', close: 'C', volAsset: 'Vol(Asset)', volBtc: 'Vol(BTC)', trades: 'Trades', diff: 'Diff', pct: '%', ma: 'MA', openFlag: 'OPEN'
                };
                const star = bar.isOpen ? ' *' : '';
                el.innerHTML = `
<div style="color:#9ca3af">${labels.time}: ${timeStr}${bar.isOpen ? ' <span style=\"color:#f5d259\">' + labels.openFlag + '</span>' : ''}</div>
<div style="color:#4dd2ff">${labels.open}: ${bar.open.toFixed(priceDecimals)}</div>
<div style="color:#4dd2ff">${labels.high}: ${bar.high.toFixed(priceDecimals)}</div>
<div style="color:#4dd2ff">${labels.low}: ${bar.low.toFixed(priceDecimals)}</div>
<div style="color:#4dd2ff">${labels.close}: ${bar.close.toFixed(priceDecimals)}</div>
<div style="color:#93c5fd">${labels.volAsset}: ${volAssetStr}</div>
<div style="color:#93c5fd">${labels.volBtc}: ${volBtcStr}</div>
${tradesStr ? `<div style='color:#e2e8f0'>${labels.trades}: ${tradesStr}</div>` : ''}
<div style="color:#fbbf24">${labels.diff}: ${sign}${Math.abs(diff).toFixed(priceDecimals)}</div>
<div style="color:#fbbf24">${labels.pct}: ${sign}${Math.abs(pct).toFixed(changeDecimals)}%</div>
${candleSeriesModeRef.current === 'candle' && (showMA5 || showMA10 || showMA20) ? `<div style='margin-top:2px;color:#e5e5e5'>${labels.ma}: ${[ma5 != null ? `MA5:${ma5.toFixed(priceDecimals)}` : '', ma10 != null ? `MA10:${ma10.toFixed(priceDecimals)}` : '', ma20 != null ? `MA20:${ma20.toFixed(priceDecimals)}` : ''].filter(Boolean).join(' ')}</div>` : ''}
`;
                el.style.display = 'block';
            });
        };
        chart.subscribeCrosshairMove(handler);
        const onLeave = () => { setHoverInfo(undefined); if (tooltipElRef.current) tooltipElRef.current.style.display = 'none'; };
        containerRef.current?.addEventListener('mouseleave', onLeave);
        const tapHandler = (ev: MouseEvent) => {
            if (!isMobile || !containerRef.current || !chartRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = ev.clientX - rect.left;
            try {
                const tsApi = chartRef.current.timeScale();
                const ct = tsApi.coordinateToTime(x as any);
                if (!ct) { return; }
                let t: number;
                if (typeof ct === 'object') {
                    const { year, month, day } = ct as any; t = Math.floor(Date.UTC(year, month - 1, day) / 1000);
                } else { t = ct as number; }
                const arr = barsRef.current; if (!arr.length) return;
                let nearest = arr[0]; let minDiff = Math.abs(nearest.time - t);
                for (let i = 1; i < arr.length; i++) { const d = Math.abs(arr[i].time - t); if (d < minDiff) { minDiff = d; nearest = arr[i]; } }
                const idx = arr.indexOf(nearest);
                const getMA = (period: number) => { if (idx + 1 < period) return undefined; let s = 0; for (let j = idx - period + 1; j <= idx; j++) s += arr[j].close; return +(s / period).toFixed(8); };
                setHoverInfo({ time: nearest.time, close: nearest.close, open: nearest.open, high: nearest.high, low: nearest.low, volume: nearest.volume, ma5: getMA(5), ma10: getMA(10), ma20: getMA(20) });
            } catch { }
        };
        const elc = containerRef.current;
        if (elc) elc.addEventListener('click', tapHandler);
        return () => {
            chart.unsubscribeCrosshairMove(handler);
            if (elc) elc.removeEventListener('click', tapHandler);
            containerRef.current?.removeEventListener('mouseleave', onLeave);
        };
    }, [chartReady, chartRef.current, isMobile, priceDecimals, changeDecimals, lang]);

    useEffect(() => {
        if (!candleSeriesRef.current) return; const last = barsRef.current.at(-1); if (!last) return;
        if (lastPriceLineRef.current) { try { candleSeriesRef.current.removePriceLine(lastPriceLineRef.current); } catch { } }
        lastPriceLineRef.current = candleSeriesRef.current.createPriceLine({ price: last.close, color: '#e74c4c', lineWidth: 1, lineStyle: 2, axisLabelVisible: true });
        setRangeInfo(r => ({ start: barsRef.current[0]?.time, end: last.time }));
    }, [barsRef.current.length]);

    // 在组件挂载时就创建 tooltip DOM，避免首次 crosshair 事件未触发时无法显示
    useEffect(() => {
        if (!tooltipElRef.current && containerRef.current) {
            const el = document.createElement('div');
            el.className = 'lwk-tooltip';
            Object.assign(el.style, {
                position: 'absolute', zIndex: '60', pointerEvents: 'none',
                background: 'rgba(20,20,24,0.78)', backdropFilter: 'blur(4px)',
                borderRadius: '6px', padding: '6px 8px',
                fontSize: '11px', lineHeight: '1.25', color: '#d4d4d8',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)', minWidth: '130px', display: 'none'
            });
            containerRef.current.appendChild(el);
            tooltipElRef.current = el;
        }
    }, [containerRef.current]);

    // K线数据加载后，主动触发一次 crosshair 事件，定位到最后一根K线
    useEffect(() => {
        if (!chartRef.current || !barsRef.current.length) return;
        const ts = chartRef.current.timeScale();
        const lastBar = barsRef.current[barsRef.current.length - 1];
        if (lastBar) {
            try {
                ts.setVisibleRange({ from: lastBar.time - (RES_SECONDS[resolution] || 900) * 50, to: lastBar.time });
                chartRef.current.crosshair().moveTo(lastBar.time, false);
            } catch { }
        }
    }, [chartReady, barsRef.current.length, resolution]);

    // Percentage display: rise green (with +), fall red
    const pct24h = priceInfo.pct24h != null ? (priceInfo.pct24h > 0 ? '+' : priceInfo.pct24h < 0 ? '' : '') + (priceInfo.pct24h * 100).toFixed(2) + '%' : '--';
    const priceStr = (hoverInfo?.close != null ? hoverInfo.close : (priceInfo.last != null ? Number(priceInfo.last) : undefined))?.toFixed(priceDecimals) || '--';
    // 绿色涨 红色跌
    const pctClass = priceInfo.pct24h == null ? 'text-zinc-400' : priceInfo.pct24h > 0 ? 'text-green-500' : priceInfo.pct24h < 0 ? 'text-red-500' : 'text-zinc-400';

    const formatTs = (ts?: number) => ts ? new Date(ts * 1000).toISOString().slice(5, 16).replace('T', ' ') : '--';

    useEffect(() => {
        // 当勾选/取消 MA 时主动刷新均线数据（保持视窗不回弹）
        applyMAs();
    }, [showMA5, showMA10, showMA20, applyMAs]);

    // 格式化 symbol 显示为 satdog(ordx)
    function parseSymbol(symbol?: string) {
        if (!symbol) return { assetName: '', protocol: '' };
        const parts = symbol.split('_');
        const assetInfo = parts[1] || '';
        const asset = assetInfo.split(':');
        const protocol = asset[0] || '';
        const assetName = asset[2] || '';
        return { assetName, protocol };
    }

    const { assetName, protocol } = parseSymbol(symbol);

    const showAssetHeader = (symbol || '').includes('_amm');

    return (
        <div className={`flex flex-col w-full h-full ${className}`}>
            {!candleSeriesRef.current && (
                <div className="absolute z-30 top-10 left-1/2 -translate-x-1/2 px-3 py-2 rounded bg-zinc-800/80 text-xs text-amber-400">
                    Chart series not initialized – falling back attempt. (Check lightweight-charts version.)
                </div>
            )}
            <div className="flex items-center gap-4 px-3 py-3 sm:py-1 border-b border-zinc-700/40 bg-zinc-900/60 text-xs relative">
                {showAssetHeader && (
                    <Avatar className="w-10 h-10 text-xl text-gray-300 font-medium bg-zinc-700">
                        <AssetLogo protocol={protocol} ticker={assetName} className="w-10 h-10" />
                        <AvatarFallback>
                            {assetName?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                )}
                {isMobile ? (
                    <>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-green-500">{priceStr}</span>
                            <span className={`text-[11px] ${pctClass}`}>{pct24h}</span>
                        </div>


                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                            {RESOLUTIONS.map(r => (
                                <button key={r} onClick={() => setResolution(r)} className={`px-2 h-6 rounded-sm font-medium  text-[12px] sm:text-[11px] border ${r === resolution ? 'bg-purple-600/80 text-white border-purple-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{r === '60' ? '1H' : r === 'D' ? '1D' : (r === '240' ? '4H' : r)}</button>
                            ))}
                        </div>
                        {/* Mobile removed VOL/LIVE from header; now bottom toolbar */}
                    </>
                ) : (
                    <>
                        <div className="flex flex-col">
                            <span className="mt-1 text-base text-green-500 font-semibold">{priceStr}<span className="ml-1 text-[14px] text-zinc-500">sats</span></span>
                            <span className={`mt-1 text-[12px] sm:text-[14px] ${pctClass}`}>{pct24h}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-400">Res:</span>
                            {RESOLUTIONS.map(r => (
                                <button key={r} onClick={() => setResolution(r)} className={`px-2 h-6 rounded-sm font-medium text-[13px] border transition-colors ${r === resolution ? 'bg-purple-600/80 text-white border-purple-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'}`}>{r === '60' ? '1H' : r === 'D' ? '1D' : (r === '240' ? '4H' : r)}</button>
                            ))}
                        </div>

                        <div className="ml-auto mt-9 flex items-center gap-3 text-[10px] text-zinc-500">
                            <span>{formatTs(rangeInfo.start)} → {formatTs(rangeInfo.end)}</span>
                        </div>
                    </>
                )}
                {/* 左上角资产信息和条件 */}
                <div className="absolute left-2 top-18 sm:top-16 z-20 flex justify-start items-center min-w-[320px]">
                    <span className="text-sm font-medium text-zinc-500">
                        <span className={assetName && assetName.length > 10 ? 'text-[11px]' : 'text-sm'}>
                            {assetName}
                        </span>
                        ({protocol}) -- <span className='text-[11px]'>SATSWAP</span>
                    </span>
                    <span className="text-xs text-zinc-500 ml-2">
                        Res: {resolution === 'D' ? '1D' : (resolution === '240' ? '4H' : resolution)}
                        {candleSeriesModeRef.current === 'candle' && (showMA5 || showMA10 || showMA20) && (
                            <>
                                , MA:
                                {showMA5 && '5'}{showMA10 && (showMA5 ? ',' : '') + '10'}{showMA20 && ((showMA5 || showMA10) ? ',' : '') + '20'}
                            </>
                        )}
                    </span>
                </div>
                {/* header tooltip removed; now inside chart */}
                {loading && <span className="ml-2 text-[10px] text-zinc-500">Loading...</span>}
                {loadingMore && <span className="ml-2 text-[10px] text-zinc-500">More...</span>}
                {error && <span className="ml-2 text-[10px] text-red-400">{error}</span>}
            </div>
            <div className="flex-1 w-full pb-2 relative" style={effectiveHeight ? { height: effectiveHeight } : undefined}>
                <div ref={containerRef} className="w-full h-full"
                    onWheel={(e) => { if (!isMobile && e.ctrlKey) { e.preventDefault(); const ts = chartRef.current?.timeScale(); if (ts) { /* custom zoom disabled for mobile */ } } }}
                    onKeyDown={(e) => { if (e.altKey && chartRef.current) { try { chartRef.current.applyOptions({ handleScale: { mouseWheel: true, pinch: true }, handleScroll: { mouseWheel: true, pressedMouseMove: true } }); } catch { } } }}
                />
                {/* React tooltip removed; now native DOM (lwk-tooltip) */}
            </div>
            {/* Bottom toolbar: MA / FillGaps / VOL / LIVE */}
            <div className="w-full px-3 py-4 border-t border-zinc-700/40 flex justify-between items-center gap-3 text-[12px] sm:text-[13px]">
                {candleSeriesModeRef.current === 'candle' && (
                    <div className="flex justify-center items-center gap-2 ">
                        <span className="text-zinc-400">MA:</span>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={showMA5} onChange={e => setShowMA5(e.target.checked)} className="accent-[#ffc04d]" /><span className="text-[12px] text-[#ffc04d]">5 {showMA5}</span></label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={showMA10} onChange={e => setShowMA10(e.target.checked)} className="accent-[#4da6ff]" /><span className="text-[12px] text-[#4da6ff]">10 {showMA10}</span></label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={showMA20} onChange={e => setShowMA20(e.target.checked)} className="accent-[#b28cff]" /><span className="text-[12px] text-[#b28cff]">20 {showMA20}</span></label>
                    </div>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={fillGaps} onChange={e => {
                        setFillGaps(e.target.checked); if (!e.target.checked) {
                            barsRef.current = barsRef.current.filter(b => !b.synthetic) as any; setAllData();
                        } else {
                            barsRef.current = []; earliestTimeRef.current = null; if (symbol) loadHistory(symbol, resolution, 'init');
                        }
                    }} className="accent-purple-500" /><span className="text-[12px] text-zinc-400">FillGaps</span></label>
                    <button onClick={() => { setShowVolume(v => !v); setTimeout(() => { try { chartRef.current?.timeScale().fitContent(); } catch { } }, 0); }} className={`px-2 h-6 rounded-sm border text-[11px] ${showVolume ? 'border-zinc-600 text-zinc-300' : 'border-zinc-700 text-zinc-500'}`}>VOL</button>
                    <button onClick={() => { setFollowLatest(f => !f); if (!followLatest) { try { chartRef.current?.timeScale().scrollToRealTime(); } catch { } } }} className={`px-2 h-6 rounded-sm border text-[11px] ${followLatest ? 'border-green-600 text-green-400' : 'border-zinc-700 text-zinc-500'}`}>LIVE</button>
                </div>
            </div>
        </div>
    );
};

export default LightweightKline;
