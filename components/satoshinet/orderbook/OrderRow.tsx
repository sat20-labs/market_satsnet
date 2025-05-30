import React from "react";
import { MarketOrder } from "./TakeOrder";
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
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
  currentWalletAddress?: string;
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
  const { t } = useTranslation();
  const quantity = parseInt(order.assets?.amount ?? '0', 10);
  const priceInSats = order.price;
  const unitPrice = order.assets?.unit_price;

  const address = order.address || '';
  // 判断是否是用户自己的挂单
  const isOwnOrder = address === currentWalletAddress;

  const totalBTC = order.value;
  
  // 判断订单是否被锁定且不是当前用户锁定的
  const isLockedByOthers = order.locked === 1 && !isLocked;

  // 订单在以下情况下不可选：
  // 1. 是用户自己的订单
  // 2. 订单被其他用户锁定（locked=1 且不是当前用户锁定的）
  const isDisabled = isOwnOrder || isLockedByOthers;

  // 获取禁用原因（用于 tooltip 显示）
  const getDisabledReason = () => {
    if (isOwnOrder) return "Your own order.";
    if (isLockedByOthers) return "Locked by another user.";
    return "";
  };

  const disabledReason = getDisabledReason();
  // console.log(`OrderRow - order_id: ${order.order_id}, isLocked: ${isLocked}, selected: ${selected}`);


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
                  className={`w-4 h-4 lock-icon ${isLocked ? 'text-blue-500 visible' : 'text-yellow-500'}`}
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