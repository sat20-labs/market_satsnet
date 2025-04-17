import React from "react";
import { MarketOrder } from "./TakeOrder";

interface OrderRowProps {
  order: MarketOrder;
  selected: boolean;
  onClick: () => void;
  currentWalletAddress: string; // 新增参数
}

const OrderRow = ({ order, selected, onClick, currentWalletAddress }: OrderRowProps) => {
    const quantity = parseInt(order.assets?.amount ?? '0', 10);
    const priceInSats = order.price;    //
    console.log(priceInSats);
    const unitPrice = order.assets?.unit_price;
    
    const address = order.address || '';
    // 判断是否是用户自己的挂单
    const isOwnOrder = address === currentWalletAddress;
    console.log("address:", address, 'currentWalletAddress:',currentWalletAddress, 'isOwnOrder:',isOwnOrder);

    const totalBTC = order.value;
    
    return (
        <div
            className={`grid grid-cols-3 items-center text-xs px-3 w-full py-3 border-b-1 border-zinc-800 cursor-pointer transition ${
                selected && !isOwnOrder
                ? "bg-gray-800/60 text-zinc-200"
                : "bg-transparent hover:bg-gray-800"
            } ${isOwnOrder ? "text-zinc-400 cursor-not-allowed" : ""}`}
                onClick={!isOwnOrder ? onClick : undefined} // 禁用点击事件
        >
            <div className="ml-1">
                <input 
                    type="checkbox" 
                    checked={selected} 
                    readOnly 
                    disabled={isOwnOrder} // 禁用复选框
                    className="form-checkbox h-4 w-4 mr-2 mx-auto text-zinc-600 " 
                />
                {quantity.toLocaleString()} <span className="text-red-400">{isOwnOrder ? "(my)" : ''} </span>       
            </div>
            
            <div className="flex-1 justify-items-end">
                {unitPrice.toLocaleString()} <span className="text-zinc-400">sats</span>
            </div>
            <div className="flex-1 text-left">
                <div>
                    {priceInSats}<span className="text-zinc-400"> sats</span>
                </div>
            </div>
        </div>
    );
};
  
export default OrderRow;

  
