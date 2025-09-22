"use client";
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { useEmission } from '@/application/useEmissionService';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function EmissionProgress({ className }: { className?: string }) {
    const { t } = useTranslation();
    const { data, isLoading } = useEmission();
    const prevN = React.useRef<number | null>(null);
    const [flash, setFlash] = React.useState(false);

    React.useEffect(() => {
        if (!data) return;
        const n = data.current_halvings || 0;
        if (prevN.current !== null && n > prevN.current) {
            setFlash(true);
            // broadcast halving event for other widgets
            window.dispatchEvent(new CustomEvent('points:halving', { detail: { n } }));
            const t = setTimeout(() => setFlash(false), 3500);
            return () => clearTimeout(t);
        }
        prevN.current = n;
    }, [data]);

    const minted = data?.total_minted_x100 ?? 0;
    const step = data?.step_size_x100 ?? 0;
    const next = data?.next_halving_at_x100 ?? 0;
    const last = Math.max(0, next - step);
    const inStage = Math.max(0, minted - last);
    const percent = step > 0 ? Math.min(100, Math.max(0, (inStage / step) * 100)) : 0;

    return (
        <Card className={cn('p-4 bg-zinc-900/70 border border-zinc-700 rounded-xl', className, flash && 'ring-2 ring-amber-400/80')}>
            <div className="text-sm text-zinc-200 font-medium">{t('pages.points.halving_progress')}</div>
            <div className="mt-2 flex items-center gap-3">
                <Progress value={isLoading || !data ? 0 : percent} className="w-full bg-zinc-800" />
                <div className="w-16 text-right text-sm text-zinc-100 font-semibold">{isLoading ? '…' : `${percent.toFixed(1)}%`}</div>
            </div>
            <div className="mt-2 text-xs text-zinc-400 flex items-center justify-between">
                <span>{((minted / 100) || 0).toLocaleString()} {t('pages.points.points_unit')}</span>
                <span>{t('pages.points.current_multiplier', { value: data?.current_halvings ?? 0 })}</span>
            </div>
        </Card>
    );
}
