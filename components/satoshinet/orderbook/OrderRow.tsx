import React from "react";
import { MarketOrder } from "./TakeOrder";

interface OrderRowProps {
  order: MarketOrder;
  selected: boolean;
  onClick: () => void;
}

const OrderRow = ({ order, selected, onClick }: OrderRowProps) => {
    const quantity = parseInt(order.assets?.amount ?? '0', 10);
    const priceInSats = order.price;
    console.log(priceInSats);
    const unitPrice = order.assets?.unit_price;
    const totalBTC = order.value;
    
    return (
        <div
            className={`grid grid-cols-3 items-center text-xs px-3 w-full py-3 border-b-1 border-zinc-800 cursor-pointer transition ${selected 
                ? "bg-gray-800/60 text-zinc-200" : 
                "bg-transparent hover:bg-gray-800"}`}
            onClick={onClick}
        >
            <div className="ml-1">
                <input 
                    type="checkbox" 
                    checked={selected} 
                    readOnly 
                    className="form-checkbox h-4 w-4 mr-2 mx-auto text-zinc-600" 
                />
                {quantity.toLocaleString()}             
            </div>
            
            <div className="flex-1 justify-items-end">
                {unitPrice.toLocaleString()} <span className="text-zinc-400">sats</span>
            </div>
            <div className="flex-1 text-left text-zinc-200">
                <div>
                    {priceInSats}<span className="text-zinc-400"> sats</span>
                </div>
            </div>
        </div>
    );
};
  
export default OrderRow;

  
