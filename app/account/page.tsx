'use client';

import type React from 'react';
import { useState, useEffect, Suspense } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Assets } from '@/components/account/Assets';
import { useSearchParams } from 'next/navigation';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useTranslation } from 'react-i18next';
import { marketApi } from '@/api';
import { useCommonStore } from '@/store';
import ReferrerBind from '@/components/account/ReferrerBind';
import ReferrerRegister from '@/components/account/ReferrerRegister';
import PointsDashboard from '@/components/points/PointsDashboard';
import ManualPointsAdmin from '@/components/points/ManualPointsAdmin';
import EmissionAndRankPage from '@/components/points/EmissionAndRankPage';

function AccountContent() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const paramTab = params.get('source') || 'utxo';
  const { address, balance, connected } = useReactWalletStore((state) => state);
  // Admin allowlist via env: NEXT_PUBLIC_POINTS_ADMINS (comma/space separated) or '*' for all
  const ADMIN_ADDRS = (process.env.NEXT_PUBLIC_POINTS_ADMINS || '').toLowerCase();
  const isAdmin = !!(connected && address && (ADMIN_ADDRS === '*' || ADMIN_ADDRS.split(/[\s,]+/).filter(Boolean).includes(address.toLowerCase())));
  const { chain, network } = useCommonStore();
  const [tabKey, setTabKey] = useState(paramTab);
  const [totalSatValue, setTotalSatValue] = useState(0);

  // If non-admin deep-links to manualPoints, redirect to points tab
  useEffect(() => {
    if (tabKey === 'manualPoints' && !isAdmin) {
      setTabKey('points');
      history.replaceState(null, '', `?source=points`);
    }
  }, [tabKey, isAdmin]);

  const { data, isLoading } = useQuery({
    queryKey: ['addressAssetsValue', address, chain, network],
    queryFn: () => marketApi.getAddressAssetsValue(address),
    enabled: !!address,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const onTabChange = (k: string) => {
    setTabKey(k);
    history.replaceState(null, '', `?source=${k}`);
  };

  useEffect(() => {
    console.log(data);
    if (data?.data) {
      setTotalSatValue(data.data?.total_value || 0);
    }
  }, [data]);

  console.log('totalSatValue', totalSatValue);

  return (
    <div className='p-2'>
      <Tabs
        value={tabKey}
        defaultValue={paramTab}
        onValueChange={onTabChange}
        className="py-2 w-full"
      >
        <TabsList>
          <TabsTrigger value="utxo">{t('buttons.my_assets')}</TabsTrigger>
          <TabsTrigger value="points">{t('pages.points.tab')}</TabsTrigger>
          {/* Use i18n for Emission & Rank tab */}
          <TabsTrigger value="emission">{t('pages.points.emission_tab')}</TabsTrigger>
          {/* Admin-only Manual Points tab with i18n */}
          {isAdmin && (
            <TabsTrigger value="manualPoints">{t('pages.points.manual_points_tab')}</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="utxo">
          <Assets />
        </TabsContent>
        <TabsContent value="points">
          <PointsDashboard />
        </TabsContent>
        <TabsContent value="emission">
          <EmissionAndRankPage />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="manualPoints">
            <ManualPointsAdmin initialAddress={address} />
          </TabsContent>
        )}
        {/* <TabsContent value="referrer">
          <Tabs defaultValue="register" className="w-full">
            <TabsList>
              <TabsTrigger value="register">{t('common.become_referrer')}</TabsTrigger>
              <TabsTrigger value="bind">{t('common.bind_referrer')}</TabsTrigger>
            </TabsList>
            <TabsContent value="register">
              <ReferrerRegister />
            </TabsContent>
            <TabsContent value="bind">
              <ReferrerBind />
            </TabsContent>
          </Tabs>
        </TabsContent> */}
      </Tabs>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountContent />
    </Suspense>
  );
}
