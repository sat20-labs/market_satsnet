'use client';

import type React from 'react';
import { useState, useEffect, useMemo, Suspense } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Assets } from '@/components/account/Assets';
import { OrdxOrderList } from '@/components/account/OrdxOrderList';
import { MyActivitiesLog } from '@/components/satoshinet/MyActivitiesLog';
import { useSearchParams } from 'next/navigation';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useTranslation } from 'react-i18next';
import { OrdxBillList } from '@/components/account/OrdxBillList';
import { marketApi } from '@/api';
import { useCommonStore } from '@/store';
import ReferrerBind from '@/components/account/ReferrerBind';
import ReferrerRegister from '@/components/account/ReferrerRegister';
import PointsDashboard from '@/components/account/PointsDashboard';

function AccountContent() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const paramTab = params.get('source') || 'utxo';
  const { address, balance } = useReactWalletStore((state) => state);
  const { chain, network } = useCommonStore();
  const [tabKey, setTabKey] = useState(paramTab);
  const [totalSatValue, setTotalSatValue] = useState(0);

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
          {/* <TabsTrigger value="history">{t('common.tx_history')}</TabsTrigger> */}
          {/* <TabsTrigger value="order">{t('common.my_listings')}</TabsTrigger> */}
          <TabsTrigger value="points">{t('pages.points.tab')}</TabsTrigger>
          <TabsTrigger value="referrer">{t('common.referrer')}</TabsTrigger>
        </TabsList>
        <TabsContent value="utxo">
          <Assets />
        </TabsContent>
        {/* <TabsContent value="history">
          <MyActivitiesLog address={address} />
        </TabsContent> */}
        {/* <TabsContent value="order">
          <OrdxOrderList address={address} />
        </TabsContent> */}
        <TabsContent value="points">
          <PointsDashboard />
        </TabsContent>
        <TabsContent value="referrer">
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
        </TabsContent>
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
