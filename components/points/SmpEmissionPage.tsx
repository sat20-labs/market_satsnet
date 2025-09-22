'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useEmission } from '@/application/useEmissionService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function SmpEmissionPage(): JSX.Element {
    const { t } = useTranslation();
    const { data, isLoading } = useEmission();
    const [policyOpen, setPolicyOpen] = React.useState(false);

    // Configurable total halving stages and reserved stages (fallback to 20/4)
    const halvingStages = Number(process.env.NEXT_PUBLIC_EMISSION_HALVING_STAGES || 20);
    const reserveStages = Number(process.env.NEXT_PUBLIC_EMISSION_RESERVE_STAGES || 4);

    // API values (x100 precision)
    const mintedX100 = data?.total_minted_x100 ?? 0;
    const stepX100 = data?.step_size_x100 ?? 0;
    const nextX100 = data?.next_halving_at_x100 ?? 0;
    const lastX100 = Math.max(0, nextX100 - stepX100);
    const inStageX100 = Math.max(0, mintedX100 - lastX100);

    // Derived numbers
    const producedPoints = mintedX100 / 100;
    const nextHalvingRemain = Math.max(0, (data?.remaining_to_next_halving_x100 ?? 0)) / 100; // remaining points to next halving
    const progressPct = stepX100 > 0 ? Math.min(100, Math.max(0, (inStageX100 / stepX100) * 100)) : 0;
    const currentStage = Math.min(halvingStages, (data?.current_halvings ?? 0) + 1);

    // Small inline ring progress component
    function RingProgress({ value, size = 140, stroke = 12 }: { value: number; size?: number; stroke?: number }) {
        const gid = React.useId();
        const radius = (size - stroke) / 2;
        const circumference = 2 * Math.PI * radius;
        const clamped = Math.max(0, Math.min(100, value));
        const visibleArc = Math.max(2, clamped); // guarantee visibility for very small values
        const offset = circumference * (1 - visibleArc / 100);
        const gradId = `grad-${gid}`;
        return (
            <svg width={size} height={size} className="block">
                <defs>
                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                </defs>
                {/* track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#334155" /* slate-700 for contrast */
                    strokeWidth={stroke}
                    fill="none"
                />
                {/* progress */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={`url(#${gradId})`}
                    strokeWidth={stroke}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    className="transition-all duration-700 ease-out"
                />
                <text
                    x="50%"
                    y="50%"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    className="fill-slate-100 font-semibold"
                >
                    {isLoading ? '…' : `${clamped.toFixed(1)}%`}
                </text>
            </svg>
        );
    }

    // helper to render halving steps
    function renderHalvingSteps() {
        const steps: JSX.Element[] = [];
        for (let i = 1; i <= halvingStages; i++) {
            const isReserve = i > halvingStages - reserveStages;
            const filled = i <= currentStage;
            steps.push(
                <div
                    key={i}
                    className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-medium select-none transition-all duration-300 ease-out ${isReserve ? 'bg-yellow-800 border-2 border-yellow-600 text-yellow-100' : 'bg-slate-700'
                        } ${filled ? 'ring-2 ring-offset-1 ring-indigo-500 transform scale-105' : 'opacity-50'}`}
                >
                    {i}
                </div>
            );
        }
        return <div className="grid grid-cols-10 gap-2">{steps}</div>;
    }

    return (
        <div className="text-slate-100">
            <div className="mx-auto">
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-8 px-2">
                    <div>
                        <h1 className="text-xl sm:text-3xl font-extrabold">
                            {t('pages.points.emission_title')} <span className="relative -top-1 sm:-top-2 right-2 px-1.5 py-0.5 text-[10px] sm:text-sm rounded bg-indigo-500/20 text-indigo-400">{t('pages.points.beta')}</span>
                        </h1>
                        <p className="text-[11px] sm:text-sm text-slate-400 mt-1">{t('pages.points.notice')}</p>
                    </div>
                    <div className="mt-2 sm:mt-0 text-right hidden sm:block">
                        <div className="text-xs text-slate-400">{t('pages.points.halving_progress')}</div>
                        <div className="mt-1 text-lg font-semibold">{isLoading ? '…' : `${progressPct.toFixed(1)}%`}</div>
                    </div>
                </header>

                <main className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    {/* Left: Stats & Progress */}
                    <section className="md:col-span-2 bg-[#071018] rounded-2xl p-3 sm:p-6 shadow-lg border border-slate-800">
                        <div className="flex items-start sm:items-center justify-between mb-3 sm:mb-4">
                            <h2 className="text-base sm:text-lg font-semibold">{t('pages.points.halving_progress')}</h2>
                            <div className="text-[11px] sm:text-sm text-slate-400">
                                {t('pages.points.current_multiplier', { value: data?.current_halvings ?? 0 })}
                            </div>
                        </div>

                        <div className="mb-5 sm:mb-6">
                            <div className="w-full bg-slate-900 h-3 sm:h-4 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${isLoading ? 0 : progressPct}%` }}
                                    transition={{ duration: 1.0 }}
                                    className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-amber-500"
                                />
                            </div>
                            <div className="mt-3 flex justify-between text-[11px] sm:text-sm text-slate-400">
                                <div>
                                    {t('pages.points.produced_points_label')}{' '}
                                    <span className="text-white font-semibold">
                                        {isLoading ? '…' : producedPoints.toLocaleString(undefined, { maximumFractionDigits: 1 })} {t('pages.points.points_unit')}
                                    </span>
                                </div>
                                <div>
                                    {t('pages.points.to_next_halving_label')}{' '}
                                    <span className="text-white font-semibold">
                                        {isLoading ? '…' : nextHalvingRemain.toLocaleString(undefined, { maximumFractionDigits: 1 })} {t('pages.points.points_unit')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-5 sm:mb-6">
                            <h3 className="text-xs sm:text-sm text-slate-300 font-medium mb-2 sm:mb-3">{t('pages.points.halving_stages')}</h3>
                            <div className="p-2 sm:p-3 rounded-xl bg-[#07131a] border border-slate-800">{renderHalvingSteps()}</div>
                            <div className="mt-2 sm:mt-3 text-[11px] sm:text-xs text-slate-400">
                                {t('pages.points.stages_hint', { start: 1, active: Math.max(0, halvingStages - reserveStages), reserve: reserveStages })}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <div className="p-3 sm:p-4 rounded-lg bg-[#06121a] border border-slate-800">
                                <div className="text-[11px] sm:text-xs text-slate-400">{t('pages.points.emission_stage')}</div>
                                <div className="text-lg sm:text-xl font-semibold">
                                    {currentStage}/{halvingStages}
                                </div>
                            </div>
                            <div className="p-3 sm:p-4 rounded-lg bg-[#06121a] border border-slate-800">
                                <div className="text-[11px] sm:text-xs text-slate-400">{t('pages.points.produced_points')}</div>
                                <div className="text-lg sm:text-xl font-semibold">{isLoading ? '…' : producedPoints.toLocaleString()}</div>
                            </div>
                            <div className="p-3 sm:p-4 rounded-lg bg-[#06121a] border border-slate-800">
                                <div className="text-[11px] sm:text-xs text-slate-400">{t('pages.points.reserved_for_halving')}</div>
                                <div className="text-lg sm:text-xl font-semibold">{reserveStages}</div>
                            </div>
                        </div>
                        <div className="mt-5 sm:mt-6 text-[11px] sm:text-xs text-slate-400">
                            <div>* {t('pages.points.note_label')}: {t('pages.points.reserve_note', { reserve: reserveStages })}
                            </div>
                        </div>
                    </section>

                    {/* Right: Sidebar actions */}
                    <aside className="bg-[#071018] rounded-2xl p-4 sm:p-6 shadow-lg border border-slate-800">
                        <div className="mb-4">
                            <div className="text-sm sm:text-base font-bold text-slate-100 text-center sm:text-left">{t('pages.points.halving_join_now_title')}</div>
                            <div className="mt-4 flex items-center justify-center">
                                {/* mobile ring */}
                                <div className="sm:hidden"><RingProgress value={progressPct} size={120} /></div>
                                {/* desktop ring */}
                                <div className="hidden sm:block"><RingProgress value={progressPct} size={160} /></div>
                            </div>
                            <div className="text-[11px] sm:text-xs text-slate-500 mt-2 text-center">{t('pages.points.halving_progress')}</div>
                        </div>

                        <div className="mt-2 space-y-2 sm:space-y-5">
                            <button className="w-full py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
                                {t('pages.points.join_campaign')}
                            </button>

                            <button className="w-full py-2 rounded-md bg-yellow-600 text-black font-semibold">
                                {t('pages.points.airdrop_plan')}
                            </button>

                            <button className="w-full py-2 rounded-md border border-slate-700 text-slate-200" onClick={() => setPolicyOpen(true)}>
                                {t('pages.points.view_emission_policy')}
                            </button>
                        </div>

                        {/* Emission policy modal */}
                        <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
                            <DialogContent className="sm:max-w-lg bg-zinc-900 border border-zinc-700">
                                <DialogHeader>
                                    <DialogTitle>{t('pages.points.emission_policy_title')}</DialogTitle>
                                </DialogHeader>
                                <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                    {t('pages.points.emission_policy_content')}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </aside>
                </main>

                <footer className="mt-3 sm:mt-4 text-[11px] sm:text-sm text-slate-500 px-2">{t('pages.points.additionalInfo')}</footer>
            </div>
        </div>
    );
}
