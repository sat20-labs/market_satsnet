"use client";
import React from 'react';
import { Card } from '@/components/ui/card';
import { useEmission } from '@/application/useEmissionService';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function HalvingSoon({ className }: { className?: string }) {
    const { t } = useTranslation();
    const { data } = useEmission();
    const [pulse, setPulse] = React.useState(false);

    React.useEffect(() => {
        const onHalving = () => {
            setPulse(true);
            const tId = setTimeout(() => setPulse(false), 1200);
            return () => clearTimeout(tId);
        };
        window.addEventListener('points:halving', onHalving as any);
        return () => window.removeEventListener('points:halving', onHalving as any);
    }, []);

    const remainX100 = Math.max(0, (data?.remaining_to_next_halving_x100 ?? 0));
    const remain = remainX100 / 100;

    return (
        <Card className={cn('p-4 bg-amber-500/5 border border-amber-500/30 rounded-xl h-full', className, pulse && 'ring-2 ring-amber-400/80')}>
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
                <span className="text-lg">⚡</span>
                <span>{t('pages.points.halving_soon')}</span>
            </div>
            <div className="mt-2 text-sm text-amber-200">
                {t('pages.points.points_to_next_halving', { value: remain.toLocaleString() })}
            </div>
        </Card>
    );
}
