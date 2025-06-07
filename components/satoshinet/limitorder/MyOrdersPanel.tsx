import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";

const getMyContractStatus = async (contractURL: string, address: string) => {
  const { status } = await window.sat20.getAddressStatusInContract(contractURL, address);
  return JSON.parse(status);
}
interface MyOrdersPanelProps {
  contractURL: string;
}
export default function MyOrdersPanel({
  contractURL,
}: MyOrdersPanelProps) {
  const statusColor = {
    open: "bg-blue-500 text-blue-700 border-blue-400",
    partially_filled: "bg-yellow-500 text-yellow-800 border-yellow-400",
    filled: "bg-green-500 text-green-700 border-green-400",
    cancelled: "bg-gray-600 text-gray-500 border-gray-400",
    expired: "bg-red-500 text-red-700 border-red-400",
  };
  const { address } = useReactWalletStore();
  const { data: myOrdersStatus = [], isLoading } = useQuery({
    queryKey: ['myOrdersStatus', contractURL, address],
    queryFn: () => getMyContractStatus(contractURL, address),
  });
  console.log('myOrdersStatus', myOrdersStatus);

  return (
    <ScrollArea>
      <div className="flex flex-wrap md:flex-nowrap justify-between text-sm font-bold border-b py-1 text-gray-600">
        <span className="w-16 text-center">Side</span>
        <span className="w-20 text-center">Price</span>
        <span className="w-20 text-center">Quantity</span>
        <span className="w-24 text-center">Status</span>
      </div>
      {/* {myOrders.map((order, i) => (
        <div key={i} className="flex flex-wrap md:flex-nowrap justify-between text-sm border-b py-1 items-center gap-2">
          <span className={`w-16 text-center font-bold ${order.side === "buy" ? "text-green-600" : "text-red-500"}`}>{order.side}</span>
          <span className="w-20 text-center">{order.price}</span>
          <span className="w-20 text-center">{order.quantity}</span>
          <span className="w-24 flex justify-center">
            <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${statusColor[order.status] || "bg-gray-700 text-gray-500 border-gray-500 "}`}
              title={order.status}>
              {order.status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          </span>
        </div>
      ))} */}
    </ScrollArea>
  );
} 