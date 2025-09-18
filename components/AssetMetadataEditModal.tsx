'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getContractStatus } from '@/api/market';
import { getAsset, upsertAsset, patchAssetMeta, uploadAssetLogo as uploadAssetLogoImported } from '@/api/market';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useTranslation } from 'react-i18next';

interface AssetMetadataEditModalProps {
    contractURL: string;
    onClose: () => void;
    onSuccess?: () => void;
}

// 简单的遮罩+窗口，不依赖额外UI库（项目已有shadcn结构）
export const AssetMetadataEditModal: React.FC<AssetMetadataEditModalProps> = ({ contractURL, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const { address } = useReactWalletStore();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [loading, setLoading] = useState(false);
    const [initLoading, setInitLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({
        logo: '',
        website: '',
        twitter: '',
        telegram: '',
        discord: '',
        description: '',
        name: '', // only used at creation time
    });
    // asset info
    const [assetTicker, setAssetTicker] = useState<string>('');
    const [assetProtocol, setAssetProtocol] = useState<string>('');
    const [assetName, setAssetName] = useState<string>('');
    const [assetLoaded, setAssetLoaded] = useState(false);
    const [hasExistingAsset, setHasExistingAsset] = useState(false);
    const [reviewStatus, setReviewStatus] = useState<string>('');
    const [pendingPatch, setPendingPatch] = useState<Record<string, any> | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

    const DESC_LIMIT = 1000;

    // Normalize URL helper (adds https:// if missing & non-empty)
    const normalizeUrl = (u: string) => {
        if (!u) return '';
        const trimmed = u.trim();
        if (!trimmed) return '';
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
    };

    // Normalize ticker to Protocol:f:Ticker format
    const getNormalizedTicker = () => {
        if (!assetTicker) return '';
        // Already normalized
        if (assetTicker.includes(':')) return assetTicker;
        if (assetProtocol) return `${assetProtocol}:f:${assetTicker}`;
        return assetTicker; // fallback
    };

    // Apply URL normalization on blur
    const handleUrlBlur = (key: 'website' | 'twitter' | 'telegram' | 'discord') => {
        setForm(prev => ({ ...prev, [key]: normalizeUrl(prev[key]) }));
    };

    // ESC to close
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setInitLoading(true);
                // 1. Fetch contract status to derive ticker/protocol
                try {
                    const statusRes: any = await getContractStatus(contractURL);
                    if (mounted && statusRes?.status) {
                        const statusObj = JSON.parse(statusRes.status);
                        const nameObj = statusObj?.Contract?.assetName || statusObj?.assetName || {};
                        const tck = nameObj?.Ticker || '';
                        const p = nameObj?.Protocol || '';
                        const n = nameObj?.Name || nameObj?.Ticker || '';
                        setAssetTicker(tck);
                        setAssetProtocol(p);
                        setAssetName(n);
                        if (!form.name) setForm(prev => ({ ...prev, name: n }));
                    }
                } catch (e) {
                    console.warn('fetch contract status failed:', e);
                }
            } finally {
                mounted && setInitLoading(false);
            }
        })();
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contractURL]);

    const loadAsset = useCallback(async () => {
        const norm = getNormalizedTicker();
        if (!norm) return;
        setRefreshing(true);
        try {
            const res: any = await getAsset(norm);
            const data = res?.data || res;
            if (data?.ticker) {
                setHasExistingAsset(true);
                setReviewStatus(data.review_status || '');
                setPendingPatch(data.pending_patch || null);
                setForm(prev => ({
                    ...prev,
                    logo: normalizeLogoUrl(data.logo) || prev.logo,
                    description: data.description || prev.description,
                    name: data.name || prev.name,
                    website: data.website || prev.website,
                    twitter: data.twitter || prev.twitter,
                    telegram: data.telegram || prev.telegram,
                    discord: data.discord || prev.discord,
                }));
                if (data.name && !assetName) setAssetName(data.name);
            } else {
                setHasExistingAsset(false);
            }
        } catch (e) {
            console.warn('getAsset failed (may be first creation):', e);
            setHasExistingAsset(false);
        } finally {
            setAssetLoaded(true);
            setRefreshing(false);
        }
    }, [assetTicker, assetName, assetProtocol]);

    // Load asset metadata after ticker known
    useEffect(() => {
        if (assetTicker) {
            loadAsset();
        }
    }, [assetTicker, loadAsset]);

    const handleChange = (key: keyof typeof form, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    // Use the imported uploadAssetLogo function directly
    const getUploadFn = () => {
        return uploadAssetLogoImported;
    };

    // Normalize logo URL to configured points base
    const normalizeLogoUrl = (url?: string) => {
        const base = (process.env.NEXT_PUBLIC_POINTS_API_BASE || '').replace(/\/$/, '');
        if (!url) return url as any;
        try {
            if (url.startsWith('/')) return `${base}${url}`;
            if (!/^https?:\/\//i.test(url)) return `${base}/${url.replace(/^\/+/, '')}`;
            const parsed = new URL(url);
            const baseOrigin = new URL(base).origin;
            if (parsed.hostname === 'localhost' || parsed.host === 'localhost:3002' || parsed.hostname === '127.0.0.1') {
                return `${baseOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
            }
            return url;
        } catch {
            return url;
        }
    };

    const handleLogoFile = async (file: File) => {
        if (!file) return;
        if (!assetTicker) {
            setError(t('pages.assetMeta.noticker'));
            return;
        }
        if (file.size > 512 * 1024) {
            setError(t('pages.assetMeta.logo_size_limit'));
            return;
        }
        setError(null);
        setLoading(true);
        try {
            let res: any;
            const uploadFn = getUploadFn();
            const norm = getNormalizedTicker();
            if (!norm) throw new Error(t('pages.assetMeta.invalid'));
            if (uploadFn) {
                res = await uploadFn(norm, file);
            } else {
                console.warn('uploadAssetLogo not available, using manual fetch fallback');
                const formData = new FormData();
                formData.append('ticker', norm);
                formData.append('file', file);
                const base = (process.env.NEXT_PUBLIC_POINTS_API_BASE || '').replace(/\/$/, '');
                const r = await fetch(`${base}/api/v1/assets/logo/upload`, { method: 'POST', body: formData });
                res = await r.json();
            }
            const data = res?.data || res;
            if (data?.logo) {
                setForm(prev => ({ ...prev, logo: normalizeLogoUrl(data.logo) as string }));
            }
            if (data?.asset?.review_status) setReviewStatus(data.asset.review_status);
            if (data?.asset?.pending_patch) setPendingPatch(data.asset.pending_patch);
            setSaved(true);
        } catch (e: any) {
            console.error('logo upload error:', e);
            setError(e?.message || t('pages.assetMeta.logo_upload_failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!address) {
            setError(t('pages.assetMeta.connect_wallet'));
            return;
        }
        if (!assetTicker) {
            setError(t('pages.assetMeta.noticker'));
            return;
        }
        const norm = getNormalizedTicker();
        if (!norm) {
            setError(t('pages.assetMeta.invalid'));
            return;
        }
        // Normalize links locally to avoid async state race
        const links = {
            website: normalizeUrl(form.website),
            twitter: normalizeUrl(form.twitter),
            telegram: normalizeUrl(form.telegram),
            discord: normalizeUrl(form.discord),
        };
        setLoading(true);
        setError(null);
        setSaved(false);
        try {
            if (!hasExistingAsset) {
                await upsertAsset({
                    ticker: norm,
                    name: form.name || assetName || assetTicker,
                    logo: form.logo || undefined,
                    description: form.description || undefined,
                    ...links,
                });
            } else {
                await patchAssetMeta({
                    ticker: norm,
                    logo: form.logo || undefined,
                    description: form.description || undefined,
                    // name intentionally omitted for existing unless explicitly allowed
                    ...links,
                });
            }
            setSaved(true);
            await loadAsset();
            onSuccess?.();
        } catch (e: any) {
            setError(e?.message || t('pages.assetMeta.invalid'));
        } finally {
            setLoading(false);
        }
    };

    const renderPendingDiff = () => {
        if (!pendingPatch || !Object.keys(pendingPatch).length) return null;
        const items = Object.entries(pendingPatch);
        return (
            <div className="mt-3 border border-amber-600/40 bg-amber-900/20 rounded p-3">
                <div className="text-xs font-semibold text-amber-400 mb-2">{t('pages.assetMeta.pending_title')}</div>
                <ul className="space-y-1 text-xs">
                    {items.map(([k, v]) => (
                        <li key={k} className="flex flex-col md:flex-row md:items-center md:gap-2">
                            <span className="text-amber-300 min-w-16 capitalize">{k}:</span>
                            <span className="text-amber-200 break-all max-w-full">{String(v)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="w-full max-w-xl bg-zinc-900 rounded-lg shadow-lg border border-zinc-700 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur">
                    <h3 className="text-lg font-semibold text-zinc-200">{t('pages.assetMeta.title')}</h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
                </div>
                <div className="p-4 space-y-4">
                    {initLoading && <div className="text-sm text-zinc-400">{t('pages.assetMeta.loading')}</div>}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm mb-1 text-zinc-400">{t('pages.assetMeta.asset_info')}</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 rounded-md border border-zinc-700 bg-zinc-800/40 text-sm">
                                <div>
                                    <div className="text-zinc-500">{t('pages.assetMeta.ticker')}</div>
                                    <div className="font-semibold text-zinc-200 break-all">{assetTicker || '—'}</div>
                                </div>
                                <div>
                                    <div className="text-zinc-500">{t('pages.assetMeta.protocol')}</div>
                                    <div className="font-semibold text-zinc-200 break-all">{assetProtocol || '—'}</div>
                                </div>
                                <div>
                                    <div className="text-zinc-500">{t('pages.assetMeta.name')}</div>
                                    {hasExistingAsset ? (
                                        <div className="font-semibold text-zinc-200 break-all">{assetName || form.name || '—'}</div>
                                    ) : (
                                        <input
                                            className="w-full mt-1 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-500"
                                            placeholder={t('pages.assetMeta.name')}
                                            value={form.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                                <span>{t('pages.assetMeta.status')}: {reviewStatus ? <span className="text-zinc-300">{reviewStatus}</span> : '—'}</span>
                                {refreshing && <span className="text-blue-400">{t('pages.assetMeta.refresh')}...</span>}
                                <button
                                    onClick={() => loadAsset()}
                                    className="px-2 py-1 rounded border border-zinc-600 hover:bg-zinc-700 text-zinc-300"
                                    disabled={refreshing}
                                >{t('pages.assetMeta.refresh')}</button>
                            </div>
                            {renderPendingDiff()}
                        </div>
                        <div>
                            <label className="block text-sm mb-1 text-zinc-400">{t('pages.assetMeta.logo')}</label>
                            <Input value={form.logo} onChange={e => handleChange('logo', e.target.value)} placeholder="https://.../logo.png" />
                            <div className="mt-2 flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/gif,image/webp"
                                        onChange={e => {
                                            const f = e.target.files?.[0];
                                            if (f) {
                                                setSelectedFileName(f.name);
                                                handleLogoFile(f);
                                            } else {
                                                setSelectedFileName(null);
                                            }
                                        }}
                                        className="hidden"
                                        disabled={!assetTicker || loading}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="text-xs border-zinc-600"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={!assetTicker || loading}
                                    >
                                        {t('pages.assetMeta.upload')}
                                    </Button>
                                    <span className="text-xs text-zinc-400 truncate max-w-[220px]">
                                        {selectedFileName || t('pages.assetMeta.no_file')}
                                    </span>
                                </div>
                                {form.logo && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-500">{t('pages.assetMeta.preview')}:</span>
                                        <img
                                            src={normalizeLogoUrl(form.logo)}
                                            alt="logo preview"
                                            className="w-12 h-12 object-contain rounded border border-zinc-700 bg-zinc-800"
                                            onError={(e) => (e.currentTarget.style.opacity = '0.3')}
                                        />
                                    </div>
                                )}
                            </div>
                            <p className="mt-1 text-[10px] text-zinc-500">{t('pages.assetMeta.logo_hint')}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm mb-1 text-zinc-400">{t('pages.assetMeta.website')}</label>
                                <Input value={form.website} onChange={e => handleChange('website', e.target.value)} onBlur={() => handleUrlBlur('website')} placeholder="example.com or https://example.com" />
                            </div>
                            <div>
                                <label className="block text-sm mb-1 text-zinc-400">{t('pages.assetMeta.twitter')}</label>
                                <Input value={form.twitter} onChange={e => handleChange('twitter', e.target.value)} onBlur={() => handleUrlBlur('twitter')} placeholder="x.com/yourhandle" />
                            </div>
                            <div>
                                <label className="block text-sm mb-1 text-zinc-400">{t('pages.assetMeta.telegram')}</label>
                                <Input value={form.telegram} onChange={e => handleChange('telegram', e.target.value)} onBlur={() => handleUrlBlur('telegram')} placeholder="t.me/yourchannel" />
                            </div>
                            <div>
                                <label className="block text-sm mb-1 text-zinc-400">{t('pages.assetMeta.discord')}</label>
                                <Input value={form.discord} onChange={e => handleChange('discord', e.target.value)} onBlur={() => handleUrlBlur('discord')} placeholder="discord.gg/xxxx" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm text-zinc-400">{t('pages.assetMeta.description')}</label>
                                <span className={`text-[10px] ${form.description.length > DESC_LIMIT ? 'text-red-400' : 'text-zinc-500'}`}>{form.description.length}/{DESC_LIMIT}</span>
                            </div>
                            <textarea
                                className="min-h-[120px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                value={form.description}
                                onChange={e => {
                                    const v = e.target.value;
                                    if (v.length <= DESC_LIMIT) handleChange('description', v); else handleChange('description', v.slice(0, DESC_LIMIT));
                                }}
                                placeholder={t('pages.assetMeta.description')}
                            />
                            {form.description.length >= DESC_LIMIT && <div className="text-[10px] text-amber-400 mt-1">{t('pages.assetMeta.desc_limit_reached')}</div>}
                            {error && <div className="text-sm text-red-400 mt-2">{error}</div>}
                            {saved && <div className="text-sm text-green-500 mt-2">{t('pages.assetMeta.saved')}</div>}
                        </div>
                        <div className="flex justify-end gap-3 p-4 border-t border-zinc-800">
                            <Button variant="outline" onClick={onClose} disabled={loading}>{t('pages.assetMeta.cancel')}</Button>
                            <Button className="btn-gradient" onClick={handleSubmit} disabled={loading || initLoading || !assetTicker}>
                                {loading ? t('pages.assetMeta.saving') : (hasExistingAsset ? t('pages.assetMeta.submit') : t('pages.assetMeta.create'))}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetMetadataEditModal;