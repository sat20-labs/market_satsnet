'use client';

import { getOrders, cancelOrder } from '@/api';
import { marketApi } from '@/api';
import { useEffect, useMemo, useState } from 'react';
import { Pagination } from '@/components/Pagination';
import { useCommonStore } from '@/store';
import { useTranslation } from 'react-i18next';
import { useList } from 'react-use';

import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { toast } from 'sonner';
import { BtcPrice } from '../BtcPrice';
import useSWR from 'swr';
import { Button } from "@/components/ui/button"; 
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { CustomPagination } from "@/components/ui/CustomPagination";
import { Content } from '@/components/Content';

interface OrdxOrderListProps {
  address?: string;
}

export const OrdxOrderList = ({ address }: OrdxOrderListProps) => {
  const { t } = useTranslation();
  const { chain, network } = useCommonStore();
  const { address: storeAddress } = useReactWalletStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZES = [10, 20, 50, 100];
  

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await marketApi.getOrders({
          address: storeAddress || address,
          offset: (page - 1) * pageSize,
          size: pageSize,
        });
        setOrders(response.data.order_list || []);
        setTotalCount(response.data.total || 0); // 确保 totalCount 正确设置
      } catch (err) {
        setError('Failed to fetch orders');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [storeAddress, address, page]);

  const onCancelOrder = async (item: any) => {
    if (item.locker === '1') {
      toast.error('Cancel order failed, The order is locked, please wait unlock it first');
      return;
    }
    try {
      const res = await marketApi.cancelOrder({ address: storeAddress || address, order_id: item.order_id });
      if (res.code === 200) {
        toast.success('Cancel order successfully!');
        // 从订单列表中移除已取消的订单
        setOrders(prevOrders => prevOrders.filter(order => order.order_id !== item.order_id));
      } else {
        toast.error('Cancel order failed');
      }
    } catch (error) {
      toast.error('Cancel order failed');
      console.error(error);
    }
  };

  const totalPages = useMemo(() => {
    if (totalCount === 0) return 1;
    return Math.ceil(totalCount / pageSize);
  }, [totalCount, pageSize]);



  // const handleRefresh = () => {
  //   orders.refetch();
  // };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="px-0 py-4 bg-zinc-900/50 rounded-xl shadow-md">
      <div className="px-0 sm:px-4 overflow-x-auto">
        <table className="min-w-full table-auto border-collapse border-b-1 border-zinc-800 rounded-xl">
          {/* 表头 */}
          <thead className="bg-zinc-800 text-zinc-400">
            <tr>
              <th className="sticky bg-zinc-800 left-0 h-12 z-10 px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-right">Quantity</th>
              <th className="px-4 py-2 text-right">Unit Price</th>
              <th className="px-4 py-2 text-right">Total Price</th>
              <th className="px-4 py-2 text-right">Time</th>
              <th className="px-4 py-2 text-center">Action</th>
            </tr>
          </thead>

          {/* 表体 */}
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center text-zinc-400 py-4">
                  Loading...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-zinc-400 py-4">
                  No assets found
                </td>
              </tr>
            ) : (
              orders.map((order, index) => {
                // const asset = item?.assets?.[0]; // 假设只取第一个资产
                // const totalBTC = (asset?.unit_price * asset?.amount) / 100000000; // 计算总价（BTC）

                return (
                  <tr
                    key={order.order_id || `mock-${index}`}
                    className="group text-zinc-400 border-b-1 bg-zinc-900 hover:bg-zinc-800/95 border-zinc-800"
                  >
                    {/* Name */}
                    <td className="sticky left-0 z-10 px-4 py-2 ">
                      <span className="font-medium">{order.assets.assets_name.Ticker || 'N/A'}</span>
                      <div className="absolute inset-0 bg-zinc-900 group-hover:bg-zinc-800/95 z-[-1]"></div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-2">
                      <span className="text-gray-400">{order.assets.assets_name.Protocol || 'N/A'}</span>
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-2 text-right">
                      <span>{order.assets.amount?.toLocaleString()  || 0}</span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-2 text-right">
                      <span className="font-bold">
                        {order.assets.unit_price}
                      </span>
                      <span className="pl-1 text-zinc-400">sats</span>
                    </td>

                    {/* Total BTC / USD */}
                    <td className="font-mono px-4 py-2 text-right">
                      <div className="text-lg text-gray-400">
                        <span className="font-bold">{order.price?.toLocaleString() || 0}</span>
                        <span className="pl-1 text-zinc-400">sats</span>
                      </div>
                      <div className="text-zinc-400">
                        $<BtcPrice btc={order?.price/100000000} />
                      </div>
                    </td>

                    {/* Time */}
                    <td className="px-4 py-2 text-right">
                      <span className="text-gray-400">{order.order_time ? new Date(order.order_time).toLocaleString() : 'N/A'}</span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-2 text-center">
                      <WalletConnectBus className="w-full">
                        <Button
                          className="text-tiny h-8"
                          size='lg'
                          color='default'
                          variant="outline"
                          onClick={() => onCancelOrder(order)}
                        >
                          {t('buttons.remove_sale')}
                        </Button>
                      </WalletConnectBus>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}

      {totalCount > 0 && (
        <div className="my-2 px-1 sm:px-4">
              <CustomPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                availablePageSizes={PAGE_SIZES}
                isLoading={isLoading}
              />
               </div>
            )}
      
    </div>
  );
};

