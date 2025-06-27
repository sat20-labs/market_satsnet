import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { DepthItem } from './DepthList';

interface QuickPriceButtonsProps {
  price: string;
  setPrice: (v: string) => void;
  sellDepth: DepthItem[];
  buyDepth: DepthItem[];
}

const QuickPriceButtons: React.FC<QuickPriceButtonsProps> = ({
  price,
  setPrice,
  sellDepth,
  buyDepth,
}) => {
  // 计算最低卖价、最高买价、中间价
  const { lowestAsk, topBid, mid } = useMemo(() => {
    const validSell = sellDepth?.filter((d) => d.price > 0);
    const validBuy = buyDepth?.filter((d) => d.price > 0);
    const lowestAsk = validSell?.length ? validSell[validSell.length - 1].price : undefined;
    const topBid = validBuy?.length ? validBuy[0].price : undefined;
    const mid =
      lowestAsk !== undefined && topBid !== undefined
        ? (lowestAsk + topBid) / 2
        : undefined;
    return {
      lowestAsk: lowestAsk !== undefined ? Number(lowestAsk.toFixed(10)) : undefined,
      topBid: topBid !== undefined ? Number(topBid.toFixed(10)) : undefined,
      mid: mid !== undefined ? Number(mid.toFixed(10)) : undefined,
    };
  }, [sellDepth, buyDepth]);

  const { t } = useTranslation();
  
  // 按钮配置
  const buttons = [
    {
      label: t('common.limitorder_lowest'),
      value: lowestAsk,
      onClick: () => lowestAsk !== undefined && setPrice(String(lowestAsk)),
      selected: price === String(lowestAsk),
      disabled: lowestAsk === undefined,
    },
    {
      label: t('common.limitorder_mid'),
      value: mid,
      onClick: () => mid !== undefined && setPrice(String(mid)),
      selected: price === String(mid),
      disabled: mid === undefined,
    },
    {
      label: t('common.limitorder_topbid'),
      value: topBid,
      onClick: () => topBid !== undefined && setPrice(String(topBid)),
      selected: price === String(topBid),
      disabled: topBid === undefined,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-2">
      {buttons.map((btn) => (
        <Button
          key={btn.label}
          type="button"
          variant="outline"
          className={`flex flex-col items-center justify-center text-xs h-16 ${btn.selected ? "btn-gradient" : "bg-gray-700"}`}
          size="sm"
          onClick={btn.onClick}
          disabled={btn.disabled}
        >
          {btn.label}
          <span className="ml-1 text-xs text-gray-400">
            {btn.value !== undefined ? btn.value : "--"}
          </span>
        </Button>
      ))}
    </div>
  );
};

export default QuickPriceButtons; 