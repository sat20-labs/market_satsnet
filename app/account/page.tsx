'use client';

import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Tabs, Tab } from '@nextui-org/react';
import { useQuery } from '@tanstack/react-query';
import { Assets } from '@/components/account/Assets';
import { OrdxOrderHistoryList } from '@/components/order/OrdxOrderHistoryList';
import { useSearchParams } from 'next/navigation';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useTranslation } from 'react-i18next';
import { OrdxBillList } from '@/components/account/OrdxBillList';
import { marketApi } from '@/api';
import { useCommonStore } from '@/store';

export default function AccountPage() {
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

  const onTabChange = (k: React.Key) => {
    setTabKey(k as string);
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
    <div className="py-2">
      <Tabs
        aria-label="Options"
        color="default"
        size="lg"
        selectedKey={tabKey}
        variant="underlined"
        onSelectionChange={onTabChange}
        classNames={{
          tabList:
            'gap-2 py-2 w-full relative rounded-none border-b border-divider',
          tab: 'max-w-fit px-0 sm:px-2 h-12 text-sm font-medium rounded-lg transition-colors',
          tabContent:
            'group-data-[selected=true]:bg-zinc-800 group-data-[selected=true]:text-white group-data-[selected=true]:rounded-lg group-data-[selected=true]:px-4 group-data-[selected=true]:py-2',
          cursor: 'hidden',
        }}
        style={{ width: '100%' }}
      >
        <Tab key="utxo" title={t('buttons.my_assets')}>
          <Assets />
        </Tab>
        <Tab key="history" title={t('common.tx_history')}>
          <OrdxOrderHistoryList address={address} />
        </Tab>
        <Tab key="order" title={t('common.my_listings')}>
          {/* <OrdxOrderList address={address} /> */}
        </Tab>
        <Tab key="bill" title={t('common.my_biils')}>
          <OrdxBillList />
        </Tab>
      </Tabs>
    </div>
  );
}
