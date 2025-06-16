import React, { useState, useMemo } from "react";
import { useCommonStore, useWalletStore } from "@/store";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { sleep } from "radash";
import { toast } from "sonner";
import { useAssetBalance } from '@/application/useAssetBalanceService';
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { ArrowDownUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SwapProps {
  contractUrl: string;
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  onSellSuccess?: () => void;
  tickerInfo?: any;
}

type SwapType = 'asset-to-sats' | 'sats-to-asset';

const Swap = ({ contractUrl, assetInfo, onSellSuccess, tickerInfo = {} }: SwapProps) => {
  const { t } = useTranslation();
  const [swapType, setSwapType] = useState<SwapType>('sats-to-asset'); // 默认聪换资产
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [activeInput, setActiveInput] = useState<'from' | 'to'>('from');
  const [slippage, setSlippage] = useState<string>("0");
  const [isSwapping, setIsSwapping] = useState(false);
  const { satsnetHeight } = useCommonStore();
  const { address } = useReactWalletStore();
  const { getBalance, balance } = useWalletStore();
  const { balance: assetBalance, isLoading: assetBalanceLoading, refetch: refetchAssetBalance } = useAssetBalance(address, assetInfo.assetName);
  const displayAssetBalance = assetBalance.availableAmt + assetBalance.lockedAmt;
  const displaySatsBalance = Number(balance.availableAmt) + Number(balance.lockedAmt);

  // 获取池子状态（价格）
  const { data: swapData } = useQuery({
    queryKey: ["swapData", contractUrl],
    queryFn: async () => {
      if (!contractUrl) return null;
      const result = await window.sat20.getDeployedContractStatus(contractUrl);
      return result?.contractStatus ? JSON.parse(result?.contractStatus) : null;
    },
    enabled: !!contractUrl,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });
  console.log('swapData', swapData);
  
  const contractK = useMemo(() => swapData?.Contract?.k || 0, [swapData]);
  const assetAmtRaw = useMemo(() => swapData?.AssetAmtInPool || { Precision: 0, Value: 0 }, [swapData]);
  const assetAmt = useMemo(() => assetAmtRaw.Value / Math.pow(10, assetAmtRaw.Precision), [assetAmtRaw]);
  const satValue = useMemo(() => swapData?.SatsValueInPool || 0, [swapData]);
  const currentPrice = useMemo(() => {
    if (!satValue || !assetAmt) return 0;
    return Number((satValue / assetAmt).toFixed(10));
  }, [satValue, assetAmt]);

  // 计算兑换结果
  // asset-to-sats: 输入资产，输出聪（原sell）
  // sats-to-asset: 输入聪，输出资产（原buy）
  const calcToAmount = (input: string) => {
    const amtNum = Number(input);
    if (!satValue || !assetAmt || !amtNum || !contractK) return "";
    if (swapType === 'sats-to-asset') {
      // 用聪买资产
      const newSatValue = satValue + amtNum;
      const newAssetAmt = contractK / newSatValue;
      const assetOut = assetAmt - newAssetAmt;
      return assetOut > 0 ? assetOut.toFixed(assetAmtRaw.Precision) : "0";
    } else {
      // 用资产换聪
      const newAssetAmt = assetAmt + amtNum;
      const newSatValue = contractK / newAssetAmt;
      const satsOut = satValue - newSatValue;
      return satsOut > 0 ? satsOut.toFixed(0) : "0";
    }
  };
  const calcFromAmount = (input: string) => {
    // 反推输入
    const amtNum = Number(input);
    if (!satValue || !assetAmt || !amtNum || !contractK) return "";
    if (swapType === 'sats-to-asset') {
      // 已知资产，反推聪
      // assetOut = assetAmt - contractK / (satValue + x)
      // 解x
      const assetOut = amtNum;
      const newAssetAmt = assetAmt - assetOut;
      if (newAssetAmt <= 0) return "";
      const newSatValue = contractK / newAssetAmt;
      const satsIn = newSatValue - satValue;
      return satsIn > 0 ? satsIn.toFixed(0) : "0";
    } else {
      const satsOut = amtNum;
      const newSatValue = satValue - satsOut;
      if (newSatValue <= 0) return "";
      const newAssetAmt = contractK / newSatValue;
      const assetIn = newAssetAmt - assetAmt;
      return assetIn > 0 ? assetIn.toFixed(assetAmtRaw.Precision) : "0";
    }
  };

  // 联动输入
  const handleFromAmountChange = (val: string) => {
    setActiveInput('from');
    setFromAmount(val);
    setToAmount(calcToAmount(val));
  };
  const handleToAmountChange = (val: string) => {
    setActiveInput('to');
    setToAmount(val);
    setFromAmount(calcFromAmount(val));
  };

  // 滑点保护下的最小可接受数量
  const minReceiveValue = useMemo(() => {
    const slip = Number(slippage);
    const amt = Number(toAmount);
    return Math.floor(amt * (1 - slip / 100));
  }, [toAmount, slippage]);

  // 服务费（聪换资产时）
  const amtNum = Number(fromAmount);
  const serviceFee = swapType === 'sats-to-asset' ? Math.max(10, Math.ceil(amtNum * 0.008)) : 0;

  // 切换上下币种
  const handleSwitch = () => {
    setSwapType(swapType === 'sats-to-asset' ? 'asset-to-sats' : 'sats-to-asset');
    setFromAmount(toAmount);
    setToAmount(fromAmount);
    setActiveInput('from');
  };

  // 兑换处理
  const handleSwap = async () => {
    if (satsnetHeight < swapData?.enableBlock) {
      toast.error('Please wait for the contract to be enabled');
      return;
    }
    if (!fromAmount || Number(fromAmount) <= 0) {
      toast.error("请输入兑换数量");
      return;
    }
    if (swapType === 'sats-to-asset' && Number(fromAmount) > displaySatsBalance) {
      toast.error("聪余额不足");
      return;
    }
    if (swapType === 'asset-to-sats' && Number(fromAmount) > assetBalance.availableAmt) {
      toast.error("资产余额不足");
      return;
    }
    setIsSwapping(true);
    try {
      const paramObj: any = {
        orderType: swapType === 'sats-to-asset' ? 2 : 1,
        assetName: assetInfo.assetName,
        amt: '0',
      };
      if (Number(slippage) > 0) {
        paramObj.amt = minReceiveValue.toString();
      }
      const params = {
        action: "swap",
        param: JSON.stringify(paramObj),
      };
      let result;
      if (swapType === 'sats-to-asset') {
        // 用聪买资产
        result = await window.sat20.invokeContractV2_SatsNet(
          contractUrl,
          JSON.stringify(params),
          "::",
          fromAmount,
          "1",
          {
            action: "swap",
            orderType: 2,
            assetName: assetInfo.assetName,
            amt: minReceiveValue.toString(),
            unitPrice: currentPrice.toString(),
            quantity: fromAmount,
            slippage: slippage,
            serviceFee: serviceFee,
          }
        );
      } else {
        // 用资产换聪
        result = await window.sat20.invokeContractV2_SatsNet(
          contractUrl,
          JSON.stringify(params),
          assetInfo.assetName,
          fromAmount.toString(),
          "1",
          {
            action: "swap",
            orderType: 1,
            assetName: assetInfo.assetName,
            amt: minReceiveValue.toString(),
            unitPrice: currentPrice.toString(),
            quantity: fromAmount,
            slippage: slippage,
          }
        );
      }
      const { txId } = result;
      if (txId) {
        toast.success(`Swap成功，txid: ${txId}`);
        setFromAmount("");
        setToAmount("");
        setSlippage("0");
        await sleep(1000);
        getBalance();
        refetchAssetBalance();
        onSellSuccess?.();
      } else {
        toast.error("Swap失败");
      }
    } catch (error) {
      toast.error("Swap失败");
    }
    setIsSwapping(false);
  };

  // UI
  return (
    <div className="p-4 bg-zinc-900 text-zinc-200 rounded-xl shadow-lg border border-zinc-700 max-w-md mx-auto">
      {/* 资产信息 */}
      <div className="flex items-center gap-3 mb-4">
        {/* <Avatar className="w-10 h-10 text-xl text-gray-300 font-medium bg-zinc-700">
          <AvatarImage src={swapData.logo} alt="Logo" />
          <AvatarFallback>
            {assetInfo.assetName
              ? String.fromCodePoint(swapData.assetInfo.assetName)
              : ''}
          </AvatarFallback>
        </Avatar> */}
        <div>
          <div className="font-bold text-lg flex items-center gap-2">{assetInfo.assetName} <span className="text-green-400 text-base">${tickerInfo?.price || '--'}</span></div>
          <div className="text-xs text-gray-400">合约地址 {contractUrl.slice(0, 8)}...{contractUrl.slice(-4)}</div>
          <div className="text-xs text-gray-400">池子资产数量: <span className="text-white">{assetAmt}</span> {tickerInfo?.displayname} / 池子聪数量: <span className="text-white">{satValue}</span> sats</div>
        </div>
      </div>
      {/* 上方输入框 */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>你支付</span>
          <span>余额: {swapType === 'sats-to-asset' ? displaySatsBalance : displayAssetBalance} {swapType === 'sats-to-asset' ? 'sats' : tickerInfo?.displayname}</span>
        </div>
        <Input
          type="number"
          value={fromAmount}
          onChange={e => handleFromAmountChange(e.target.value)}
          className="w-full bg-transparent border border-zinc-600 rounded-lg px-4 py-2 text-lg text-white"
          placeholder={swapType === 'sats-to-asset' ? '输入聪数量' : '输入资产数量'}
          min={1}
        />
        <div className="absolute right-4 top-2/4 transform -translate-y-2/4 flex items-center gap-2"></div>
      </div>
      {/* 切换按钮 */}
      <div className="flex justify-center my-2">
        <button
          onClick={handleSwitch}
          className="rounded-full bg-zinc-800 hover:bg-zinc-700 p-2 border border-zinc-600"
          aria-label="切换兑换方向"
        >
          <ArrowDownUp className="w-5 h-5 text-gray-300" />
        </button>
      </div>
      {/* 下方输入框 */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>你获得</span>
          <span>余额: {swapType === 'sats-to-asset' ? displayAssetBalance : displaySatsBalance} {swapType === 'sats-to-asset' ? tickerInfo?.displayname : 'sats'}</span>
        </div>
        <Input
          type="number"
          value={toAmount}
          onChange={e => handleToAmountChange(e.target.value)}
          className="w-full bg-transparent border border-zinc-600 rounded-lg px-4 py-2 text-lg text-white"
          placeholder={swapType === 'sats-to-asset' ? '预估获得资产数量' : '预估获得聪数量'}
          min={1}
        />
      </div>
      {/* 滑点输入 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-400">滑点保护</span>
        <Input
          type="number"
          value={slippage}
          onChange={(e) => setSlippage(e.target.value)}
          className="w-20 bg-transparent border border-zinc-600 rounded-lg px-2 py-1 text-sm text-white"
          min={0.1}
          step={0.1}
        />
        <span className="text-sm text-gray-400">%</span>
        {["0.5", "1", "2"].map((value) => (
          <button
            key={value}
            onClick={() => setSlippage(value)}
            className={`px-2 py-1 rounded bg-zinc-800 text-xs ${slippage === value ? 'bg-blue-500 text-white' : 'text-gray-400'}`}
          >
            {value}%
          </button>
        ))}
      </div>
      {/* 预估最小可接受成交量 */}
      {/* <div className="flex justify-between mb-2 text-sm text-gray-400">
        <span>当前价格: <span className="text-white">{currentPrice || '--'}</span> sats/{tickerInfo?.displayname}</span>
        <span>最少获得: <span className="text-white">{minReceiveValue || '--'}</span> {swapType === 'sats-to-asset' ? tickerInfo?.displayname : 'sats'}</span>
      </div> */}
      {/* 服务费（聪换资产时） */}
      {swapType === 'sats-to-asset' && (
        <div className="flex justify-end mb-2 text-sm text-gray-400">
          <span>服务费: <span className="text-white">{serviceFee || '--'}</span> sats</span>
        </div>
      )}
      <WalletConnectBus asChild>
        <Button
          type="button"
          onClick={handleSwap}
          className={`w-full mt-4 text-sm font-semibold transition-all duration-200 btn-gradient`}
          size="lg"
          disabled={isSwapping}
        >
          {isSwapping ? t('common.swap_buyingAsset') : 'Swap'}
        </Button>
      </WalletConnectBus>
    </div>
  );
};

export default Swap; 