import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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
      return {
        totalVal,
        serviceFee,
        networkFee,
        type: 'sell' as const,
      };
    }
  }, [orderType, price, quantity, serviceFee]);

  if (!summaryData) return null;

  return (
    <div className="gap-2 mb-4 bg-zinc-800/50 rounded-lg p-4 min-h-[100px] text-sm">
      <p className="flex justify-between gap-1 text-gray-400">
        <span>{t('common.availableBalance')} </span>
        <span className="gap-1">
          {orderType === 'buy'
            ? `${balance.availableAmt} ${t('common.sats')}`
            : `${displayAvailableAmt} ${ticker}`
          }
        </span>
      </p>

      <div className="mt-4 pt-4 border-t border-zinc-800">
        <p className="flex justify-between font-medium text-gray-400">
          {t('common.value')}
          <span className="font-semibold text-zinc-200 gap-2">
            {summaryData.totalVal.toLocaleString()} {t('common.sats')}
          </span>
        </p>
        <p className="flex justify-between font-medium text-gray-400">
          {t('common.serviceFee')} 
          <span className="font-semibold text-zinc-200 gap-2">
            {summaryData.serviceFee.toLocaleString()} {t('common.sats')}
          </span>
        </p>
        <p className="flex justify-between font-medium text-gray-400">
          {t('common.networkFee')} 
          <span className="font-semibold text-zinc-200 gap-2">
            {summaryData.networkFee.toLocaleString()} {t('common.sats')}
          </span>
        </p>
        {summaryData.type === 'buy' && (
          <p className="flex justify-between font-medium text-gray-400">
            {t('common.estPay')}
            <span className="font-semibold text-zinc-200 gap-2">
              {summaryData.totalPay.toLocaleString()} {t('common.sats')}
            </span>
          </p>
        )}
      </div>
    </div>
  );
};

export default OrderSummary; 