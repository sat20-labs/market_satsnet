'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useDaoDetailData } from '@/hooks/pages/useDaoDetailData';
import { DaoStatusCard } from '@/components/dao/DaoStatusCard';
import { Loading } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { DaoWorkflow } from '@/components/dao/DaoWorkflow';
import { useToolsEnabled } from '@/lib/toolsAccess';
import { useTranslation } from 'react-i18next';

export default function DaoDetailPage() {
    const params = useSearchParams();
    const router = useRouter();
    const { t } = useTranslation();
    const contractUrl = params.get('contractUrl') || '';
    const tab = (params.get('tab') || '') as any;
    const defaultTab = (['overview', 'register', 'donate', 'airdrop', 'review'].includes(tab) ? tab : 'overview') as
        | 'overview'
        | 'register'
        | 'donate'
        | 'airdrop'
        | 'review'
        | undefined;

    const { daoStatus, isLoading, isError, error, refresh } = useDaoDetailData(contractUrl);

    const [showDebug, setShowDebug] = useState(false);

    const toolsEnabled = useToolsEnabled();

    const debugJson = useMemo(() => {
        try {
            return JSON.stringify(daoStatus, null, 2);
        } catch {
            return String(daoStatus);
        }
    }, [daoStatus]);

    if (!contractUrl) {
        return <div className="p-4 text-zinc-200">{t('common.missing')}: contractUrl</div>;
    }

    if (isLoading) return <Loading />;

    if (isError) {
        return (
            <div className="p-4">
                <div className="text-red-400">{t('notification.fetch_failed') || 'Load failed'}</div>
                <div className="mt-2 text-xs text-zinc-500 break-all">{String((error as any)?.message || error)}</div>
                <div className="mt-3">
                    <Button variant="outline" onClick={() => refresh()}>Retry</Button>
                </div>
            </div>
        );
    }

    if (!daoStatus) {
        return (
            <div className="p-4">
                <div className="text-zinc-400">No data</div>
                <div className="mt-3">
                    <Button variant="outline" onClick={() => refresh()}>Refresh</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-zinc-200">{t('pages.dao.title')}</h1>
                    <div className="text-xs text-zinc-500 break-all">{contractUrl}</div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push('/dao')}>{t('pages.dao.detail.back_to_list')}</Button>
                    <Button variant="outline" onClick={() => refresh()}>{t('pages.dao.detail.refresh')}</Button>
                    <Button variant="outline" onClick={() => setShowDebug(v => !v)}>{showDebug ? t('pages.dao.detail.hide_debug') : t('pages.dao.detail.show_debug')}</Button>
                </div>
            </div>

            {/* Interaction first */}
            {toolsEnabled ? (
                <DaoWorkflow contractUrl={contractUrl} status={daoStatus} refresh={refresh} defaultTab={defaultTab} />
            ) : (
                <div className="bg-zinc-950/30 border border-zinc-800 rounded-xl p-4">
                    <div className="text-zinc-200 font-semibold">{t('pages.dao.detail.interaction_disabled')}</div>
                    <div className="mt-1 text-sm text-zinc-500">{t('pages.dao.detail.interaction_disabled_tip')}</div>
                </div>
            )}

            {showDebug && (
                <div className="mt-4 bg-zinc-950/40 border border-zinc-800 rounded-xl p-4">
                    <div className="text-sm text-zinc-300 font-semibold mb-2">Debug: daoStatus JSON</div>
                    <div className="text-xs text-zinc-500 mb-2">If this is empty, the /info/contract request did not return parsed status.</div>
                    <pre className="text-xs text-zinc-200 whitespace-pre-wrap break-all max-h-[50vh] overflow-auto">{debugJson}</pre>
                </div>
            )}
        </div>
    );
}
