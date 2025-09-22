"use client";
import React from 'react';
import { Card } from '@/components/ui/card';
// Removed old emission widgets to avoid duplication
// import EmissionProgress from '@/components/points/EmissionProgress';
// import EmissionSteps from '@/components/points/EmissionSteps';
// import HalvingSoon from '@/components/points/HalvingSoon';
import TradeRankPanel from './TradeRankPanel';
import ReferralRankPanel from './ReferralRankPanel';
import { useTranslation } from 'react-i18next';
import SmpEmissionPage from '@/components/points/SmpEmissionPage';

export default function EmissionAndRankPage() {
    const { t } = useTranslation();
    return (
        <div className="p-1 mt-6 space-y-4">
            {/* Emission main section */}
            <SmpEmissionPage />
            {/* Rankings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="p-4 bg-zinc-900 border border-zinc-700">
                    <TradeRankPanel />
                </Card>
                <Card className="p-4 bg-zinc-900 border border-zinc-700">
                    <ReferralRankPanel />
                </Card>
            </div>
        </div>
    );
}
