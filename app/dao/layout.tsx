'use client';

import React from 'react';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { usePathname } from 'next/navigation';
import { useToolsEnabled } from '@/lib/toolsAccess';
import { useTranslation } from 'react-i18next';

export default function DaoLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const toolsEnabled = useToolsEnabled();
    const { connected } = useReactWalletStore((s: any) => ({ connected: s.connected }));
    const { t } = useTranslation();

    // Always allow list page
    const isList = pathname === '/dao' || pathname === '/dao/';

    if (!isList && !toolsEnabled) {
        return (
            <div className="p-6">
                <div className="text-zinc-200 text-lg font-semibold">{t('pages.dao.guard.restricted_title')}</div>
                <div className="mt-2 text-sm text-zinc-500">
                    {connected ? t('pages.dao.guard.restricted_tip_connected') : t('pages.dao.guard.restricted_tip_disconnected')}
                </div>
                <div className="mt-4 text-sm text-zinc-500">{t('pages.dao.guard.restricted_list_tip')}</div>
            </div>
        );
    }

    return <>{children}</>;
}
