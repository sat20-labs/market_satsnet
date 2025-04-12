'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Empty, notification } from 'antd';
import { getOrders, cancelOrder } from '@/api';
import { useEffect, useMemo, useState } from 'react';
import { Pagination } from '@/components/Pagination';
import { Content } from '@/components/Content';
import { OrdxFtOrderItem } from '@/components/order/OrdxFtOrderItemBack';
import { useCommonStore } from '@/store';

interface OrdxOrderListProps {
  address?: string;
}
export const OrdxOrderList = ({ address }: OrdxOrderListProps) => {
  const { chain, network } = useCommonStore();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ['ordxOrders', address, chain, network, page, size],
    [address, chain, network, page, size],
  );

  const { data, isLoading } = useQuery({
    queryKey: queryKey,
    queryFn: () => getOrders({ offset: (page - 1) * size, size, address }),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });

  const orderList = useMemo(
    () => data?.data?.order_list ?? [],
    [data],
  );

  const onCancelOrder = async (item: any) => {
    if (item.locker === '1') {
      notification.error({
        message: 'Cancel order failed',
        description: `The order is locked, please wait unlock it first`,
      });
      return;
    }
    try {
      const res = await cancelOrder({ address, order_id: item.order_id });
      if (res.code === 200) {
        notification.success({
          message: 'Cancel order successfully',
          description: `The order has been canceled successfully`,
        });
        queryClient.invalidateQueries({
          queryKey: ['ordxOrders', address, chain, network],
        });
      } else {
        notification.error({
          message: 'Cancel order failed',
          description: res.msg,
        });
      }
    } catch (error) {
        notification.error({
            message: 'Cancel order failed',
            description: error instanceof Error ? error.message : 'Unknown error',
        });
    }
  };

  const totalPages = useMemo(
    () => (data?.data?.total ? Math.ceil(data?.data?.total / size) : 0),
    [data, size],
  );
  return (
    <div className="">
      <Content loading={isLoading}>
        {!isLoading && !orderList.length && <Empty className="mt-10" />}
        <div className="min-h-[30rem] flex flex-wrap justify-center gap-8 mb-4">
          {orderList.map((item: any, i) => (
            <div key={item.utxo}>
              <OrdxFtOrderItem
                item={item}
                delay={i > 5 ? 2000 : 0}
                onCancelOrder={() => onCancelOrder(item)}
              />
            </div>
          ))}
        </div>
      </Content>
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            total={totalPages}
            page={page}
            size={size}
            onChange={(newPage) => {
              setPage(newPage);
            }}
          />
        </div>
      )}
    </div>
  );
};
