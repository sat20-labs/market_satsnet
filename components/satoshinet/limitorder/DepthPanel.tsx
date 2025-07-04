import React, { useMemo } from "react";
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

  const [price, setPrice] = React.useState('');
  const [quantity, setQuantity] = React.useState('');

  const handleRowClick = (selectedPrice: number, selectedQuantity: number) => {
    updateState({ price: selectedPrice.toString(), quantity: selectedQuantity.toString() });
    console.log(`xxxxxxx Selected Price: ${selectedPrice}, Quantity: ${selectedQuantity}`);
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
  
  return (
    <>
     <Tabs value={state.orderType} onValueChange={(value) => updateState({ orderType: value })} className="w-full">
          <TabsList className="flex gap-4">
            <TabsTrigger value="buy" className={`w-full px-4 py-2 rounded ${state.orderType === 'buy' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-gray-400'}`}>
              {t('common.limitorder_buy')}
            </TabsTrigger>
            <TabsTrigger value="sell" className={`w-full px-4 py-2 rounded ${state.orderType === 'sell' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-gray-400'}`}>
              {t('common.limitorder_sell')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

      <div className="flex flex-col md:flex-row pt-4 gap-4">
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
              <DepthList depth={buyDepth} type="buy" maxQtyLen={maxBuyQtyLen} onRowClick={handleRowClick}/>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex flex-col gap-2 flex-wrap">
        {/* <Select value={state.orderType} onValueChange={(value) => updateState({ orderType: value })}>
          <SelectTrigger className="w-36 h-14 bg-white text-zinc-300 border px-2 py-2 rounded">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="buy">{t('common.limitorder_buy')}</SelectItem>
            <SelectItem value="sell">{t('common.limitorder_sell')}</SelectItem>
          </SelectContent>
        </Select> */}
        
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
            step={divisibility === 0 ? "1" : `0.${"0".repeat(divisibility-1)}1`}
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
          <div className={`font-bold text-lg mb-2 text-center ${state.orderType === 'sell' ? 'text-red-500' : 'text-green-500'}`}>
            {state.orderType === 'buy' ? t('common.limitorder_buy') : t('common.limitorder_sell')}
          </div>
          {state.orderType === 'buy' ? (
            <>
              <div className="font-bold text-lg mb-2">
                <span>{t('common.orderSummary')}</span>
              </div>
              <div className="flex justify-between"><span>{t('common.value')}</span><span>{state.confirmData.value} {t('common.sats')}</span></div>
              <div className="flex justify-between"><span>{t('common.serviceFee')}</span><span>{state.confirmData.feeSats} {t('common.sats')}</span></div>
              <div className="flex justify-between"><span>{t('common.networkFee')}</span><span>{state.confirmData.netFeeSats} {t('common.sats')}</span></div>
              <div className="font-bold text-lg my-2 flex justify-between">
                <span>{t('common.estPay')}</span>
                <span>{state.confirmData.paySats} {t('common.sats')}</span>
              </div>
            </>
          ) : (
            <>
              <div className="font-bold text-lg mb-2">
                <span>{t('common.orderSummary')}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('common.estReceive')}</span>
                <span>{state.confirmData.value} {t('common.sats')}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('common.networkFee')}</span>
                <span>{state.confirmData.netFeeSats} {t('common.sats')}</span>
              </div>
            </>
          )}

          <div className="flex justify-between"><span>{t('common.limitorder_price')}</span><span>{state.confirmData.bidPrice} {t('common.sats')}</span></div>
          <div className="flex justify-between"><span>{t('common.walletBalance')}</span><span>{balance.availableAmt.toLocaleString()} {t('common.sats')}</span></div>
          <DialogFooter>
            <Button onClick={handleConfirm}>{t('buttons.submit')}</Button>
            <Button variant="outline" onClick={() => updateState({ showConfirm: false })}>{t('buttons.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 