import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Order {
  side: string;
  price: number;
  quantity: number;
  status: string;
  rawData: OrderData;
}

interface OrderData {
  Version: number;
  Id: number;
  OrderType: number;
  OrderTime: number;
  AssetName: string;
  UnitPrice: {
    Precision: number;
    Value: number;
  };
  Address: string;
  FromL1: boolean;
  InUtxo: string;
  InValue: number;
  InAmt: {
    Precision: number;
    Value: number;
  };
  RemainingAmt: {
    Precision: number;
    Value: number;
  };
  RemainingValue: number;
  OutTxId: string;
  OutAmt: {
    Precision: number;
    Value: number;
  };
  OutValue: number;
  Valid: boolean;
  Done: boolean;
}

interface OrderResponse {
  total: number;
  start: number;
  data: OrderData[];
}

const getMyContractStatus = async (contractURL: string, address: string, pageStart: number = 0, pageLimit: number = 20): Promise<OrderData[]> => {
  try {
    const result = await window.sat20.getContractInvokeHistoryByAddressInServer(contractURL, address, pageStart, pageLimit);

    if (!result?.history) return [];

    const parsedHistory = JSON.parse(result.history) as OrderResponse;
    console.log('parsedHistory', parsedHistory);
    return parsedHistory.data;
  } catch (e) {
    console.error('Error fetching orders:', e);
    return [];
  }
}

interface MyOrdersPanelProps {
  contractURL: string;
  tickerInfo: any;
  assetInfo: any;
}

export default function MyOrdersPanel({
  contractURL,
  tickerInfo,
  assetInfo,
}: MyOrdersPanelProps) {
  const statusColor = {
    open: "bg-blue-500 text-blue-700 border-blue-400",
    partially_filled: "bg-yellow-500 text-yellow-800 border-yellow-400",
    filled: "bg-green-500 text-green-700 border-green-400",
    cancelled: "bg-gray-600 text-gray-500 border-gray-400",
    expired: "bg-red-500 text-red-700 border-red-400",
  };

  const { address } = useReactWalletStore();
  const queryClient = useQueryClient();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['myOrdersStatus', contractURL, address],
    queryFn: ({ pageParam = 0 }) => getMyContractStatus(contractURL, address, pageParam * 20, 20),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    refetchInterval: 20000,
  });
  console.log('data', data);
  const mapOrderData = (orderData: OrderData): Order => ({
    side: orderData.OrderType === 2 ? "buy" : "sell",
    price: (orderData.UnitPrice.Value / Math.pow(10, orderData.UnitPrice.Precision)),
    quantity: (orderData.InValue / Math.pow(10, orderData.InAmt.Precision)),
    status: orderData.Done ? "filled" : "open",
    rawData: orderData
  });

  const allOrders = data?.pages.flat().map(mapOrderData) ?? [];

  const cancelOrder = async (order: Order) => {
    const params = {
      action: 'refund',
    };

    const _asset = order.rawData.OrderType === 2 ? '::' : assetInfo.assetName;
    const result = await window.sat20.invokeContractV2_SatsNet(
      contractURL, JSON.stringify(params), _asset, Math.ceil(order.price * order.quantity).toString(),
      order.price, order.quantity, 0, '1');
    console.log('result', result);
    if (result.txId) {
      toast.success(`Order cancelled successfully, txid: ${result.txId}`);
      queryClient.invalidateQueries({ queryKey: ['myOrdersStatus', contractURL, address] });
      return;
    } else {
      toast.error('Order cancellation failed');
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading orders...</div>;
  }

  if (allOrders.length === 0) {
    return <div className="text-center py-4 text-gray-500">No orders found</div>;
  }

  return (
    <div className="max-w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">Side</TableHead>
            <TableHead className="text-center">Price</TableHead>
            <TableHead className="text-center">Quantity</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allOrders.map((order, i) => (
            <TableRow
              key={`${order.rawData.Id}-${i}`}
            >
              <TableCell className={`text-center font-bold ${order.side === "buy" ? "text-green-600" : "text-red-500"}`}>
                {order.side}
              </TableCell>
              <TableCell className="text-center">{order.price}</TableCell>
              <TableCell className="text-center">{order.quantity}</TableCell>
              <TableCell className="text-center">
                <span
                  className={`px-2 py-0.5 rounded border text-xs font-semibold ${statusColor[order.status] || "bg-gray-700 text-gray-500 border-gray-500"}`}
                  title={order.status}
                >
                  {order.status}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelOrder(order)}
                  disabled={order.status === "filled"}
                >
                  Cancel
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasNextPage && (
        <div className="text-center py-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading more...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
} 