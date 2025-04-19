import React from "react";
import { MarketOrder } from "./TakeOrder";
import { Icon } from '@iconify/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


interface OrderRowProps {
  order: MarketOrder;
  selected: boolean;
  onClick: () => void;
  currentWalletAddress: string;
  isLocked?: boolean;
  isProcessingLock?: boolean;
}

const OrderRow = React.memo(function OrderRow({
    order,
    selected,
    onClick,
    currentWalletAddress,
    isLocked = false,
    isProcessingLock = false,
  }: OrderRowProps) {
    const quantity = parseInt(order.assets?.amount ?? '0', 10);
    const priceInSats = order.price;    //
    const unitPrice = order.assets?.unit_price;
    
    const address = order.address || '';
    // 判断是否是用户自己的挂单
    const isOwnOrder = address === currentWalletAddress;
    //console.log("address:", address, 'currentWalletAddress:',currentWalletAddress, 'isOwnOrder:',isOwnOrder);

    const isLockedByOthers = order.locked === 1 && !isLocked;
    const isDisabled = isOwnOrder || isLockedByOthers;

    // 获取禁用原因（用于tooltip显示）
    const getDisabledReason = () => {
        if (isOwnOrder) return "这是您自己的订单";
        if (isLockedByOthers) return "此订单已被其他用户锁定";
        return "";
    };

    const disabledReason = getDisabledReason();
    
    return (
        <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`grid grid-cols-3 text-xs px-3 w-full py-3 border-b-1 border-zinc-800 cursor-pointer transition relative
                ${selected && !isDisabled ? "bg-gray-800/60 text-zinc-200" : "bg-transparent hover:bg-gray-800"}
                ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-700/20' : ''} 
                ${isProcessingLock ? 'animate-pulse' : ''}`}
              onClick={isDisabled ? undefined : onClick}
            >
              <div className="ml-1 flex items-center text-left justify-start w-full">
                <input
                  type="checkbox"
                  checked={selected}
                  readOnly
                  disabled={isDisabled}
                  className="form-checkbox h-4 w-4 mr-2 text-zinc-600"
                />
                {quantity.toLocaleString()}
                {isOwnOrder && <span className="text-red-400">(my)</span>}
                {isLockedByOthers && <span className="text-yellow-400">(locked)</span>}
              </div>
              <div className="flex-1">
                {unitPrice.toLocaleString()} <span className="text-zinc-400">sats</span>
              </div>
              <div className="flex-1 text-left">
                <div>
                  {priceInSats}<span className="text-zinc-400"> sats</span>
                </div>
              </div>
              {(isLocked || isLockedByOthers) && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <Icon
                    icon="mdi:lock"
                    className={`w-4 h-4 ${isLocked ? 'text-blue-500' : 'text-yellow-500'}`}
                  />
                </div>
              )}
            </div>
          </TooltipTrigger>
          {disabledReason && (
            <TooltipContent>
              <p>{disabledReason}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
});
  
export default OrderRow;


