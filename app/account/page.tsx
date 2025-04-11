'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Tab } from '@nextui-org/react';
import useSWR from 'swr';
import { OrdxAssetsUtxoList } from '@/components/account/OrdxAssetsUtxoList';
import { OrdxOrderHistoryList } from '@/components/order/OrdxOrderHistoryList';
import { OrdxOrderList } from '@/components/account/OrdxOrderList';
import { useSearchParams, useRouter } from 'next/navigation';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useTranslation } from 'react-i18next';
import { OrdxBillList } from '@/components/account/OrdxBillList';
import { BlogCreate } from '@/components/account/BlogCreate';
import { getAddressAssetsValue } from '@/api';
import { useCommonStore } from '@/store';
export default function AccountPage() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const paramTab = params.get('source') || 'utxo';
  const { address, balance, network } = useReactWalletStore((state) => state);
  const { chain } = useCommonStore();
  const [tabKey, setTabKey] = useState(paramTab);
  const [totalSatValue, setTotalSatValue] = useState(0);
  const swrKey = useMemo(() => {
    return `/ordx/getAddressAssetsValue-${address}-${chain}-${network}`;
  }, [address, network]);

  const { data, isLoading, mutate } = useSWR(
    swrKey,
    () => getAddressAssetsValue(address),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const onTabChange = (k: any) => {
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
    <div className="py-2">
      <Tabs
        aria-label="Options"
        color="default"
        size="lg"
        selectedKey={tabKey}
        variant="underlined"
        onSelectionChange={onTabChange}
        classNames={{
          tabList: 'gap-2 py-2 w-full relative rounded-none border-b border-divider',
          tab: 'max-w-fit px-0 sm:px-2 h-12 text-sm font-medium rounded-lg transition-colors',
          tabContent:
            'group-data-[selected=true]:bg-zinc-800 group-data-[selected=true]:text-white group-data-[selected=true]:rounded-lg group-data-[selected=true]:px-4 group-data-[selected=true]:py-2',
            cursor: 'hidden', // 隐藏下划线
        }}
        style={{ width: '100%' }}
      >
        <Tab key="utxo" title={t('buttons.my_assets')}>
          <OrdxAssetsUtxoList />
        </Tab>
        <Tab key="history" title={t('common.tx_history')}>
          <OrdxOrderHistoryList address={address} />
        </Tab>
        <Tab key="order" title={t('common.my_listings')}>
          <OrdxOrderList address={address} />
        </Tab>
        <Tab key="bill" title={t('common.my_biils')}>
          <OrdxBillList />
        </Tab>
        <Tab key="blog" title={t('common.my_blog')}>
          <BlogCreate />
        </Tab>
      </Tabs>
    </div>
  );
}
