'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Empty, notification } from 'antd';
import { getOrders, cancelOrder } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useEffect, useMemo, useState } from 'react';
import { Pagination } from '@/components/Pagination';
import { useCommonStore } from '@/store';
import { useTranslation } from 'react-i18next';
import { useList } from 'react-use';
import { Button } from '@nextui-org/react';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { Icon } from '@iconify/react';
import { BtcPrice } from '../BtcPrice';

interface OrdxOrderListProps {
  address?: string;
}

export const OrdxOrderList = ({ address }: OrdxOrderListProps) => {
  const { chain, network } = useCommonStore();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);

  // SWR Key for caching and fetching
  const swrKey = useMemo(() => {
    if (address) {
      return `/ordx/getOrders-${address}-${chain}-${network}-${page}-${size}`;
    }
    return `/ordx/getOrders-${chain}-${network}-${page}-${size}`;
  }, [address, page, size, network]);

  // Fetch orders using SWR
  const { data, isLoading, mutate } = useSWR(swrKey, () =>
    getOrders({ offset: (page - 1) * size, size, address }),
  );

  // State for the order list
  const [list, { set, reset: resetList, updateAt, removeAt }] = useList<any>(
    [],
  );

  // Mock data for empty results
  const mockData = [
    {
      assets: [
        {
          assets_name: 'RarePizza',
          assets_type: 'ORDX',
          amount: 8000,
          unit_price: 10,
          unit_amount: 1,
        },
      ],
      address: 'mock-address-1',
      time: '2025-04-13 12:00',
    },
    {
      assets: [
        {
          assets_name: 'RarePizza',
          assets_type: 'ORDX',
          amount: 1000,
          unit_price: 12,
          unit_amount: 1,
        },
      ],
      address: 'mock-address-1',
      time: '2025-04-13 12:00',
    },
    {
      assets: [
        {
          assets_name: 'dogcoin',
          assets_type: 'ORDX',
          amount: 500,
          unit_price: 10,
          unit_amount: 1,
        },
      ],
      address: 'mock-address-2',
      time: '2025-04-13 13:00',
    },
    {
      assets: [
        {
          assets_name: 'dogcoin',
          assets_type: 'ORDX',
          amount: 500,
          unit_price: 15,
          unit_amount: 1,
        },
      ],
      address: 'mock-address-2',
      time: '2025-04-13 13:00',
    },
  ];

  // Update the list when data changes
  useEffect(() => {
    if (data && data.data?.order_list?.length > 0) {
      set(data.data.order_list);
    } else {
      // Use mock data if the API returns an empty list
      set(mockData);
    }
  }, [data, set]);

  // Cancel order handler
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

  // Calculate total pages
  const total = useMemo(
    () => (data?.data?.total ? Math.ceil(data?.data?.total / size) : 0),
    [data, size],
  );

// return (
//   <div className="py-4 rounded-xl bg-zinc-800/50 shadow-md">
//     <div className="px-4 overflow-x-auto">
//       {/* 表头 */}
//       <div
//         className="grid text-base font-medium bg-zinc-700/50 text-zinc-400 border-b border-zinc-800 px-4 py-3 rounded-lg shadow-md"
//         style={{
//           gridTemplateColumns: '1.5fr 1fr 1fr 1fr 2fr 1fr 1fr', // 定义每列宽度
//         }}
//       >
//         <div className="sticky left-0 bg-zinc-700/50 z-10">Name</div>
//         <div>Type</div>
//         <div>Quantity</div>
//         <div>Price</div>
//         <div>TotalPrice</div>
//         <div>Time</div>
//         <div className="text-center">Action</div>
//       </div>

//       {/* 资产列表 */}
//       {isLoading ? (
//         <div className="text-center text-zinc-400 py-4">Loading...</div>
//       ) : list.length === 0 ? (
//         <div className="text-center text-zinc-400 py-4">No assets found</div>
//       ) : (
//         list.map((item, index) => {
//           const asset = item?.assets?.[0]; // 假设只取第一个资产
//           const totalBTC = (asset?.unit_price * asset?.amount) / 100000000; // 计算总价（BTC）

//           return (
//             <div
//               key={item.utxo || `mock-${index}`}
//               className="grid grid-cols-7 items-center text-sm text-zinc-300 border-b border-zinc-800 px-4 py-2 hover:bg-zinc-800"
//             >
//               {/* Name */}
//               <div className="sticky left-0 bg-zinc-800 z-10">
//                 <span className="font-medium">{asset?.assets_name || 'N/A'}</span>
//               </div>

//               {/* Type */}
//               <div>
//                 <span className="text-gray-400">{asset?.assets_type || 'N/A'}</span>
//               </div>

//               {/* Quantity */}
//               <div>
//                 <span>{asset?.amount?.toLocaleString() || 0}</span>
//               </div>

//               {/* Price */}
//               <div>
//                 <span className="font-bold">
//                   {(asset?.unit_price / asset?.unit_amount).toFixed(2)}
//                 </span>
//                 <span className="pl-1 font-mono text-zinc-400">sats</span>
//               </div>

//               {/* Total BTC / USD */}
//               <div>
//                 <div className="font-mono text-base text-gray-100">
//                   <span className="font-bold">{totalBTC} </span>
//                   <span className='pl-1 text-zinc-400'>BTC</span> 
//                 </div>
//                 <div className="font-mono text-zinc-400">
//                  $<BtcPrice btc={totalBTC} />
//                 </div>
//               </div>

//               {/* Time */}
//               <div>
//                 <span className="text-gray-400">{item?.time || 'N/A'}</span>
//               </div>

//               {/* Operation */}
//               <div className="text-center">
//                 <WalletConnectBus className="w-full">
//                   <Button
//                     className="text-tiny h-8 btn-gradient"
//                     variant="flat"
//                     radius="sm"
//                     startContent={
//                       item.locked == '1' ? (
//                         <Icon icon="mdi:lock" className="text-lg" />
//                       ) : null
//                     }
//                     onPress={() => onCancelOrder(item)}
//                   >
//                     {t('buttons.remove_sale')}
//                   </Button>
//                 </WalletConnectBus>
//               </div>
//             </div>
//           );
//         })
//       )}
//     </div>

//     {/* 分页 */}
//     {total > 1 && (
//       <div className="flex justify-center mt-4">
//         <Pagination
//           total={total}
//           page={page}
//           size={size}
//           onChange={(offset, size) => {
//             setPage(offset);
//           }}
//         />
//       </div>
//     )}
//   </div>
// );
return (
  <div className="px-0 py-4 rounded-xl bg-zinc-900 shadow-md">
    <div className="px-0 sm:px-4 overflow-x-auto">
      <table className="min-w-full table-auto border-collapse border-b-1 border-zinc-800 rounded-xl">
        {/* 表头 */}
        <thead className="bg-zinc-700 text-zinc-300">
          <tr>
            <th className="sticky bg-zinc-700 left-0 z-10 px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-right">Quantity</th>
            <th className="px-4 py-2 text-right">Price</th>
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
          ) : list.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center text-zinc-400 py-4">
                No assets found
              </td>
            </tr>
          ) : (
            list.map((item, index) => {
              const asset = item?.assets?.[0]; // 假设只取第一个资产
              const totalBTC = (asset?.unit_price * asset?.amount) / 100000000; // 计算总价（BTC）

              return (
                <tr
                  key={item.utxo || `mock-${index}`}
                  className="hover:bg-zinc-900/50 text-zinc-300 border-b border-zinc-800"
                >
                  {/* Name */}
                  <td className="sticky left-0 bg-zinc-900 z-10 px-4 py-2">
                    <span className="font-medium">{asset?.assets_name || 'N/A'}</span>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-2">
                    <span className="text-gray-400">{asset?.assets_type || 'N/A'}</span>
                  </td>

                  {/* Quantity */}
                  <td className="px-4 py-2 text-right">
                    <span>{asset?.amount?.toLocaleString() || 0}</span>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-2 text-right">
                    <span className="font-bold">
                      {(asset?.unit_price / asset?.unit_amount).toFixed(2)}
                    </span>
                    <span className="pl-1 text-zinc-400">sats</span>
                  </td>

                  {/* Total BTC / USD */}
                  <td className="font-mono px-4 py-2 text-right">
                    <div className="text-base text-gray-300">
                      <span className="font-bold">{totalBTC}</span>
                      <span className="pl-1 text-zinc-400">BTC</span>
                    </div>
                    <div className="text-zinc-400">
                      $<BtcPrice btc={totalBTC} />
                    </div>
                  </td>

                  {/* Time */}
                  <td className="px-4 py-2 text-right">
                    <span className="text-gray-400">{item?.time || 'N/A'}</span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-2 text-center">
                    <WalletConnectBus className="w-full">
                      <Button
                        className="text-tiny h-8 btn-gradient"
                        variant="flat"
                        radius="sm"
                        startContent={
                          item.locked == '1' ? (
                            <Icon icon="mdi:lock" className="text-lg" />
                          ) : null
                        }
                        onPress={() => onCancelOrder(item)}
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
    {total > 1 && (
      <div className="flex justify-center mt-4">
        <Pagination
          total={total}
          page={page}
          size={size}
          onChange={(offset, size) => {
            setPage(offset);
          }}
        />
      </div>
    )}
  </div>
);
}
