'use client';

import { useQuery } from '@tanstack/react-query';
import { notification, Empty } from 'antd';
import { getOrdxAssets, cancelOrder, ordx } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSellStore, useUtxoStore, useCommonStore } from '@/store';
import { splitAsset } from '@/lib/utils/asset';
import { AssetsItem } from '@/components/assets/AssetsItem';
import { BatchSellFooter } from '@/components/BatchSellFooter';
import { useRouter } from 'next/navigation';
import { useList } from 'react-use';
import { useTranslation } from 'react-i18next';
import { Decimal } from 'decimal.js';
import { InfiniteScroll } from '@/components/InfiniteScroll';

interface Props {
  assets_name: string;
  assets_type: string;
  assets_category?: string;
}
export const AssetsList = ({
  assets_name,
  assets_type,
  assets_category,
}: Props) => {
  console.log('assets_name', assets_name);
  
  // const { t } = useTranslation();
  // const router = useRouter();
  // const { address, network, btcWallet } = useReactWalletStore((state) => state);
  // const {
  //   add: addSell,
  //   changeAssetsName,
  //   changeAssetsType,
  //   reset,
  //   list: sellList,
  //   remove: removeSell,
  // } = useSellStore((state) => state);
  // const { feeRate, chain } = useCommonStore();
  // const { getUnspendUtxos } = useUtxoStore();
  // const [type, setType] = useState('sell');
  // const [canSelect, setCanSelect] = useState(false);
  // const [page, setPage] = useState(1);
  // const [size, setSize] = useState(12);

  // const queryKey = useMemo(() => {
  //   return [
  //     'ordxAssets',
  //     address,
  //     chain,
  //     assets_type,
  //     assets_name,
  //     assets_category,
  //     page,
  //     size,
  //   ];
  // }, [address, page, size, assets_name, assets_type, assets_category, chain]);  

  // const { data, isLoading, error, refetch, isFetching } = useQuery({
  //   queryKey,
  //   queryFn: () => {
  //     console.log('queryFn');
  //     console.log('address', address);
  //     return getOrdxAssets({
  //       address,
  //       assets_name,
  //       category: assets_category,
  //       assets_type: assets_type,
  //       offset: (page - 1) * size,
  //       size,
  //     });
  //   },
  //   enabled: !!(address && (assets_type || assets_name)),
  // });
  // console.log('getOrdxAssets data', data);
  return <div className='text-red-500'>AssetsList: </div>;
}