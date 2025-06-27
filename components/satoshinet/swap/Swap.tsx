import React, { useState, useMemo } from "react";
import { useCommonStore, useWalletStore } from "@/store";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from "@tanstack/react-query";
import { sleep } from "radash";
import { toast } from "sonner";
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { ArrowDownUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BtcPrice } from "@/components/BtcPrice";
import { getValueFromPrecision } from '@/utils';
import { ButtonRefresh } from '@/components/buttons/ButtonRefresh';

interface SwapProps {
  asset: string;
  ticker: string;
  contractUrl: string;
  tickerInfo?: any;
  onSwapSuccess?: () => void;
  swapData: any;
  satsBalance: {
    availableAmt: number;
    lockedAmt: number;
  };
  assetBalance: {
    availableAmt: number;
    lockedAmt: number;
  };
  refresh: () => void;
  isRefreshing: boolean;
}

type SwapType = 'asset-to-sats' | 'sats-to-asset';

const Swap = ({
  asset,
  ticker,
  contractUrl,
  tickerInfo = {},
  onSwapSuccess,
  swapData,
  satsBalance,
  assetBalance,
  refresh,
  isRefreshing
}: SwapProps) => {
  const { t } = useTranslation();
  const [swapType, setSwapType] = useState<SwapType>('sats-to-asset');
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [activeInput, setActiveInput] = useState<'from' | 'to'>('from');
  const [slippage, setSlippage] = useState<string>("0");
  const { satsnetHeight } = useCommonStore();
  const assetAmtInPool = useMemo(() => getValueFromPrecision(swapData?.AssetAmtInPool), [swapData?.AssetAmtInPool]);
  const divisibility = tickerInfo?.divisibility || 0;

  const satValue = useMemo(() => swapData?.SatsValueInPool || 0, [swapData?.SatsValueInPool]);

  const lastDealPrice = useMemo(() => getValueFromPrecision(swapData?.LastDealPrice), [swapData?.LastDealPrice]);
  const contractK = useMemo(() => swapData?.Contract?.k || 0, [swapData?.Contract]);
  const displayAssetBalance = assetBalance.availableAmt + assetBalance.lockedAmt;
  const displaySatsBalance = Number(satsBalance.availableAmt) + Number(satsBalance.lockedAmt);

  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [isHoveringInput, setIsHoveringInput] = useState(false);

  // 处理输入值的小数位数
  const formatAmount = (value: string, isAssetAmount: boolean): string => {
    if (!value) return '';
    
    // 如果是 sats，不允许小数
    if (!isAssetAmount) {
      const intValue = parseInt(value);
      return intValue ? intValue.toString() : '';
    }

    // 如果是资产，根据 divisibility 处理小数位
    const parts = value.split('.');
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) {
      return `${parts[0]}.${parts[1].slice(0, divisibility)}`;
    }
    return parts[0];
  };

  const calcToAmount = (input: string) => {
    const amtNum = Number(input);
    if (!satValue || !assetAmtInPool.value || !amtNum || !contractK) return "";
    if (swapType === 'sats-to-asset') {
      // 用聪买资产
      const newSatValue = satValue + amtNum;
      const newAssetAmt = contractK / newSatValue;
      const assetOut = assetAmtInPool.value - newAssetAmt;
      return assetOut > 0 ? assetOut.toFixed(swapData?.AssetAmtInPool?.Precision || 8) : "0";
    } else {
      // 用资产换聪
      const newAssetAmt = assetAmtInPool.value + amtNum;
      const newSatValue = contractK / newAssetAmt;
      const satsOut = satValue - newSatValue;
      return satsOut > 0 ? satsOut.toFixed(0) : "0";
    }
  };

  const calcFromAmount = (input: string) => {
    const amtNum = Number(input);
    if (!satValue || !assetAmtInPool.value || !amtNum || !contractK) return "";
    if (swapType === 'sats-to-asset') {
      const assetOut = amtNum;
      const newAssetAmt = assetAmtInPool.value - assetOut;
      if (newAssetAmt <= 0) return "";
      const newSatValue = contractK / newAssetAmt;
      const satsIn = newSatValue - satValue;
      return satsIn > 0 ? satsIn.toFixed(0) : "0";
    } else {
      const satsOut = amtNum;
      const newSatValue = satValue - satsOut;
      if (newSatValue <= 0) return "";
      const newAssetAmt = contractK / newSatValue;
      const assetIn = newAssetAmt - assetAmtInPool.value;
      return assetIn > 0 ? assetIn.toFixed(swapData?.AssetAmtInPool?.Precision || 8) : "0";
    }
  };

  // 联动输入
  const handleFromAmountChange = (val: string) => {
    setActiveInput('from');
    const formattedValue = formatAmount(val, swapType === 'asset-to-sats');
    if (formattedValue === fromAmount) return;
    setFromAmount(formattedValue);
    setToAmount(calcToAmount(formattedValue));
  };
  const handleToAmountChange = (val: string) => {
    setActiveInput('to');
    const formattedValue = formatAmount(val, swapType === 'sats-to-asset');
    if (formattedValue === toAmount) return;
    setToAmount(formattedValue);
    setFromAmount(calcFromAmount(formattedValue));
  };

  // 滑点保护下的最小可接受数量
  const minReceiveValue = useMemo(() => {
    const slip = Number(slippage);
    const amt = Number(toAmount);
    return Math.floor(amt * (1 - slip / 100));
  }, [toAmount, slippage]);

  // 服务费（聪换资产时）
  const serviceFee = useMemo(() => {
    if (swapType === 'sats-to-asset' && Number(fromAmount) > 0) {
      return 10 + Math.floor(Number(fromAmount) * 0.008); // 服务费计算逻辑
    }
    return 0; // 如果 fromAmount 为 0，服务费为 0
  }, [swapType, fromAmount]);

  const networkFee = useMemo(() => {
    if (Number(fromAmount) > 0) {
      return 10; // 假设网络费固定为 10 sats
    }
    return 0; // 如果 fromAmount 为 0，网络费为 0
  }, [fromAmount]);

  // 总支付费用部分
  const totalFee = useMemo(() => {
    const inputAmount = Number(fromAmount) || 0; // 用户输入的金额
    return inputAmount + serviceFee + networkFee; // 总支出 = 用户输入金额 + 服务费 + 网络费
  }, [fromAmount, serviceFee, networkFee]);

  // 切换上下币种
  const handleSwitch = () => {
    setSwapType(swapType === 'sats-to-asset' ? 'asset-to-sats' : 'sats-to-asset');
    setFromAmount(toAmount);
    setToAmount(fromAmount);
    setActiveInput('from');
    setIsDetailsVisible(false);
  };


  const swapMutation = useMutation({
    mutationFn: async () => {
      if (satsnetHeight < swapData?.enableBlock) {
        throw new Error('Please wait for the contract to be enabled');
      }
      if (!fromAmount || Number(fromAmount) <= 0) {
        throw new Error("Please enter a valid amount");
      }
      if (swapType === 'sats-to-asset' && Number(fromAmount) > displaySatsBalance) {
        throw new Error("Insufficient sats balance");
      }
      if (swapType === 'asset-to-sats' && Number(fromAmount) > assetBalance.availableAmt) {
        throw new Error("Insufficient asset balance");
      }

      const paramObj: any = {
        orderType: swapType === 'sats-to-asset' ? 2 : 1,
        assetName: asset,
        amt: '0',
        unitPrice: fromAmount.toString(),
      };
      if (Number(slippage) > 0) {
        paramObj.amt = minReceiveValue.toString();
      }
      const params = {
        action: "swap",
        param: JSON.stringify(paramObj),
      };

      if (swapType === 'sats-to-asset') {
        return await window.sat20.invokeContractV2_SatsNet(
          contractUrl,
          JSON.stringify(params),
          "::",
          fromAmount,
          "1",
          {
            action: "swap",
            orderType: 2,
            assetName: ticker,
            amt: minReceiveValue.toString(),
            sats: fromAmount,
            unitPrice: lastDealPrice.value.toString(),
            quantity: toAmount,
            slippage: slippage,
            serviceFee: serviceFee,
          }
        );
      } else {
        // 用资产换聪
        return await window.sat20.invokeContractV2_SatsNet(
          contractUrl,
          JSON.stringify(params),
          asset,
          fromAmount.toString(),
          "1",
          {
            action: "swap",
            orderType: 1,
            assetName: asset,
            amt: minReceiveValue.toString(),
            unitPrice: lastDealPrice.value.toString(),
            quantity: fromAmount,
            slippage: slippage,
          }
        );
      }
    },
    onSuccess: async (result) => {
      const { txId } = result;
      if (txId) {
        toast.success(`Swap successful, txid: ${txId}`);
        setFromAmount("");
        setToAmount("");
        setSlippage("0");
        onSwapSuccess?.();
      } else {
        toast.error("Swap failed");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Swap failed");
    }
  });

  // Replace handleSwap with new mutation-based function
  const handleSwap = () => {
    swapMutation.mutate();
  };

  const buyQuickInputValues = useMemo(() => {
    if (!assetAmtInPool.value) return [];
    const maxBuyAmount = assetAmtInPool.value * 0.5;
    const percentages = assetAmtInPool.value > 100000
      ? [0.0001, 0.0002, 0.0005, 0.001]
      : [0.02, 0.05, 0.1, 0.2];

    const values = percentages.map((percentage) => {
      const calculatedValue = maxBuyAmount * percentage;
      const magnitude = Math.pow(10, Math.floor(Math.log10(calculatedValue)));
      return Math.round(calculatedValue / magnitude) * magnitude;
    });
    return values;
  }, [assetAmtInPool.value]);

  // UI
  return (
    <div className="pb-4 bg-transparent text-zinc-200 max-w-2xl mx-auto">
      <div className="mb-6 bg-zinc-900 sm:p-2 rounded-xl shadow-lg shadow-sky-500/50 border border-zinc-700 relative">
        {/* Add refresh button */}
        <div className="absolute top-5 right-4 z-10">
          <ButtonRefresh
            onRefresh={refresh}
            loading={isRefreshing}
            className="bg-zinc-800/50"
          />
        </div>
        {/* 上方输入框 */}
        <div className="mb-2 mx-4 bg-zinc-900 py-2 rounded-lg relative"
          onMouseEnter={() => setIsHoveringInput(true)}
          onMouseLeave={() => setIsHoveringInput(false)}
        >
          <div className="flex justify-between items-center text-xs text-zinc-500 mb-1 mx-2">
            <span className="py-2 uppercase">{t('common.youPay')}</span>
            {/* 快捷输入标签 */}
            {isHoveringInput && (
              <span className="flex items-center gap-2 bg-transparent px-2 py-1 rounded-lg">
                {/* <span className="text-sm text-gray-400">{t('common.quickInput')}</span> */}
                {swapType === 'asset-to-sats' ? (
                  // 卖出资产快捷输入
                  ["25%", "50%", "75%", "100%"].map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        const percentage = Number(value.replace('%', '')) / 100;
                        const calculatedAmount = (assetBalance.availableAmt * percentage).toFixed(swapData?.AssetAmtInPool?.Precision || 8);
                        handleFromAmountChange(calculatedAmount);
                      }}
                      className={`px-2 py-1 rounded bg-zinc-800 text-xs hover:bg-purple-500 hover:text-white ${fromAmount === (assetBalance.availableAmt * Number(value.replace('%', '')) / 100).toFixed(swapData?.AssetAmtInPool?.Precision || 8)
                        ? 'bg-purple-500 text-white'
                        : 'text-gray-400'
                        }`}
                    >
                      {value}
                    </button>
                  ))
                ) : (
                  // 买入资产快捷输入
                  buyQuickInputValues.map((value) => (
                    <button
                      key={value}
                      onClick={() => handleFromAmountChange(value.toString())}
                      className={`px-2 py-1 rounded  bg-zinc-800 text-xs hover:bg-purple-500 hover:text-white ${fromAmount === value.toString() ? 'bg-purple-500 text-white' : 'text-gray-400'
                        }`}
                    >
                      {value}
                    </button>
                  ))
                )}
              </span>
            )}
          </div>
          <div className="relative w-full">
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => handleFromAmountChange(e.target.value)}
              className="w-full input-swap bg-transparent border-none border-zinc-900 rounded-lg px-4 py-2 text-xl sm:text-3xl font-bold text-white pr-16"
              placeholder={swapType === 'sats-to-asset' ? t('common.enterSatsAmount') : t('common.enterAssetAmount')}
              min={1}
              step={swapType === 'sats-to-asset' ? "1" : divisibility === 0 ? "1" : `0.${"0".repeat(divisibility-1)}1`}
              onKeyDown={(e) => {
                // 当输入sats或divisibility为0时，阻止输入小数点
                if ((swapType === 'sats-to-asset' || (swapType === 'asset-to-sats' && divisibility === 0)) && e.key === '.') {
                  e.preventDefault();
                }
              }}
            />
            <span className="absolute top-1/2 right-4 sm:mr-10 transform -translate-y-1/2 text-zinc-600 text-sm">
              {swapType === 'sats-to-asset' ? 'sats' : ticker}
            </span>
          </div>
          {/* 显示余额 */}
          <p className="flex justify-between text-zinc-600 text-xs mt-2 mb-8 px-2">
            <span>{t('common.balance')}: <span className="font-bold">{swapType === 'sats-to-asset' ? displaySatsBalance.toLocaleString() : displayAssetBalance.toLocaleString()} </span> {swapType === 'sats-to-asset' ? 'sats' : ticker}
              {swapType === 'sats-to-asset' && (
                <span className="text-xs text-zinc-600 ml-2">
                  ($<BtcPrice btc={displayAssetBalance / 100000000} />)
                </span>
              )}
            </span>
          </p>
        </div>

        {/* 切换按钮 */}
        <div className="relative z-50">
          <button
            onClick={handleSwitch}
            className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-zinc-900 hover:bg-purple-700 rounded-full p-4 border-2 border-zinc-700"
            aria-label={t('common.switchDirection')}
          >
            <ArrowDownUp className="w-10 h-10 font-bold text-purple-500 hover:text-zinc-300" />
          </button>
        </div>

        {/* 下方输入框 */}
        <div className="mb-2 mx-4 bg-zinc-900 py-2 border-t-2 border-zinc-700 relative">
          <div className="flex justify-between items-center text-xs text-zinc-500 mt-6 mb-1 mx-2 py-2">
            <span className="uppercase">{t('common.youReceive')}</span>
          </div>
          <div className="relative w-full">
            <input
              type="number"
              value={toAmount}
              onChange={e => handleToAmountChange(e.target.value)}
              className="w-full input-swap bg-transparent border-none border-zinc-900 rounded-lg px-1 py-2 text-xl sm:text-3xl font-bold text-white"
              placeholder={swapType === 'sats-to-asset' ? t('common.estimatedAssetAmount') : t('common.estimatedSatsAmount')}
              min={1}
              step={swapType === 'sats-to-asset' ? (divisibility === 0 ? "1" : `0.${"0".repeat(divisibility-1)}1`) : "1"}
              onKeyDown={(e) => {
                // 当输入sats或divisibility为0时，阻止输入小数点
                if ((swapType === 'asset-to-sats' || (swapType === 'sats-to-asset' && divisibility === 0)) && e.key === '.') {
                  e.preventDefault();
                }
              }}
            />
            <span className="absolute top-1/2 right-4 sm:mr-10 transform -translate-y-1/2 text-zinc-600 text-sm">
              {swapType === 'sats-to-asset' ? ticker : 'sats'}
            </span>
          </div>
          {/* 显示余额 */}
          <p className="text-xs text-zinc-600 mt-1 px-2">
            <span>
              {t('common.balance')}:
              <span className="font-bold mr-1"> {swapType === 'sats-to-asset' ? displayAssetBalance.toLocaleString() : displaySatsBalance.toLocaleString()}</span>
              <span className="font-light">{swapType === 'sats-to-asset' ? ticker : 'sats'}</span>
            </span>
          </p>
        </div>
        {/* 滑点输入 */}
        <div className="flex items-center gap-2 mx-4 mb-4">
          <span className="text-sm text-zinc-500">{t('common.slippageProtection')}</span>
          <Input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            className="w-12 sm:w-16 h-8 bg-transparent border border-zinc-800 rounded-lg px-2 py-1 text-sm text-white"
            min={0.1}
            step={0.1}
          />
          <span className="text-sm text-gray-400">%</span>
          {["0.5", "1", "2"].map((value) => (
            <button
              key={value}
              onClick={() => setSlippage(value)}
              className={`px-3 py-2 rounded-lg bg-zinc-800 text-xs hover:bg-purple-500 hover:text-white ${slippage === value ? 'bg-purple-500 text-white' : 'text-zinc-400'}`}
            >
              {value}%
            </button>
          ))}
        </div>
      </div>
      {/* 预估最小可接受成交量 */}
      <div className="flex justify-between mb-2 text-sm text-gray-400">
        <span>当前价格: <span className="text-white">{lastDealPrice?.formatted || '--'}</span> sats/{ticker}</span>
        <span>最少获得: <span className="text-white">{minReceiveValue || '--'}</span> {swapType === 'sats-to-asset' ? ticker : 'sats'}</span>
      </div>
      {/* 服务费（聪换资产时） */}
      {swapType === 'sats-to-asset' && (
        <div className="px-4 py-4 bg-zinc-900 text-zinc-200 rounded-lg shadow-lg border border-zinc-900/50 max-w-2xl mx-auto">

          {/* 总支付费用部分 */}
          <div className="flex justify-between items-center text-sm text-gray-400">
            <span>{t('common.totalPay')}: <span className="text-white ml-1">{totalFee || '--'}</span> sats</span>
            <span className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">
                $<BtcPrice btc={totalFee / 100000000} />
              </span>
              <button
                onClick={() => setIsDetailsVisible(!isDetailsVisible)}
                className="flex items-center text-gray-400 hover:text-white"
              >
                {isDetailsVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </span>
          </div>

          {/* 支付明细部分 */}
          {isDetailsVisible && (
            <div className="text-sm text-gray-500 border-t border-zinc-800 pt-2 mt-2">
              <div className="flex justify-between mb-1">
                <span>{t('common.serviceFee')}(10 sats + 0.8%):</span>
                <span className="text-zinc-500">{serviceFee || '--'} sats</span>
              </div>
              <div className="flex justify-between">
                <span>{t('common.networkFee')}(10 sats / Tx):</span>
                <span className="text-zinc-500">{networkFee || '--'} sats</span>
              </div>
            </div>
          )}
        </div>
      )}
      <WalletConnectBus asChild>
        <Button
          type="button"
          onClick={handleSwap}
          className={`w-full my-4 text-sm font-semibold transition-all duration-200 btn-gradient`}
          size="lg"
          disabled={swapMutation.isPending}
        >
          {swapMutation.isPending ? 'Swapping...' : 'SWAP'}
        </Button>
      </WalletConnectBus>
    </div>
  );
};

export default Swap;