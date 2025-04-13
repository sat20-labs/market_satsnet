'use client';

import { useQuery } from '@tanstack/react-query';
import { notification, Empty } from 'antd';
import { getOrdxAssets, cancelOrder, marketApi } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSellStore, useUtxoStore, useCommonStore } from '@/store';
import { splitAsset } from '@/lib/utils/asset';
import { getLabelForAssets } from '@/lib/utils';
import { AssetsItem } from '@/components/assets/AssetsItem';
import { BatchSellFooter } from '@/components/BatchSellFooter';
import { useRouter } from 'next/navigation';
import { useList } from 'react-use';
import { useTranslation } from 'react-i18next';
import { Decimal } from 'decimal.js';
import { InfiniteScroll } from '@/components/InfiniteScroll';

interface Props {
  assets_name: string;
  assets_category?: string;
}
export const AssetsList = ({
  assets_name,
  assets_category,
}: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { address, btcWallet } = useReactWalletStore((state) => state);
  const {
    add: addSell,
    changeAssetsName,
    changeAssetsType,
    reset,
    list: sellList,
    remove: removeSell,
  } = useSellStore((state) => state);
  const { feeRate, chain } = useCommonStore();
  const { getUnspendUtxos } = useUtxoStore();
  const [type, setType] = useState('sell');
  const [canSelect, setCanSelect] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);

  const queryKey = useMemo(() => {
    return [
      'ordxAssets',
      address,
      chain,
      assets_name,
      assets_category,
      page,
      size,
    ];
  }, [address, page, size, assets_name, assets_category, chain]);  

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      marketApi.getOrdxAssets({
        address,
        assets_name,
        category: assets_category,
        offset: (page - 1) * size,
        size,
      }),
    enabled: !!(address && (assets_name)),
  });

  useEffect(() => {
    if (error) {
      console.error('React Query Error fetching assets:', error);
      notification.error({
        message: t('notification.fetch_error_title'),
        description: error.message || 'Failed to fetch assets',
      });
    }
  }, [error, t]);

  const [list, { set, reset: resetList, push: pushToList, updateAt }] =
    useList<any>([]);

  useEffect(() => {
    if (data) {
      const { assets = [] } = data?.data || {};
      const _assets = assets.map((item: any) => ({
        ...item,
        assets_list: item.assets_list.map((v: any) => ({
          ...v,
          _assets_name: getLabelForAssets(v.assets_name),
        })),
      }));
      if (page === 1) {
        set(_assets);
      } else {
        pushToList(..._assets);
      }
    }
  }, [data]);

  const toSell = () => {
    router.push('/account/sell');
  };
  const toTransfer = () => {
    router.push('/account/transfer');
  };
  const onSplit = async (item: any) => {
    const utxos = getUnspendUtxos();
    if (item.value % 1000 !== 0 || item.value <= 1000) {
      notification.error({
        message: t('notification.split_error_title'),
        description: t('notification.split_error_description'),
      });
      return;
    }
    try {
      const splitPsbt = await splitAsset({
        asset: item,
        utxos: utxos,
        amount: 1000,
        feeRate: feeRate.value,
      });
      if (!btcWallet) {
        throw new Error('No wallet connected');
      }
      const signedPsbts = await btcWallet.signPsbt(splitPsbt.toHex(), {
        chain,
      });
      if (signedPsbts) {
        await btcWallet.pushPsbt(signedPsbts);
      }
      notification.success({
        message: t('notification.split_success_title'),
      });
    } catch (error: any) {
      console.error('List failed', error);

      notification.error({
        message: t('notification.split_error_title'),
        description: error.message,
      });
      throw error;
    }
  };
  const sellHandler = async (item: any) => {
    addHandler(item);
    setCanSelect(true);
  };
  const addHandler = (item: any) => {
    console.log('addHandler: item: ', item);
    
    changeAssetsName(assets_name);
    addSell({
      ...item,
      unit_price: '2',
      status: 'pending',
    });
  };
  const selectHandler = (bol: boolean, item: any) => {
    if (bol) {
      if (!item.order_id) {
        addHandler(item);
      }
    } else {
      removeSell(item.utxo);
    }
  };

  const onBatchClose = () => {
    setCanSelect(false);
    reset();
  };
  const onCancelOrder = async (item: any) => {
    if (item.locker === '1') {
      notification.error({
        message: 'Cancel order failed',
        description: `The order is locked, please wait unlock it first`,
      });
      return;
    }
    try {
      const res = await marketApi.cancelOrder({ address, order_id: item.order_id });
      if (res.code === 200) {
        notification.success({
          message: 'Cancel order successfully',
          description: `The order has been canceled successfully`,
        });
        const index = list.findIndex((i) => i.utxo === item.utxo);
        item.order_id = 0;
        if (index >= 0) {
          updateAt(index, item);
        }
      } else {
        notification.error({
          message: 'Cancel order failed',
          description: res.msg,
        });
      }
    } catch (error: any) {
      notification.error({
        message: 'Cancel order failed',
        description: error.msg,
      });
    }
  };
  const total = useMemo(() => data?.data?.total || 0, [data]);
  const finished = useMemo(() => {
    console.log('list.length', list.length);
    console.log('total', total);

    return list.length >= total;
  }, [total, list]);
  const loadMore = async () => {
    setPage(page + 1);
  };

  useEffect(() => {
    reset();
  }, []);

  useEffect(() => {
    if (assets_name) {
      // refetch(); // 如果 queryKey 包含了 page 和 size，React Query 会在它们变化时自动重新查询，可能不再需要手动 refetch
    }
  }, [page, size]); // 移除了 refetch 依赖

  useEffect(() => {
    if ( assets_name) {
      resetList();
      setCanSelect(false);
      setPage(1); // 重置页面为 1
      // refetch(); // queryKey 变化会自动触发查询
    }
  }, [ assets_name, assets_category, resetList]);
  return (
    <div className={`${canSelect ? 'pb-20' : ''}`}>
      <InfiniteScroll
        loading={isLoading}
        loadMore={loadMore}
        hasMore={!finished}
        empty={!list.length}
      >
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-4">
          {list.map((item: any, i) => (
            <div key={item.utxo + i}>
              <AssetsItem
                assets_name={assets_name}
                assets_type={assets_type}
                selected={!!sellList.find((i) => i.utxo === item.utxo)}
                canSelect={canSelect}
                onSelect={(bol) => selectHandler(bol, item)}
                item={item}
                delay={i > 5 ? 2000 : 0}
                onTransfer={() => {
                  setType('transfer');
                  sellHandler(item);
                }}
                onSplit={() => onSplit(item)}
                onSell={() => {
                  setType('sell');
                  sellHandler(item);
                }}
                onCancelOrder={() => onCancelOrder(item)}
              />
            </div>
          ))}
        </div>
      </InfiniteScroll>
      {canSelect && (
        <BatchSellFooter
          actionType={type}
          toTransfer={toTransfer}
          toSell={toSell}
          onClose={onBatchClose}
        />
      )}
    </div>
  );
};
