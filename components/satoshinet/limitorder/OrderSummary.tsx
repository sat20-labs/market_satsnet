import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownUp, ChevronDown, ChevronUp } from 'lucide-react';
import { BtcPrice } from '../../BtcPrice';
import Decimal from 'decimal.js';
import {
  calculateLimitOrderValue,
  decimalToSafeInteger,
} from './limitOrderQuote';

interface OrderSummaryProps {
  orderType: string;
  price: string;
  quantity: string;
  serviceFee: string | null;
  balance: { availableAmt: number };
  displayAvailableAmt: number;
  ticker: string;
}

interface BuySummaryData {
  totalVal: string;
  serviceFee: string;
  networkFee: string;
  totalPay: string;
  btcTotal: number | null;
  type: 'buy';
}

interface SellSummaryData {
  totalVal: string;
  totalReceive: string;
  serviceFee: string;
  networkFee: string;
  btcTotal: number | null;
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
    const quote = calculateLimitOrderValue(price, quantity);
    if (!quote?.isAtLeastOneSat || serviceFee === null) {
      return null;
    }

    const totalVal = quote.roundedSats;
    const serviceFeeValue = new Decimal(serviceFee).toFixed(0);
    const networkFee = '10';

    if (orderType === 'buy') {
      const totalPay = new Decimal(totalVal)
        .plus(serviceFeeValue)
        .plus(networkFee)
        .toFixed(0);
      return {
        totalVal,
        serviceFee: serviceFeeValue,
        networkFee,
        totalPay,
        btcTotal: decimalToSafeInteger(totalPay),
        type: 'buy' as const,
      };
    } else {
      const totalReceive = new Decimal(totalVal)
        .minus(serviceFeeValue)
        .minus(networkFee)
        .toFixed(0);
      return {
        totalVal,
        totalReceive,
        serviceFee: serviceFeeValue,
        networkFee,
        type: 'sell' as const,
        btcTotal: decimalToSafeInteger(totalReceive),
      };
    }
  }, [orderType, price, quantity, serviceFee]);

  if (!summaryData) return null;

  return (
    <div className="gap-2 mb-4 bg-zinc-800/50 rounded-lg p-4 text-sm">
      {/* 默认显示预估收入或预估支付 */}
      <p className="flex justify-between font-medium text-gray-400">
        {summaryData.type === 'buy' && <>{t('common.estPay')}</>}
        {summaryData.type === 'sell' && <>{t('common.estReceive')}</>}
        <span className="flex items-center gap-2">
          {summaryData.type === 'buy' && (
            <>
              <span className="font-semibold text-zinc-200 gap-2">
                {summaryData.totalPay}
                <span className="text-zinc-500">
                  {' '}
                  {t('common.sats')}
                  {summaryData.btcTotal !== null && (
                    <>
                      {' '}
                      ($
                      <BtcPrice btc={summaryData.btcTotal / 1e8} /> )
                    </>
                  )}
                </span>
              </span>
            </>
          )}
          {summaryData.type === 'sell' && (
            <>
              <span className="font-semibold text-zinc-300 gap-2">
                {summaryData.totalReceive}{' '}
                <span className="text-zinc-500">
                  {t('common.sats')}
                  {summaryData.btcTotal !== null && (
                    <>
                      {' '}
                      ($
                      <BtcPrice btc={summaryData.btcTotal / 1e8} /> )
                    </>
                  )}
                </span>
              </span>
            </>
          )}

          {/* 向下箭头按钮 */}
          <button
            className="ml-2 text-gray-400 hover:text-white"
            onClick={() => setIsDetailsVisible((prev) => !prev)}
          >
            {isDetailsVisible ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </span>
      </p>

      {/* 详细信息 */}
      {isDetailsVisible && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="flex justify-between font-medium text-zinc-500">
            {t('common.value')}
            <span className="font-semibold text-zinc-400 gap-2">
              {summaryData.totalVal}{' '}
              <span className="text-zinc-500">{t('common.sats')}</span>
            </span>
          </p>
          <p className="flex justify-between font-medium text-zinc-500">
            {t('common.serviceFee')}
            <span className="font-semibold text-zinc-400 gap-2">
              {summaryData.serviceFee}{' '}
              <span className="text-zinc-500">{t('common.sats')}</span>
            </span>
          </p>
          <p className="flex justify-between font-medium text-zinc-500">
            {t('common.networkFee')}
            <span className="font-semibold text-zinc-400 gap-2">
              {summaryData.networkFee}{' '}
              <span className="text-zinc-500">{t('common.sats')}</span>
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderSummary;
