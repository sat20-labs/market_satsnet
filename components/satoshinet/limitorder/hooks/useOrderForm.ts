import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { contractService } from '@/domain/services/contract';
import { useCommonStore } from '@/store/common';
import { getWalletAdapter } from '@/lib/walletAdapter';
import { calculateLimitOrderValue } from '../limitOrderQuote';
import Decimal from 'decimal.js';

interface OrderFormState {
  orderType: string;
  price: string;
  quantity: string;
  isPlacingOrder: boolean;
  showConfirm: boolean;
  confirmData: {
    paySats: string;
    bidPrice: string;
    feeSats: string;
    netFeeSats: string;
    walletSats: string;
    value: string;
    quoteIdentity: string;
  };
}

interface UseOrderFormProps {
  asset: string;
  ticker: string;
  contractURL: string;
  balance: { availableAmt: number };
  displayAvailableAmt: number;
  divisibility: number;
  satsnetHeight: number;
  depthData: any;
  onOrderSuccess?: () => void;
}

export const useOrderForm = ({
  asset,
  ticker,
  contractURL,
  balance,
  displayAvailableAmt,
  divisibility,
  satsnetHeight,
  depthData,
  onOrderSuccess,
}: UseOrderFormProps) => {
  const { t } = useTranslation();
  const { btcFeeRate, network } = useCommonStore((state) => state);
  const [state, setState] = useState<OrderFormState>({
    orderType: 'buy',
    price: '',
    quantity: '',
    isPlacingOrder: false,
    showConfirm: false,
    confirmData: {
      paySats: '',
      bidPrice: '',
      feeSats: '',
      netFeeSats: '',
      walletSats: '',
      value: '',
      quoteIdentity: '',
    },
  });

  const updateState = useCallback((updates: Partial<OrderFormState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // 处理数量输入，限制小数位数
  const handleQuantityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      // 如果 divisibility 为 0，不允许输入小数点
      if (divisibility === 0) {
        const intValue = parseInt(value) || '';
        updateState({ quantity: intValue.toString() });
        return;
      }

      // 检查小数位数
      const parts = value.split('.');
      if (parts.length === 2 && parts[1].length > divisibility) {
        return;
      }

      updateState({ quantity: value });
    },
    [divisibility, updateState],
  );

  // 格式化数量，去除多余小数位
  const formatQuantity = useCallback(
    (value: string): string => {
      try {
        const quantity = new Decimal(value);
        if (!quantity.isFinite() || quantity.lte(0)) return '';
        return quantity
          .toDecimalPlaces(divisibility, Decimal.ROUND_DOWN)
          .toString();
      } catch {
        return '';
      }
    },
    [divisibility],
  );

  // 获取服务费
  const getFee = useCallback(
    async (orderType: string, priceValue: string, quantityValue: string) => {
      if (!priceValue || !quantityValue) return '0';

      const params = {
        action: 'swap',
        param: JSON.stringify({
          orderType: orderType === 'buy' ? 2 : 1,
          assetName: asset,
          amt: quantityValue,
          unitPrice: priceValue,
        }),
      };

      try {
        const fee = await contractService.getFeeForInvokeContract(
          contractURL,
          JSON.stringify(params),
        );
        const parsedFee = new Decimal(String(fee));
        if (
          !parsedFee.isFinite() ||
          parsedFee.lt(0) ||
          !parsedFee.isInteger()
        ) {
          throw new Error('Invalid service fee');
        }
        return parsedFee.toFixed(0);
      } catch (error) {
        console.error('Failed to get fee:', error);
        throw error;
      }
    },
    [asset, contractURL],
  );

  const normalizedPrice = (() => {
    try {
      const price = new Decimal(state.price);
      return price.isFinite() && price.gt(0) ? price.toString() : '';
    } catch {
      return '';
    }
  })();
  const normalizedQuantity = formatQuantity(state.quantity);
  const quoteIdentity = JSON.stringify([
    network,
    contractURL,
    asset,
    divisibility,
    state.orderType,
    normalizedPrice,
    normalizedQuantity,
  ]);

  // 使用 React Query 获取服务费
  const {
    data: queriedServiceFee,
    error: serviceFeeError,
    isFetching: isServiceFeeFetching,
  } = useQuery({
    queryKey: [
      'serviceFee',
      network,
      contractURL,
      asset,
      divisibility,
      state.orderType,
      normalizedPrice,
      normalizedQuantity,
    ],
    queryFn: () => getFee(state.orderType, normalizedPrice, normalizedQuantity),
    enabled: Boolean(normalizedPrice) && Boolean(normalizedQuantity),
  });
  const serviceFee = queriedServiceFee ?? null;

  const handleSubmitClick = useCallback(async () => {
    if (satsnetHeight < depthData?.enableBlock) {
      toast.error(t('common.wait_for_contract_enable'));
      return;
    }

    const quantityNum = formatQuantity(state.quantity);

    if (!normalizedPrice) {
      toast.error(t('common.price_must_be_positive'));
      return;
    }
    if (!quantityNum) {
      toast.error(t('common.quantity_must_be_positive'));
      return;
    }
    const orderValue = calculateLimitOrderValue(state.price, quantityNum);
    if (!orderValue?.isAtLeastOneSat) {
      toast.error('Order value must be at least 1 sat.');
      return;
    }
    if (isServiceFeeFetching) {
      toast.error('Service fee is still loading.');
      return;
    }
    if (serviceFeeError || serviceFee === null) {
      toast.error(
        serviceFeeError instanceof Error
          ? serviceFeeError.message
          : 'Unable to query service fee.',
      );
      return;
    }

    // 计算订单金额和费用
    const unitPrice = normalizedPrice;
    if (state.orderType === 'buy') {
      const value = orderValue.roundedSats;
      const networkFee = 10;
      updateState({
        showConfirm: true,
        confirmData: {
          value,
          quoteIdentity,
          bidPrice: unitPrice,
          feeSats: serviceFee,
          netFeeSats: networkFee.toString(),
          paySats: new Decimal(value)
            .plus(serviceFee)
            .plus(networkFee)
            .toFixed(0),
          walletSats: balance.availableAmt.toString(),
        },
      });
    } else {
      // sell
      const value = orderValue.roundedSats;
      const networkFee = 10;
      updateState({
        showConfirm: true,
        confirmData: {
          value,
          quoteIdentity,
          bidPrice: unitPrice,
          feeSats: serviceFee,
          netFeeSats: networkFee.toString(),
          paySats: '',
          walletSats: displayAvailableAmt.toString(),
        },
      });
    }
  }, [
    satsnetHeight,
    depthData?.enableBlock,
    state.price,
    state.quantity,
    state.orderType,
    quoteIdentity,
    normalizedPrice,
    serviceFee,
    serviceFeeError,
    isServiceFeeFetching,
    balance.availableAmt,
    displayAvailableAmt,
    formatQuantity,
    t,
    updateState,
  ]);

  const handleConfirm = useCallback(async () => {
    updateState({ showConfirm: false, isPlacingOrder: true });

    const quantityNum = formatQuantity(state.quantity);
    if (
      !normalizedPrice ||
      !quantityNum ||
      state.confirmData.quoteIdentity !== quoteIdentity
    ) {
      toast.error('Order quote changed. Please review it again.');
      updateState({ isPlacingOrder: false, showConfirm: false });
      return;
    }
    const _asset = state.orderType === 'buy' ? '::' : asset;
    const unitPrice = normalizedPrice;
    const orderValue = calculateLimitOrderValue(state.price, quantityNum);
    if (!orderValue?.isAtLeastOneSat) {
      toast.error('Order value must be at least 1 sat.');
      updateState({ isPlacingOrder: false });
      return;
    }
    const amt =
      state.orderType === 'buy' ? orderValue.roundedSats : quantityNum;

    const paramObj = {
      orderType: state.orderType === 'buy' ? 2 : 1,
      assetName: asset,
      amt: '0',
      unitPrice: unitPrice,
    };

    paramObj.amt = quantityNum;

    const params = {
      action: 'swap',
      param: JSON.stringify(paramObj),
    };

    try {
      await getWalletAdapter().invokeContractV2SatsNet(
        contractURL,
        JSON.stringify(params),
        _asset,
        amt.toString(),
        btcFeeRate.value.toString(),
        {
          action: 'swap',
          orderType: state.orderType === 'buy' ? 2 : 1,
          assetName: state.orderType === 'buy' ? ticker : asset,
          amt: quantityNum,
          sats: orderValue.roundedSats,
          unitPrice: unitPrice,
          quantity: quantityNum,
          slippage: '0',
          networkFee: 10,
        },
      );

      // invokeContractV2_SatsNet 没有返回值，提交就当作成功
      // toast.success(t('common.order_placed_successfully'));
      updateState({ isPlacingOrder: false, price: '', quantity: '' });
      if (onOrderSuccess) onOrderSuccess();
    } catch (error) {
      console.log('error', error);
      toast.error(t('common.order_placement_failed'));
      updateState({ isPlacingOrder: false, price: '', quantity: '' });
    }
  }, [
    state.price,
    state.quantity,
    state.orderType,
    state.confirmData.quoteIdentity,
    quoteIdentity,
    normalizedPrice,
    asset,
    contractURL,
    ticker,
    btcFeeRate.value,
    formatQuantity,
    onOrderSuccess,
    t,
    updateState,
  ]);

  return {
    state,
    serviceFee,
    serviceFeeError,
    isServiceFeeFetching,
    updateState,
    handleQuantityChange,
    handleSubmitClick,
    handleConfirm,
  };
};
