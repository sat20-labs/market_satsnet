import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface DepthItem {
  price: number;
  quantity: number;
  totalValue: number;
}

interface DepthListProps {
  depth: DepthItem[];
  type: 'buy' | 'sell';
  maxQtyLen: number;
  onRowClick: (type: string, price: number, quantity: number) => void; // 添加回调函数
}

const DepthList: React.FC<DepthListProps> = React.memo(({ depth, type, maxQtyLen, onRowClick }) => {
  const isSell = type === 'sell';
  const { t } = useTranslation();

  const depthWithCumulative = useMemo(() => {
    const processedDepth = depth.map((order, i, arr) => {
      const cumQty = isSell
        ? arr.slice(i).reduce((sum, o) => sum + o.quantity, 0)
        : arr.slice(0, i + 1).reduce((sum, o) => sum + o.quantity, 0);
      const maxCumQty = arr.reduce((sum, o) => sum + o.quantity, 0);
      const widthPercent = maxCumQty ? (cumQty / maxCumQty) * 100 : 0;
      return { ...order, cumQty, widthPercent };
    });
    return isSell ? processedDepth.reverse() : processedDepth;
  }, [depth, isSell]);

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 font-semibold px-1 pb-1">
        <span className="w-1/3">{t('common.limitorder_price')}</span>
        <span className='mr-4'>{t('common.limitorder_quantity')}</span>
        <span>{t('common.limitorder_total')}</span> 
      </div>
      <div className={`h-48 overflow-y-auto ${isSell ? 'flex flex-col-reverse' : ''}`}>
        {depthWithCumulative.map((order, i) => (
          <div 
            key={`${order.price}-${i}`}
            className={`relative flex justify-between text-${isSell ? 'red' : 'green'}-500 text-sm px-1 py-0.5 cursor-pointer hover:bg-zinc-800`} // 添加 hover 样式
            role="row"
            aria-label={`${type} order at price ${order.price}`}
            onClick={() => onRowClick(type, order.price, order.quantity)} // 绑定点击事件
          >
            <div
              className="absolute left-0 top-0 h-full z-0"
              style={{
                width: `${order.widthPercent}%`,
                background: isSell ? "rgba(188,2,215,0.1)" : "rgba(1,185,22,0.1)",
              }}
              aria-hidden="true"
            />
            <span className="relative z-10 w-1/3">{order.price}</span>
            <span 
              className="relative z-10" 
              style={{ minWidth: maxQtyLen + "ch", textAlign: "right" }}
            >
              {order.quantity}
            </span>
            <span 
              className="relative z-10" 
              style={{ minWidth: "8ch", textAlign: "right" }}
            >
              {(order.totalValue / 100_000_000).toFixed(8)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

DepthList.displayName = 'DepthList';

export default DepthList; 