import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { contractService } from '@/domain/services/contract';

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
  const [state, setState] = useState<OrderFormState>({
    orderType: "buy",
    price: "",
    quantity: "",
    isPlacingOrder: false,
    showConfirm: false,
    confirmData: {
      paySats: '',
      bidPrice: '',
      feeSats: '',
      netFeeSats: '',
      walletSats: '',
      value: '',
    },
  });

  const updateState = useCallback((updates: Partial<OrderFormState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // 处理数量输入，限制小数位数
  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [divisibility, updateState]);

  // 格式化数量，去除多余小数位
  const formatQuantity = useCallback((value: string): number => {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    return Number(num.toFixed(divisibility));
  }, [divisibility]);

  // 获取服务费
  const getFee = useCallback(async (orderType: string, priceNum: number, quantityNum: number) => {
    if (!priceNum || !quantityNum || priceNum <= 0 || quantityNum <= 0) return 0;

    const params = {
      action: 'swap',
      param: JSON.stringify({
        orderType: orderType === 'buy' ? 2 : 1,
        assetName: asset,
        amt: quantityNum.toString(),
        unitPrice: priceNum.toString()
      })
    };

    try {
      const fee = await contractService.getFeeForInvokeContract(
        contractURL,
        JSON.stringify(params)
      );
      return Number(fee) || 0;
    } catch (error) {
      console.error('Failed to get fee:', error);
      return 0;
    }
  }, [asset, contractURL]);

  // 使用 React Query 获取服务费
  const { data: serviceFee = 0 } = useQuery({
    queryKey: ['serviceFee', state.orderType, state.price, state.quantity],
    queryFn: () => getFee(state.orderType, parseFloat(state.price), formatQuantity(state.quantity)),
    enabled: Boolean(state.price) && Boolean(state.quantity) && Number(state.price) > 0 && Number(state.quantity) > 0,
  });

  const handleSubmitClick = useCallback(async () => {
    if (satsnetHeight < depthData?.enableBlock) {
      toast.error(t('common.wait_for_contract_enable'));
      return;
    }

    const priceNum = parseFloat(state.price);
    const quantityNum = formatQuantity(state.quantity);

    if (!state.price || isNaN(priceNum) || priceNum <= 0) {
      toast.error(t('common.price_must_be_positive'));
      return;
    }
    if (!state.quantity || isNaN(quantityNum) || quantityNum <= 0) {
      toast.error(t('common.quantity_must_be_positive'));
      return;
    }

    // 计算订单金额和费用
    const unitPrice = priceNum.toString();
    if (state.orderType === 'buy') {
      const value = Math.ceil(priceNum * quantityNum);
      const networkFee = 10;
      updateState({
        showConfirm: true,
        confirmData: {
          value: value.toString(),
          bidPrice: unitPrice,
          feeSats: serviceFee.toString(),
          netFeeSats: networkFee.toString(),
          paySats: (value + serviceFee + networkFee).toString(),
          walletSats: balance.availableAmt.toString()
        }
      });
    } else { // sell
      const value = Math.ceil(priceNum * quantityNum);
      const networkFee = 10;
      updateState({
        showConfirm: true,
        confirmData: {
          value: value.toString(),
          bidPrice: unitPrice,
          feeSats: serviceFee.toString(),
          netFeeSats: networkFee.toString(),
          paySats: "",
          walletSats: displayAvailableAmt.toString()
        }
      });
    }
  }, [
    satsnetHeight,
    depthData?.enableBlock,
    state.price,
    state.quantity,
    state.orderType,
    serviceFee,
    balance.availableAmt,
    displayAvailableAmt,
    formatQuantity,
    t,
    updateState
  ]);

  const handleConfirm = useCallback(async () => {
    updateState({ showConfirm: false, isPlacingOrder: true });

    const priceNum = parseFloat(state.price);
    const quantityNum = formatQuantity(state.quantity);
    const _asset = state.orderType === 'buy' ? '::' : asset;
    const unitPrice = priceNum.toString();
    const amt = state.orderType === 'buy' ? Math.ceil(quantityNum * priceNum) : quantityNum;

    const paramObj = {
      orderType: state.orderType === 'buy' ? 2 : 1,
      assetName: asset,
      amt: '0',
      unitPrice: unitPrice,
    };

    paramObj.amt = quantityNum.toString();

    const params = {
      action: "swap",
      param: JSON.stringify(paramObj),
    };

    try {
      const result = await window.sat20.invokeContractV2_SatsNet(
        contractURL,
        JSON.stringify(params),
        _asset,
        amt.toString(),
        "1",
        {
          action: "swap",
          orderType: state.orderType === 'buy' ? 2 : 1,
          assetName: state.orderType === 'buy' ? ticker : asset,
          amt: quantityNum.toString(),
          sats: state.orderType === 'buy' ? amt.toString() : Math.ceil(quantityNum * priceNum).toString(),
          unitPrice: unitPrice,
          quantity: quantityNum,
          slippage: "0",
          networkFee: 10,
        }
      );
      const { txId } = result;
      if (txId) {
        toast.success(t('common.order_placed_successfully', { txId }));
        updateState({ isPlacingOrder: false, price: "", quantity: "" });
        if (onOrderSuccess) onOrderSuccess();
        return;
      } else {
        toast.error(t('common.order_placement_failed'));
      }
    } catch (error) {
      console.log('error', error);
      toast.error(t('common.order_placement_failed'));
    }
    updateState({ isPlacingOrder: false, price: "", quantity: "" });
  }, [
    state.price,
    state.quantity,
    state.orderType,
    asset,
    contractURL,
    ticker,
    formatQuantity,
    onOrderSuccess,
    t,
    updateState
  ]);

  return {
    state,
    serviceFee,
    updateState,
    handleQuantityChange,
    handleSubmitClick,
    handleConfirm,
  };
}; 