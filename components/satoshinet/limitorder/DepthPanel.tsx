import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@radix-ui/react-dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { useWalletStore } from "@/store";
import { useTranslation } from 'react-i18next';
import { useCommonStore } from "@/store/common";
import { useOrderForm } from './hooks/useOrderForm';
import DepthList, { DepthItem } from './DepthList';
import QuickPriceButtons from './QuickPriceButtons';
import OrderSummary from './OrderSummary';

interface DepthPanelProps {
  contractURL: string;
  asset: string;
  ticker: string;
  tickerInfo: any;
  assetBalance: { availableAmt: number; lockedAmt: number };
  balanceLoading: boolean;
  onOrderSuccess?: () => void;
  depthData: any;
}

export default function DepthPanel({
  asset,
  ticker,
  assetBalance,
  contractURL,
  tickerInfo,
  onOrderSuccess,
  depthData
}: DepthPanelProps) {
  const { t } = useTranslation();
  const { satsnetHeight } = useCommonStore();
  const { balance } = useWalletStore();
  const divisibility = tickerInfo?.divisibility || 0;
  const [sliderValue, setSliderValue] = useState(0); // 滑动条的值

  const handleRowClick = (type: string, selectedPrice: number, selectedQuantity: number) => {
    const price = selectedPrice;
    const quantity = selectedQuantity;
  
    if (type === 'sell') {
      const availableSats = balance.availableAmt;
      const maxBuyQuantity = price > 0 ? Math.floor(availableSats / price) : 0; // 计算买入时的最大数量
      const adjustedQuantity = Math.min(quantity, maxBuyQuantity); // 检查余额，更新为最大可买数量
      updateState({ price: price.toString(), quantity: adjustedQuantity.toString(), orderType: 'buy' });
    } else if (type === 'buy') {
      const availableAssets = assetBalance.availableAmt;
      const adjustedQuantity = Math.min(quantity, availableAssets); // 检查余额，更新为最大可卖数量
      updateState({ price: price.toString(), quantity: adjustedQuantity.toString(), orderType: 'sell' });
    }
  
    //console.log(`Selected Price: ${price}, Adjusted Quantity: ${quantity}`);
  };

  const { state, serviceFee, updateState, handleQuantityChange, handleSubmitClick, handleConfirm } = useOrderForm({
    asset,
    ticker,
    contractURL,
    balance,
    displayAvailableAmt: assetBalance.availableAmt,
    divisibility,
    satsnetHeight,
    depthData,
    onOrderSuccess,
  });

  const maxQuantity = useMemo(() => {
    if (state.orderType === "buy") {
      const price = Number(state.price);
      const availableSats = balance.availableAmt;
      return price > 0 ? Math.floor(availableSats / price) : 0; // 计算买入时的最大数量
    } else {
      return assetBalance.availableAmt; // 卖出时的最大数量
    }
  }, [state.orderType, state.price, balance.availableAmt, assetBalance.availableAmt]);

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    updateState({ quantity: value.toString() }); // 更新下单数量
  };

  // 处理深度数据
  const { sellDepth, buyDepth, maxSellQtyLen, maxBuyQtyLen } = useMemo(() => {
    if (!depthData) return { sellDepth: [], buyDepth: [], maxSellQtyLen: 1, maxBuyQtyLen: 1 };
    console.log('depthData', depthData);
    const processDepth = (depth: any[]) => {
      return depth
        .map((item: any) => ({
          price: Number(item.Price),
          quantity: Number(item.Amt),
          totalValue: Number(item.Value)
        }))
        .filter((item: any) => item.quantity > 0)
        .sort((a: any, b: any) => b.price - a.price);
    };

    const sellDepth = processDepth(depthData.sellDepth?.filter(Boolean) || []);
    const buyDepth = processDepth(depthData.buyDepth?.filter(Boolean) || []);

    const maxSellQtyLen = Math.max(...sellDepth.map(o => o.quantity.toString().length), 1);
    const maxBuyQtyLen = Math.max(...buyDepth.map(o => o.quantity.toString().length), 1);

    return { sellDepth, buyDepth, maxSellQtyLen, maxBuyQtyLen };
  }, [depthData]);
  console.log('sellDepth', sellDepth);
  console.log('buyDepth', buyDepth);

  useEffect(() => {
    const quantity = Number(state.quantity);
    const maxQuantity = state.orderType === "buy"
      ? Math.floor(balance.availableAmt / Number(state.price))
      : assetBalance.availableAmt;
  
    setSliderValue(quantity > maxQuantity ? maxQuantity : quantity); // 更新滑动条位置
  }, [state.price, state.quantity, state.orderType, balance.availableAmt, assetBalance.availableAmt]);

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="w-full">
          <CardContent className="p-2">
            <div className="flex flex-col gap-2">
              <DepthList depth={sellDepth} type="sell" maxQtyLen={maxSellQtyLen} onRowClick={handleRowClick} />
              {/* Spread 显示 */}
              <div className="w-full flex justify-center items-center py-1 bg-zinc-700 text-xs font-semibold text-gray-300 rounded">
                {(() => {
                  const bestBid = buyDepth.length > 0 ? buyDepth[0].price : 0;
                  const bestAsk = sellDepth.length > 0 ? sellDepth[sellDepth.length - 1].price : 0;
                  const spread = bestAsk && bestBid ? (bestAsk - bestBid).toFixed(10) : "--";
                  const spreadPercent = bestAsk && bestBid ? (((bestAsk - bestBid) / bestBid) * 100).toFixed(2) : "--";
                  return (
                    <span className="flex items-center gap-1">
                      {t('common.spread')}&nbsp;
                      <span className="text-white">{spread}</span>
                      &nbsp;<span role="img" aria-label="sats">/</span>
                      &nbsp;<span className="text-gray-400">({spreadPercent}%)</span>
                    </span>
                  );
                })()}
              </div>
              <DepthList depth={buyDepth} type="buy" maxQtyLen={maxBuyQtyLen} onRowClick={handleRowClick} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex flex-col gap-2 flex-wrap">
       {/* 买入/卖出Tabs */}
        <Tabs value={state.orderType} onValueChange={(value) => updateState({ orderType: value })} className="w-full">
          <TabsList className="flex gap-4">
            <TabsTrigger value="buy" className={`w-full px-4 py-2 rounded-xl ${state.orderType === 'buy' ? 'bg-purple-500 text-white btn-gradient' : 'bg-zinc-800 text-gray-400'}`}>
              {t('common.limitorder_buy')}
            </TabsTrigger>
            <TabsTrigger value="sell" className={`w-full px-4 py-2 rounded-xl ${state.orderType === 'sell' ? 'bg-purple-500 text-white btn-gradient' : 'bg-zinc-800 text-gray-400'}`}>
              {t('common.limitorder_sell')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-2 flex flex-col gap-4 flex-wrap">
          <Label className="text-sm text-gray-500">{t('common.limitorder_price')}</Label>
          <QuickPriceButtons
            price={state.price}
            setPrice={(value) => updateState({ price: value })}
            sellDepth={sellDepth}
            buyDepth={buyDepth}
          />
          <div className="relative w-full">
            {/* <span className="flex justify-start items-center text-sm text-gray-500 gap-2"> */}
            <Input
              type="number"
              placeholder={t('common.limitorder_placeholder_price')}
              value={state.price}
              onChange={(e) => updateState({ price: e.target.value })} // 更新 state.price
              className="h-10 text-zinc-200"
              min={1}
              required
            />

            <span className="absolute top-1/2 right-4 sm:mr-10 transform -translate-y-1/2 text-zinc-600 text-sm">
              {t('common.sats')}
            </span>
          </div>
          <Label className="text-sm text-gray-500">{t('common.quantity')}</Label>
          <div className="relative w-full">
            <Input
              type="number"
              placeholder={t('common.limitorder_placeholder_quantity')}
              value={state.quantity}
              onChange={(e) => updateState({ quantity: e.target.value })} // 更新 state.quantity
              className="h-10"
              min={1}
              step={divisibility === 0 ? "1" : `0.${"0".repeat(divisibility - 1)}1`}
              onKeyDown={(e) => {
                // 当 divisibility 为 0 时，阻止输入小数点
                if (divisibility === 0 && e.key === '.') {
                  e.preventDefault();
                }
              }}
              required
            />
            <span className="absolute top-1/2 right-4 sm:mr-10 transform -translate-y-1/2 text-zinc-600 text-sm">
              {ticker}
            </span>
          </div>
          
          {/* 滑动条 */}
          <div className="relative mt-2">
            {/* <Label className="text-sm text-gray-500">{t("common.slider_quantity")}</Label> */}
           
           {/* 显示百分比 */}
           <div
              className="absolute mx-2 text-xs text-gray-400"
              style={{
                left: `${(sliderValue / maxQuantity) * 100}%`,
                transform: "translateX(-50%)",
                top: "-14px", // 调整位置到滑动条上方
              }}
            >
              {sliderValue > 0 ? `${((sliderValue / maxQuantity) * 100).toFixed(2)}%` : "0%"}
            </div>

            {/* 刻度节点 */}
            <div className="relative w-full h-2 rounded-lg z-1">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className={`absolute w-2 h-2 ${index === 0 ? "ml-1" : index === 4 ? "mr-2" : "bg-gray-600"} rounded-full`}
                style={{
                  left: `${(index / 4) * 100}%`, // 5等分，节点位置
                  transform: "translateX(-50%)",
                  top: "8px", // 确保与滑动条对齐
                }}
              />
            ))}
          </div>

            <input
              type="range"
              min="0"
              max={maxQuantity}
              value={sliderValue}
              onChange={(e) => {
                const value = Number(e.target.value);
                setSliderValue(value);
                updateState({ quantity: value.toString() }); // 更新数量
              }}
              className="absolute w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: sliderValue === 0
                  ? "#374151" // 全灰色背景
                  : `linear-gradient(to right, #22c55e ${(sliderValue / maxQuantity) * 100}%, #374151 ${(sliderValue / maxQuantity) * 100}%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-4">
              <span>0</span>
              <span>{maxQuantity}</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm gap-1 text-zinc-500">
            <span>{t('common.availableBalance')} </span>
            <span className="gap-1">
              {state.orderType === 'buy'
                ? `${balance.availableAmt} ${t('common.sats')}`
                : `${assetBalance.availableAmt} ${ticker}`
              }
            </span>
          </p>

          <OrderSummary
            orderType={state.orderType}
            price={state.price}
            quantity={state.quantity}
            serviceFee={serviceFee}
            balance={balance}
            displayAvailableAmt={assetBalance.availableAmt}
            ticker={ticker}
          />
          <WalletConnectBus asChild>
            <Button onClick={handleSubmitClick} disabled={state.isPlacingOrder} className="min-w-[80px] btn-gradient h-11">
              {state.isPlacingOrder ? t('common.submitting') : t('common.submit')}
            </Button>
          </WalletConnectBus>
        </div>
      </div>

      <Dialog open={state.showConfirm} onOpenChange={(value) => updateState({ showConfirm: value })}>
        <DialogContent>
          {state.orderType === 'buy' ? (
            <>
              <div className="items-center font-bold text-lg border-b border-zinc-700 pb-4">
               <span className="mr-4">{t('common.orderSummary')}</span> <span className="bg-green-800/90 text-xs px-3 py-2 rounded-xl">{state.orderType === 'buy' ? <> {t('common.limitorder_buy')} </> : <> {t('common.limitorder_sell')} </>}</span>
              </div>

              <div className="font-bold text-lg my-2 flex justify-between">
                <span>{t('common.estPay')}</span>
                <span>{state.confirmData.paySats} <span className="text-zinc-500 ml-1">{t('common.sats')}</span></span>
              </div>
              <div className="flex justify-between"><span className="text-zinc-400">{t('common.value')}</span><span className="text-zinc-400">{state.confirmData.value} <span className="text-zinc-500 ml-1">{t('common.sats')}</span></span></div>
              <div className="flex justify-between"><span className="text-zinc-400">{t('common.serviceFee')}</span><span className="text-zinc-400">{state.confirmData.feeSats} <span className="text-zinc-500 ml-1">{t('common.sats')}</span></span></div>
              <div className="flex justify-between"><span className="text-zinc-400">{t('common.networkFee')}</span><span className="text-zinc-400">{state.confirmData.netFeeSats} <span className="text-zinc-500 ml-1">{t('common.sats')}</span></span></div>
             
            </>
          ) : (
            <>
              <div className="items-center font-bold text-lg border-b border-zinc-800 pb-4">
                <span className="mr-4">{t('common.orderSummary')}</span><span className="bg-red-800/80 text-xs px-3 py-2 rounded-xl">{state.orderType === 'buy' ? <> {t('common.limitorder_buy')} </> : <> {t('common.limitorder_sell')} </>}</span>
              </div>

              <div className="flex justify-between">
                <span>{t('common.estReceive')}</span>
                <span>{state.confirmData.value} <span className="text-zinc-500 ml-1">{t('common.sats')}</span></span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">{t('common.networkFee')}</span>
                <span className="text-zinc-400">{state.confirmData.netFeeSats} 
                 <span className="text-zinc-500 ml-1">{t('common.sats')}</span>
                </span>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <span className="text-zinc-400">{t('common.limitorder_price')}</span>
            <span className="text-zinc-400">{state.confirmData.bidPrice} 
            <span className="text-zinc-500 ml-1">{t('common.sats')}</span></span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">{t('common.walletBalance')}</span>
            <span className="text-zinc-400">{balance.availableAmt.toLocaleString()} 
            <span className="text-zinc-500 ml-1">{t('common.sats')}</span></span>
          </div>
          <DialogFooter>
            <Button className="w-32 btn-gradient" onClick={handleConfirm}>{t('buttons.submit')}</Button>
            <Button className="w-32" variant="outline" onClick={() => updateState({ showConfirm: false })}>{t('buttons.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 