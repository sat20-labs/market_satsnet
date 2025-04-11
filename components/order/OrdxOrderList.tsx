'use client';

import useSWR from 'swr';
import { Switch, Tooltip } from '@nextui-org/react';
import { Empty, notification } from 'antd';
import { getOrders, lockOrder, unlockOrder, cancelOrder } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useEffect, useMemo, useState } from 'react';
import { BatchBuyFooter } from '@/components/BatchBuyFooter';
import { Content } from '@/components/Content';
import { useBuyStore } from '@/store';
import { OrdxFtOrderItem } from '@/components/order/OrdxFtOrderItem';
import { OrderBuyModal } from '@/components/order/OrderBuyModal';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { SortDropdown } from '@/components/SortDropdown';
import { NameCategoryList } from '@/components/market/NameCategoryList';
import { InfiniteScroll } from '@/components/InfiniteScroll';
import { useDebounce, useList } from 'react-use';
import { useCommonStore } from '@/store';

interface OrdxOrderListProps {
  assets_name: string;
  assets_type?: string;
  address?: string;
  showResale?: boolean;
}
export const OrdxOrderList = ({
  assets_name,
  assets_type,
  address,
  showResale = true,
}: OrdxOrderListProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { address: storeAddress, network } = useReactWalletStore(
    (state) => state,
  );
  const {
    list: buyList,
    add: addBuy,
    remove: removeBuy,
    reset,
  } = useBuyStore();
  const { chain } = useCommonStore();
  const [hideStatus, setHideStatus] = useState(false);
  const [canSelect, setCanSelect] = useState(false);
  const [modalVisiable, setModalVisiable] = useState(false);
  const [buyItem, setBuyItem] = useState<any>();
  const [orderRaw, setOrderRaw] = useState<any>();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState(1);
  const [category, setCategory] = useState('');
  const sortList = [
    { label: t('common.not_sort'), value: 0 },
    { label: t('common.sort_unit_price_ascending'), value: 1 },
    { label: t('common.sort_unit_price_descending'), value: 2 },
    { label: t('common.sort_price_ascending'), value: 5 },
    { label: t('common.sort_price_descending'), value: 6 },
    { label: t('common.sort_time_ascending'), value: 3 },
    { label: t('common.sort_time_descending'), value: 4 },
  ];

  const swrKey = useMemo(() => {
    if (address) {
      return `/ordx/getOrders-${assets_name}-${assets_type}-${address}-${chain}-${network}-${page}-${size}-${sort}-${category}`;
    }
    return `/ordx/getOrders-${assets_name}-${assets_type}-${chain}-${network}-${page}-${size}-${sort}-${category}`;
  }, [assets_name, address, page, size, network, sort, assets_type, category, chain]);

  const { data, isLoading, mutate } = useSWR(swrKey, () =>
    getOrders({
      offset: (page - 1) * size,
      size,
      assets_name,
      address,
      sort,
      category,
      assets_type,
      hide_locked: false,
    }),
  );
  const [list, { set, push: pushToList, removeAt, reset: resetList }] =
    useList<any>([]);
  useEffect(() => {
    if (data) {
      const { order_list = [] } = data?.data || {};
      if (page === 1) {
        set(order_list);
      } else {
        pushToList(...order_list);
      }
    }
  }, [data, hideStatus]);

  const selectedSource = useMemo(() => {
    return buyList?.[0]?.order_source || '';
  }, [buyList]);

  const onSortChange = (sort?: number) => {
    if (sort !== undefined) {
      setSort(sort);
    }
  };
  const batchSuccessHandler = () => {
    setCanSelect(false);
    setModalVisiable(false);
    reset();
    mutate(swrKey);
  };

  const onCancelOrder = async (item: any) => {
    if (item.locker === '1') {
      notification.error({
        message: t('notification.order_cancel_failed_title'),
        description: t('notification.order_cancel_failed_description_1'),
      });
      return;
    }
    try {
      const res = await cancelOrder({
        address: address || storeAddress,
        order_id: item.order_id,
      });
      if (res.code === 200) {
        notification.success({
          message: t('notification.order_cancel_success_title'),
          description: t('notification.order_cancel_success_description_1'),
        });
        const index = list.findIndex((i) => i.utxo === item.utxo);
        removeAt(index);
      } else {
        notification.error({
          message: t('notification.order_cancel_failed_title'),
          description: res.msg,
        });
      }
    } catch (error: any) {
      notification.error({
        message: t('notification.order_cancel_failed_title'),
        description: error.msg,
      });
    }
  };
  const buyHandler = async (item) => {
    console.log(item);

    try {
      if (item.locked === 0) {
        addBuy({ ...item, status: 'pending' });
      }
    } catch (error: any) {
      notification.error({
        message: t('notification.lock_order_failed_title'),
        description: error,
      });
    }
  };
  const selectHandler = async (s: boolean, item: any) => {
    if (s) {
      await unlockHandler(item);
      await buyHandler(item);
    } else {
      await unlockHandler(item);
    }
  };
  const unlockHandler = async (item) => {
    try {
      const res = await unlockOrder({
        address: storeAddress,
        order_id: item.order_id,
      });
      if (res.code !== 200) {
        notification.error({
          message: t('notification.order_unlock_failed_title'),
          description: res.msg,
        });
        return;
      }
      removeBuy(item.utxo);
    } catch (error: any) {
      notification.error({
        message: t('notification.order_unlock_failed_title'),
        description: error.message,
      });
    }
  };
  const onBuy = async (item: any) => {
    await buyHandler(item);
    setCanSelect(true);
  };
  const onBuySuccess = () => {
    mutate(swrKey);
  };
  const categoryChange = (c) => {
    reset();
    setPage(1);
    setCanSelect(false);
    resetList();
    setCategory(c);
  };
  const batchCloseHandler = async () => {
    setCanSelect(false);
    const listPromise = buyList.map((item) =>
      unlockOrder({ address: storeAddress, order_id: item.order_id }),
    );
    try {
      const res = await Promise.all(listPromise);
      if (res.some((i) => i.code !== 200)) {
        notification.error({
          message: t('notification.order_unlock_failed_title'),
          description: t('notification.order_cancel_failed_description'),
        });
        return;
      }
      reset();
      setCanSelect(false);
      setModalVisiable(false);
      mutate(swrKey);
    } catch (error: any) {
      notification.error({
        message: t('notification.order_unlock_failed_title'),
        description: error.message,
      });
    }
  };
  const filterList = useMemo(() => {
    if (hideStatus) {
      return list.filter((item) => item.locked === 0);
    } else {
      return list;
    }
  }, [list, hideStatus]);

  const total = useMemo(() => data?.data?.total || 0, [data]);
  const finished = useMemo(() => {
    return list.length >= total;
  }, [total, list]);
  console.log('finished', finished);

  const loadMore = async () => {
    setPage(page + 1);
  };

  useEffect(() => {
    reset();
  }, []);
  return (
    <div className={`${canSelect ? 'pb-20' : ''}`}>
      <Content loading={isLoading}>
        <div className="flex justify-end items-end gap-4 mb-4 flex-wrap">
          {assets_type == 'ns' && (
            <NameCategoryList name={assets_name} onChange={categoryChange} />
          )}
          <div className="flex gap-4 items-center">
            <Switch
              isSelected={hideStatus}
              onValueChange={(e) => setHideStatus(e)}
            >
              Hide Locked
            </Switch>
            <SortDropdown
              sortList={sortList}
              value={sort}
              disabled={!list.length || canSelect}
              onChange={onSortChange}
            ></SortDropdown>
          </div>
        </div>

        <InfiniteScroll
          loading={isLoading}
          loadMore={loadMore}
          hasMore={!finished}
          empty={!list.length}
        >
          <div className="min-h-[30rem] flex flex-wrap justify-center md:gap-8 mb-4 gap-2">
            {filterList.map((item: any, i) => (
              <div key={item.order_id + '_' + i}>
                <OrdxFtOrderItem
                  selectedSource={selectedSource}
                  assets_name={assets_name}
                  assets_type={assets_type}
                  showResale={showResale}
                  canSelect={canSelect}
                  delay={i > 5 ? 2000 : 0}
                  selected={!!buyList.find((i) => i.utxo === item.utxo)}
                  item={item}
                  onCancelOrder={() => onCancelOrder(item)}
                  onSelect={(s) => selectHandler(s, item)}
                  onBuy={() => onBuy(item)}
                />
              </div>
            ))}
          </div>
        </InfiniteScroll>
      </Content>

      {!!orderRaw && (
        <OrderBuyModal
          item={buyItem}
          orderRaw={orderRaw}
          onSuccess={() => onBuySuccess()}
          onClose={() => setModalVisiable(false)}
          visiable={modalVisiable}
        />
      )}
      {canSelect && (
        <BatchBuyFooter
          selectedSource={selectedSource}
          assets_name={assets_name}
          assets_type={assets_type}
          list={filterList}
          onClose={batchCloseHandler}
          onSuccess={batchSuccessHandler}
        />
      )}
    </div>
  );
};
