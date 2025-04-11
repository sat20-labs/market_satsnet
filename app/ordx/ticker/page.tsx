'use client';

import useSWR from 'swr';
import { Card, CardBody, Button, Avatar, Image } from '@nextui-org/react';
import { getAssetsSummary } from '@/api';
import { Tabs, Tab } from '@nextui-org/react';
import { OrdxOrderList } from '@/components/order/OrdxOrderList';
import { OrderAnalyze } from '@/components/order/OrderAnalyze';
import { OrdxOrderHistoryList } from '@/components/order/OrdxOrderHistoryList';
import { OrderNameTypeNav } from '@/components/order/OrderNameTypeNav';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { getTickLabel } from '@/lib/utils';
import { Icon } from '@iconify/react';
import { useCommonStore } from '@/store/common';
export default function Page() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const { address, network } = useReactWalletStore((state) => state);
  const { chain } = useCommonStore();
  const ticker = params.get('ticker') as string;
  const assets_type = params.get('assets_type') as string;
  const { data } = useSWR(`getAssetsSummary-${chain}-${network}-${ticker}-${assets_type}`, () => {
    console.log('app.ordx.ticker.page: ticker: ', ticker);
    try {
      return getAssetsSummary({ assets_name: ticker, assets_type });
    } catch (error) {
      console.log('app.ordx.ticker.page: getAssetsSummary error: ', error);
    }
  });
  const toAccount = () => {
    router.push('/account');
  };

  const summary = useMemo(() => data?.data?.summary || {}, [data]);
  const headList = useMemo(() => {
    return [
      {
        value: Number(summary.lowest_price).toFixed(2),
        label: t('common.lowest_price'),
        unit: 'sats',
      },
      {
        value: summary.tx_total_volume,
        label: t('common.tx_total_volume'),
        unit: 'BTC',
      },

      {
        value: summary.tx_order_count,
        label: t('common.tx_order_count'),
        unit: '',
      },

      // {
      //   value: summary.tx_total_amount,
      //   label: t('common.tx_total_asset'),
      //   unit: '',
      // },
      {
        value: (
          (summary.total_amount * summary.lowest_price) /
          100000000
        )?.toFixed(4),
        label: t('common.total_amount'),
        unit: 'BTC',
      },
      {
        value: summary.onsell_order_count,
        label: t('common.onsell_order_count'),
        unit: '',
      },
      // {
      //   value: summary.onsell_total_amount,
      //   label: t('common.onsell_total_amount'),
      //   unit: '',
      // },

      // {
      //   value: summary.highest_price,
      //   label: t('common.highest_price'),
      //   unit: 'BTC',
      // },
      {
        value: summary.holder_count,
        label: i18n.t('common.holder_count'),
        unit: '',
      },
    ];
  }, [summary, i18n.language]);

  return (
    <div>
      <div className="min-h-40 flex flex-col py-2">
        <div className="flex-1 flex items-center mb-4 gap-4">
          {summary?.logo ? (
            <Image
              src={`${process.env.NEXT_PUBLIC_HOST}${network === 'testnet' ? '/testnet' : ''}${summary.logo}`}
              alt="logo"
              className="w-20 h-20 p-2"
            />
          ) : summary?.assets_type === 'exotic' ? (
            <Image
              src={`/raresats/${summary?.assets_name}.svg`}
              alt="logo"
              className="w-20 h-20 p-2"
            />
          ) : (
            <Avatar
              name={ticker.slice(0, 1).toUpperCase()}
              className="text-3xl text-gray-200 font-black w-20 h-20 bg-gray-900"
            />
          )}
          <div className="flex-1 flex items-center flex-wrap justify-center h-20">
            <div className="flex-1">
              {ticker !== 'btc' && (
                <div className="text-2xl md:text-3xl font-medium text-gary-500">
                  {summary?.nickname
                    ? summary?.nickname
                    : getTickLabel(summary?.assets_name)}
                </div>
              )}
            </div>
            <WalletConnectBus text={t('buttons.list_sale')}>
              <Button onClick={toAccount} color="primary">
                {t('buttons.list_sale')}
              </Button>
            </WalletConnectBus>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-between gap-4">
          <div className="grid gap-2 grid-cols-3 lg:grid-cols-6">
            {headList.map((item) => (
              <Card isHoverable key={item.label} className="px-2">
                <CardBody className="text-center">
                  <div className="flex text-base md:text-2xl text-center justify-center">
                    {item.unit === 'BTC' && (
                      <Icon
                        icon="cryptocurrency-color:btc"
                        className="mr-1 mt-0.5"
                      />
                    )}
                    <span>{item.value === undefined ? '-' : item.value}</span>
                    {item.unit === 'sats' && (
                      <span className="text-base self-end ml-2">Sats</span>
                    )}
                  </div>
                  <div className="text-sm lg:text-md text-gray-400">
                    {item.label}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4">
        {/* <Tabs aria-label="Options" size="lg" color="primary"> */}
        <Tabs
          aria-label="Options"
          color="primary"
          size="lg"
          variant="underlined"
          classNames={{
            tabList:
              'gap-6 w-full relative rounded-none p-0 border-b border-divider',
            cursor: 'w-full bg-blue-500',
            tab: 'max-w-fit px-0 h-12',
            tabContent: 'group-data-[selected=true]:text-blue-400',
          }}
          style={{ width: '100%' }}
        >
          <Tab key="market" title={t('pages.market.title')}>
            <OrdxOrderList
              key={`${ticker}_${assets_type}`}
              assets_name={ticker}
              assets_type={assets_type}
              showResale
            />
          </Tab>
          <Tab key="analyze" title={t('common.analyze')}>
            <OrderAnalyze assets_name={ticker} assets_type={assets_type} />
          </Tab>
          <Tab key="history" title={t('common.tx_history')}>
            <OrdxOrderHistoryList
              assets_name={ticker}
              assets_type={assets_type}
            />
          </Tab>
          <Tab key="my" title={t('common.my_listings')}>
            <WalletConnectBus className="mx-auto mt-20 block">
              <OrdxOrderList
                assets_name={ticker}
                assets_type={assets_type}
                address={address}
              />
            </WalletConnectBus>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
