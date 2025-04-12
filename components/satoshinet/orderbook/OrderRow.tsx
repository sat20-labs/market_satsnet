import React from "react";

const OrderRow = ({ order, selected, onClick }: { order: any; selected: boolean; onClick: () => void }) => {
    return (
        <div
            className={`grid grid-cols-3 items-center text-xs px-3 w-full py-3 border-b-1 border-zinc-800 cursor-pointer transition ${selected 
                ? "bg-gray-800/60 text-zinc-200" : 
                "bg-transparent hover:bg-gray-800"}`}
            onClick={onClick}
        >
            <div className="ml-1">
                <input type="checkbox" checked={selected} readOnly className="form-checkbox h-4 w-4 mr-2  mx-auto text-zinc-600" />{order.quantity.toLocaleString()}             
            </div>
            
            <div className="flex-1 justify-items-end">{order.price.toFixed(10)} BTC</div>
            <div className="flex-1 justify-items-end">{order.totalBTC} BTC</div>
        </div>

      
    );
  };
  
  export default OrderRow;

  
