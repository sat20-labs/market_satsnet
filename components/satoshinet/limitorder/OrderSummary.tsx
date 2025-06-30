import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownUp, ChevronDown, ChevronUp } from 'lucide-react';

interface OrderSummaryProps {
  orderType: string;
  price: string;
  quantity: string;
  serviceFee: number;
  balance: { availableAmt: number };
  displayAvailableAmt: number;
  ticker: string;
}

interface BuySummaryData {
  totalVal: number;
  serviceFee: number;
  networkFee: number;
  totalPay: number;
  type: 'buy';
}

interface SellSummaryData {
  totalVal: number;
  totalReceive: number;
  serviceFee: number;
  networkFee: number;
  type: 'sell';
}

type SummaryData = BuySummaryData | SellSummaryData;

const OrderSummary: React.FC<OrderSummaryProps> = ({
  orderType,
  price,
  quantity,
  serviceFee,
  balance,
  displayAvailableAmt,
  ticker,
}) => {
  const { t } = useTranslation();
  const [isDetailsVisible, setIsDetailsVisible] = useState(false); // 控制详细信息显示状态

  const summaryData = useMemo<SummaryData | null>(() => {
    const priceNum = Number(price);
    const quantityNum = Number(quantity);
    if (isNaN(priceNum) || isNaN(quantityNum) || priceNum <= 0 || quantityNum <= 0) {
      return null;
    }

    const totalVal = Math.ceil(quantityNum * priceNum);
    const networkFee = 10;

    if (orderType === 'buy') {
      const totalPay = totalVal + serviceFee + networkFee;
      return {
        totalVal,
        serviceFee,
        networkFee,
        totalPay,
        type: 'buy' as const,
      };
    } else {
      const totalReceive = totalVal - serviceFee - networkFee;
      return {        
        totalVal,
        totalReceive,
        serviceFee,
        networkFee,
        type: 'sell' as const,
      };
    }
  }, [orderType, price, quantity, serviceFee]);

  if (!summaryData) return null;

  return (
    <div className="gap-2 mb-4 bg-zinc-800/50 rounded-lg p-4 text-sm">
      {/* 默认显示预估收入或预估支付 */}
      <p className="flex justify-between font-medium text-gray-400">
        {summaryData.type === 'buy' && (
          <>
            {t('common.estPay')}

          </>
        )}
        {summaryData.type === 'sell' && (
          <>
            {t('common.estReceive')}
          </>
        )}
        <span className="flex items-center gap-2">
          {summaryData.type === 'buy' && (
            <>
              <span className="font-semibold text-zinc-200 gap-2">
                {summaryData.totalPay.toLocaleString()} {t('common.sats')}
              </span>
            </>
          )}
          {summaryData.type === 'sell' && (
            <>
              <span className="font-semibold text-zinc-300 gap-2">
                {summaryData.totalReceive.toLocaleString()} <span className="text-zinc-500">{t('common.sats')}</span>
              </span>
            </>
          )}

          {/* 向下箭头按钮 */}
          <button
            className="ml-2 text-gray-400 hover:text-white"
            onClick={() => setIsDetailsVisible((prev) => !prev)}
          >
            {isDetailsVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </span>
      </p>

      {/* 详细信息 */}
      {isDetailsVisible && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="flex justify-between font-medium text-zinc-500">
            {t('common.value')}
            <span className="font-semibold text-zinc-400 gap-2">
              {summaryData.totalVal.toLocaleString()} <span className="text-zinc-500">{t('common.sats')}</span>
            </span>
          </p>
          <p className="flex justify-between font-medium text-zinc-500">
            {t('common.serviceFee')}
            <span className="font-semibold text-zinc-400 gap-2">
              {summaryData.serviceFee.toLocaleString()} <span className="text-zinc-500">{t('common.sats')}</span>
            </span>
          </p>
          <p className="flex justify-between font-medium text-zinc-500">
            {t('common.networkFee')}
            <span className="font-semibold text-zinc-400 gap-2">
              {summaryData.networkFee.toLocaleString()} <span className="text-zinc-500">{t('common.sats')}</span>
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderSummary; 