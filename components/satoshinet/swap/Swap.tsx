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
import { ArrowDownUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getContractStatus } from '@/api/market';
import { BtcPrice } from "@/components/BtcPrice";

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

  const [isDetailsVisible, setIsDetailsVisible] = useState(false); // 控制明细显示状态
  const [isHoveringInput, setIsHoveringInput] = useState(false); // 控制悬停状态

  // 获取池子状态（价格）
  const { data: swapData } = useQuery({
    queryKey: ["swapData", contractUrl],
    queryFn: async () => {
      if (!contractUrl) return null;
      const { status } = await getContractStatus(contractUrl);
      return status ? JSON.parse(status) : null;
    },
    enabled: !!contractUrl,
    // refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  const contractK = useMemo(() => swapData?.Contract?.k || 0, [swapData]);
  const assetAmtRaw = useMemo(() => swapData?.AssetAmtInPool || { Precision: 0, Value: 0 }, [swapData]);
  const assetAmt = useMemo(() => assetAmtRaw.Value / Math.pow(10, assetAmtRaw.Precision), [assetAmtRaw]);
  const satValue = useMemo(() => swapData?.SatsValueInPool || 0, [swapData]);
  const protocol = useMemo(() => swapData?.Contract?.assetName?.Protocol || '', [swapData]);
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
  const serviceFee = useMemo(() => {
    if (swapType === 'sats-to-asset' && Number(fromAmount) > 0) {
      return 10 + Math.ceil(Number(fromAmount) * 0.008); // 服务费计算逻辑
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

  const formatName = (name: string) => {
    return name.split('f:')[1] || name; // 如果没有 'f:'，返回原始名称
  };

  // 兑换处理
  const handleSwap = async () => {
    if (satsnetHeight < swapData?.enableBlock) {
      toast.error('Please wait for the contract to be enabled');
      return;
    }
    if (!fromAmount || Number(fromAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (swapType === 'sats-to-asset' && Number(fromAmount) > displaySatsBalance) {
      toast.error("Insufficient sats balance");
      return;
    }
    if (swapType === 'asset-to-sats' && Number(fromAmount) > assetBalance.availableAmt) {
      toast.error("Insufficient asset balance");
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
        toast.success(`Swap successful, txid: ${txId}`);
        setFromAmount("");
        setToAmount("");
        setSlippage("0");
        await sleep(1000);
        getBalance();
        refetchAssetBalance();
        onSellSuccess?.();
      } else {
        toast.error("Swap failed");
      }
    } catch (error) {
      toast.error("Swap failed");
    } finally {
      setIsSwapping(false);
    }
  };

  // UI
  return (
    <div className="py-4 bg-transparent text-zinc-200 max-w-2xl mx-auto">
      {/* 资产信息 */}
      <div className="flex items-center gap-3 mb-4 pb-2">
        {/* <Avatar className="w-10 h-10 text-xl text-gray-300 font-medium bg-zinc-700">
          <AvatarImage src={swapData.logo} alt="Logo" />
          <AvatarFallback>
            {assetInfo.assetName
              ? String.fromCodePoint(swapData.assetInfo.assetName)
              : ''}
          </AvatarFallback>
        </Avatar> */}

        {/* 左侧：资产信息 */}
        <div className="bg-zinc-900 rounded-xl p-4 flex flex-col text-sm w-full border border-zinc-800 shadow-lg">
          <div className="flex items-center mb-2 gap-4">
            {/* Logo 或首字母 */}
            <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center text-zinc-300 text-xl font-bold">
              {formatName(assetInfo.assetName).charAt(0).toUpperCase()}
            </div>

            {/* 名称与合约 */}
            <div>
              <p className="text-zinc-400 font-semibold text-lg">{formatName(assetInfo.assetName)}</p>
              <p className="text-zinc-500 text-xs gap-2">
                {t('common.contractAddress')}：<span className="text-blue-400 mr-2">{contractUrl.slice(0, 8)}...{contractUrl.slice(-4)}</span>
                {t('common.protocol')}：{protocol}
              </p>
            </div>
          </div>

          {/* 价格与池状态 */}
          <div className="text-sm pt-2 text-zinc-500 border-t border-zinc-800 space-y-2">
            {/* 资产池信息 */}
            <div className="flex justify-start items-start">
              <span className="text-zinc-500">{t('common.poolAssetInfo')}：</span>
              <div className="text-left text-zinc-500 space-y-1">
                <p><span className="font-bold mr-2">{assetAmt.toLocaleString()}</span> {tickerInfo?.displayname}</p>
                <p><span className="font-bold mr-2">{satValue.toLocaleString()}</span> sats</p>
              </div>
            </div>

            {/* 当前价格 */}
            <div className="flex justify-start items-center gap-1">
              <span className="text-zinc-500">{t('common.currentPrice')}：</span>
              <span className="text-green-600 font-bold">
                ~ {currentPrice || '--'}
                {/* <span className="text-white ml-1">($<BtcPrice btc={(currentPrice / 100000000).toFixed(8)} />)</span> */}
              </span>
              sats
            </div>
          </div>
        </div>
      </div>
      <div className="mb-6 bg-zinc-900 sm:p-2 rounded-xl shadow-lg shadow-sky-500/50 border border-zinc-700 ">
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
                        const calculatedAmount = (assetBalance.availableAmt * percentage).toFixed(assetAmtRaw.Precision);
                        handleFromAmountChange(calculatedAmount);
                      }}
                      className={`px-2 py-1 rounded bg-zinc-800 text-xs hover:bg-purple-500 hover:text-white ${fromAmount === (assetBalance.availableAmt * Number(value.replace('%', '')) / 100).toFixed(assetAmtRaw.Precision)
                        ? 'bg-purple-500 text-white'
                        : 'text-gray-400'
                        }`}
                    >
                      {value}
                    </button>
                  ))
                ) : (
                  // 买入资产快捷输入
                  ["1000", "5000", "10000", "30000"].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleFromAmountChange(value)}
                      className={`px-2 py-1 rounded  bg-zinc-800 text-xs hover:bg-purple-500 hover:text-white ${fromAmount === value ? 'bg-purple-500 text-white' : 'text-gray-400'
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
              className="w-full input-swap bg-transparent border-none border-zinc-900 rounded-lg px-4 py-2 text-xl sm:text-3xl font-bold text-white pr-16" // 添加右内边距
              placeholder={swapType === 'sats-to-asset' ? t('common.enterSatsAmount') : t('common.enterAssetAmount')}
              min={1}
            />
            <span className="absolute top-1/2 right-4 sm:mr-10 transform -translate-y-1/2 text-zinc-600 text-sm">
              {swapType === 'sats-to-asset' ? 'sats' : tickerInfo?.displayname}
            </span>
          </div>
          {/* 显示余额 */}
          <p className="flex justify-between text-zinc-600 text-xs mt-2 mb-8 px-2">
            <span>{t('common.balance')}: <span className="font-bold">{swapType === 'sats-to-asset' ? displaySatsBalance.toLocaleString() : displayAssetBalance.toLocaleString()} </span> {swapType === 'sats-to-asset' ? 'sats' : tickerInfo?.displayname}
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
            />
            <span className="absolute top-1/2 right-4 sm:mr-10 transform -translate-y-1/2 text-zinc-600 text-sm">
              {swapType === 'sats-to-asset' ? tickerInfo?.displayname : 'sats'}
            </span>
          </div>
          {/* 显示余额 */}
          <p className="text-xs text-zinc-600 mt-1 px-2">
              <span>
                {t('common.balance')}:
                  <span className="font-bold mr-1"> {swapType === 'sats-to-asset' ? displayAssetBalance.toLocaleString() : displaySatsBalance.toLocaleString()}</span> 
                  <span className="font-light">{swapType === 'sats-to-asset' ? tickerInfo?.displayname : 'sats'}</span>
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
      {/* <div className="flex justify-between mb-2 text-sm text-gray-400">
        <span>当前价格: <span className="text-white">{currentPrice || '--'}</span> sats/{tickerInfo?.displayname}</span>
        <span>最少获得: <span className="text-white">{minReceiveValue || '--'}</span> {swapType === 'sats-to-asset' ? tickerInfo?.displayname : 'sats'}</span>
      </div> */}
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
            <div className="text-sm text-gray-400 border-t border-zinc-800 pt-2 mt-2">
              <div className="flex justify-between mb-1">
                <span>{t('common.serviceFee')}(10 sats + 0.8%):</span>
                <span className="text-zinc-400">{serviceFee || '--'} sats</span>
              </div>
              <div className="flex justify-between">
                <span>{t('common.networkFee')}(10 sats / Tx):</span>
                <span className="text-zinc-400">{networkFee || '--'} sats</span>
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
          disabled={isSwapping}
        >
          {isSwapping ? 'Swapping...' : 'SWAP'}
        </Button>
      </WalletConnectBus>
    </div>
  );
};

export default Swap; 