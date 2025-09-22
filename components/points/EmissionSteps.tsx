"use client";
import React from 'react';
import { Card } from '@/components/ui/card';
import { useEmission } from '@/application/useEmissionService';
import { useTranslation } from 'react-i18next';

export default function EmissionSteps() {
    const { t } = useTranslation();
    const { data } = useEmission();
    const step = data?.step_size_x100 ?? 0;
    const cap = data?.total_cap_x100 ?? 0;
    const minted = data?.total_minted_x100 ?? 0;
    const n = data?.current_halvings ?? 0;

    if (!step || !cap) return null;
    const totalSteps = Math.floor(cap / step);
    const currentStepIndex = Math.min(totalSteps - 1, Math.floor(minted / step));
    const inStepMinted = minted - currentStepIndex * step;
    const inStepPercent = Math.max(0, Math.min(100, (inStepMinted / step) * 100));

    return (
        <Card className="p-4 bg-zinc-900/70 border border-zinc-700 rounded-xl">
            <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400">{t('pages.points.halving_stages')}</div>
                <div className="text-xs text-zinc-500">
                    {t('pages.points.current_step_status', { current: currentStepIndex + 1, total: totalSteps, n })}
                </div>
            </div>
            <div className="mt-3 grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1">
                {Array.from({ length: totalSteps }).map((_, idx) => {
                    const isCurrent = idx === currentStepIndex;
                    const isDone = idx < currentStepIndex;
                    return (
                        <div key={idx} className="h-4 rounded overflow-hidden border border-zinc-700 bg-zinc-800">
                            {isDone ? (
                                <div className="h-full w-full bg-emerald-500" />
                            ) : isCurrent ? (
                                <div className="h-full bg-emerald-500" style={{ width: `${inStepPercent}%` }} />
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
