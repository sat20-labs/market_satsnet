import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@radix-ui/react-dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import { useWalletStore } from "@/store";
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCommonStore } from "@/store/common";
import { toast } from "sonner";
import { getContractStatus } from '@/api/market';


// 直接内联 DepthList 组件
function DepthList({ depth, type, maxQtyLen }: { depth: { price: number; quantity: number; totalValue: number }[]; type: 'buy' | 'sell'; maxQtyLen: number }) {
  const isSell = type === 'sell';
  const { t } = useTranslation();
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 font-semibold px-1 pb-1">
        <span>{t('common.limitorder_price')}</span>
        <span>{t('common.limitorder_quantity')}</span>
        <span>{t('common.limitorder_total')}</span>
      </div>
      <div className="h-48 overflow-y-auto">
        {depth.map((order, i, arr) => {
          const cumQty = isSell
            ? arr.slice(i).reduce((sum, o) => sum + o.quantity, 0)
            : arr.slice(0, i + 1).reduce((sum, o) => sum + o.quantity, 0);
          const maxCumQty = arr.reduce((sum, o) => sum + o.quantity, 0);
          const widthPercent = maxCumQty ? (cumQty / maxCumQty) * 100 : 0;
          return (
            <div key={i} className={`relative flex justify-between text-${isSell ? 'red' : 'green'}-500 text-sm px-1 py-0.5`}>
              <div
                className="absolute left-0 top-0 h-full z-0"
                style={{
                  width: `${widthPercent}%`,
                  background: isSell ? "rgba(188,2,215,0.1)" : "rgba(1,185,22,0.1)",
                }}
              />
              <span className="relative z-10">{order.price}</span>
              <span className="relative z-10" style={{ minWidth: maxQtyLen + "ch", textAlign: "right" }}>{order.quantity}</span>
              <span className="relative z-10" style={{ minWidth: "8ch", textAlign: "right" }}>{(order.totalValue / 100_000_000).toFixed(8)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type DepthItem = { price: number; quantity: number };

interface QuickPriceButtonsProps {
  price: string;
  setPrice: (v: string) => void;
  sellDepth: DepthItem[];
  buyDepth: DepthItem[];
}

const QuickPriceButtons: React.FC<QuickPriceButtonsProps> = ({
  price,
  setPrice,
  sellDepth,
  buyDepth,
}) => {
  // 计算最低卖价、最高买价、中间价
  const { lowestAsk, topBid, mid } = useMemo(() => {
    const validSell = sellDepth?.filter((d) => d.price > 0);
    const validBuy = buyDepth?.filter((d) => d.price > 0);
    const lowestAsk = validSell?.length ? validSell[validSell.length - 1].price : undefined;
    const topBid = validBuy?.length ? validBuy[0].price : undefined;
    const mid =
      lowestAsk !== undefined && topBid !== undefined
        ? (lowestAsk + topBid) / 2
        : undefined;
    return {
      lowestAsk,
      topBid,
      mid,
    };
  }, [sellDepth, buyDepth]);

  const { t } = useTranslation();
  // 按钮配置
  const buttons = [
    {
      label: t('common.limitorder_lowest'),
      value: lowestAsk,
      onClick: () => lowestAsk !== undefined && setPrice(String(lowestAsk)),
      selected: price === String(lowestAsk),
      disabled: lowestAsk === undefined,
    },
    {
      label: t('common.limitorder_mid'),
      value: mid,
      onClick: () => mid !== undefined && setPrice(String(mid)),
      selected: price === String(mid),
      disabled: mid === undefined,
    },
    {
      label: t('common.limitorder_topbid'),
      value: topBid,
      onClick: () => topBid !== undefined && setPrice(String(topBid)),
      selected: price === String(topBid),
      disabled: topBid === undefined,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-2">
      {buttons.map((btn) => (
        <Button
          key={btn.label}
          type="button"
          variant="outline"
          className={`flex flex-col items-center justify-center text-xs h-16 ${btn.selected ? "btn-gradient" : "bg-gray-700"
            }`}
          size="sm"
          onClick={btn.onClick}
          disabled={btn.disabled}
        >
          {btn.label}
          <span className="ml-1 text-xs text-gray-400">
            {btn.value !== undefined ? btn.value : "--"}
          </span>
        </Button>
      ))}
    </div>
  );
};

interface DepthPanelProps {
  contractURL: string;
  assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
  tickerInfo: any;
  assetBalance: { availableAmt: number; lockedAmt: number };
  balanceLoading: boolean;
  onOrderSuccess?: () => void;
}

export default function DepthPanel({
  assetInfo,
  tickerInfo,
  assetBalance,
  contractURL,
  onOrderSuccess
}: DepthPanelProps) {
  const { t } = useTranslation();
  const { satsnetHeight } = useCommonStore();
  const { balance } = useWalletStore();
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [orderType, setOrderType] = useState("buy");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [confirmData, setConfirmData] = useState({
    paySats: '',
    bidPrice: '',
    feeSats: '',
    netFeeSats: '',
    walletSats: ''
  });


  const displayAvailableAmt = assetBalance.availableAmt;


  const { data: depthData } = useQuery({
    queryKey: ["depthData", contractURL],
    queryFn: async () => {
      if (!contractURL) return null;
      const { status } = await getContractStatus(contractURL);
      return status ? JSON.parse(status) : null;
    },
    enabled: !!contractURL,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });
  console.log('depthData', depthData);
  // 处理深度数据
  const { sellDepth, buyDepth, maxSellQtyLen, maxBuyQtyLen } = useMemo(() => {
    if (!depthData) return { sellDepth: [], buyDepth: [], maxSellQtyLen: 1, maxBuyQtyLen: 1 };

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

    const sellDepth = processDepth(depthData.sellDepth || []);
    const buyDepth = processDepth(depthData.buyDepth || []);

    const maxSellQtyLen = Math.max(...sellDepth.map(o => o.quantity.toString().length), 1);
    const maxBuyQtyLen = Math.max(...buyDepth.map(o => o.quantity.toString().length), 1);

    return { sellDepth, buyDepth, maxSellQtyLen, maxBuyQtyLen };
  }, [depthData]);

  const handleSubmitClick = async () => {
    console.log('satsnetHeight', satsnetHeight);
    console.log('depthData?.enableBlock', depthData?.enableBlock);

    if (satsnetHeight < depthData?.enableBlock) {
      console.log('satsnetHeight < depthData?.enableBlock');
      toast.error('Please wait for the contract to be enabled');
      return;
    }
    const priceNum = parseFloat(price);
    const quantityNum = parseFloat(quantity);

    if (!price || isNaN(priceNum) || priceNum <= 0) {
      toast.error('价格必须大于0');
      return;
    }
    if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
      toast.error('数量必须大于0');
      return;
    }

    // 计算订单金额和费用
    const _asset = orderType === 'buy' ? '::' : assetInfo.assetName;
    const unitPrice = priceNum.toString();
    const amt = orderType === 'buy' ? Math.ceil(quantityNum * priceNum) : Math.ceil(quantityNum);
    const serviceFee = orderType === 'buy' ? 10 + Math.ceil(amt * 0.008) : 0;

    // 设置确认对话框数据
    setConfirmData({
      paySats: amt.toString(),
      bidPrice: unitPrice,
      feeSats: serviceFee.toString(),
      netFeeSats: (amt + serviceFee).toString(),
      walletSats: balance.availableAmt.toString()
    });

    // 显示确认对话框
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsPlacingOrder(true);

    const priceNum = parseFloat(price);
    const quantityNum = parseFloat(quantity);
    const _asset = orderType === 'buy' ? '::' : assetInfo.assetName;
    const unitPrice = priceNum.toString();
    const amt = orderType === 'buy' ? Math.ceil(quantityNum * priceNum) : quantityNum;
    const serviceFee = orderType === 'buy' ? Math.max(10, Math.ceil(amt * 0.008)) : 0;

    const params = {
      action: 'swap',
      param: JSON.stringify({
        orderType: orderType === 'buy' ? 2 : 1,
        assetName: assetInfo.assetName,
        amt: quantityNum.toString(),
        unitPrice: unitPrice
      })
    };

    try {
      const result = await window.sat20.invokeContractV2_SatsNet(
        contractURL, JSON.stringify(params), _asset, amt.toString(), '1', {
        action: 'swap',
        orderType: orderType === 'buy' ? 2 : 1,
        assetName: assetInfo.assetName,
        amt: quantityNum.toString(),
        unitPrice: unitPrice,
        quantity: quantityNum,
        serviceFee: serviceFee,
        netFeeSats: 10,
      });
      const { txId } = result;
      if (txId) {
        toast.success(`Order placed successfully, txid: ${txId}`);
        setIsPlacingOrder(false);
        setPrice("");
        setQuantity("");
        if (onOrderSuccess) onOrderSuccess();
        return;
      } else {
        toast.error('Order placement failed');
      }
    } catch (error) {
      toast.error('Order placement failed');
    }
    setIsPlacingOrder(false);
    setPrice("");
    setQuantity("");
  };
  console.log('sellDepth', sellDepth);
  console.log('buyDepth', buyDepth);
  
  return (
    <>

      <div className="flex flex-col md:flex-row gap-4">
        <Card className="w-full">
          <CardContent className="p-2">
            <div className="flex flex-col gap-2">
              <DepthList depth={sellDepth} type="sell" maxQtyLen={maxSellQtyLen} />
              {/* Spread 显示 */}
              <div className="w-full flex justify-center items-center py-1 bg-zinc-700 text-xs font-semibold text-gray-300 rounded">
                {(() => {
                  const bestBid = buyDepth.length > 0 ? buyDepth[0].price : 0;
                  const bestAsk = sellDepth.length > 0 ? sellDepth[sellDepth.length - 1].price : 0;
                  const spread = bestAsk && bestBid ? (bestAsk - bestBid).toFixed(10) : "--";
                  const spreadPercent = bestAsk && bestBid ? (((bestAsk - bestBid) / bestBid) * 100).toFixed(2) : "--";
                  return (
                    <span className="flex items-center gap-1">
                      Spread&nbsp;
                      <span className="text-white">{spread}</span>
                      &nbsp;<span role="img" aria-label="sats">🐶</span>
                      &nbsp;<span className="text-gray-400">({spreadPercent}%)</span>
                    </span>
                  );
                })()}
              </div>
              <DepthList depth={buyDepth} type="buy" maxQtyLen={maxBuyQtyLen} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex flex-col gap-2 flex-wrap">
        <Select value={orderType} onValueChange={setOrderType}>
          <SelectTrigger className="w-36 h-14 bg-white text-zinc-300 border px-2 py-2 rounded">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="buy">{t('common.limitorder_buy')}</SelectItem>
            <SelectItem value="sell">{t('common.limitorder_sell')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="mt-2 flex flex-col gap-4 flex-wrap">
          <Label className="text-sm text-gray-500">Price (sats)</Label>
          <QuickPriceButtons price={price} setPrice={setPrice} sellDepth={sellDepth} buyDepth={buyDepth} />
          <span className="flex justify-start items-center text-sm text-gray-500 gap-2">
            <Input
              type="number"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-10 text-zinc-200"
              min={1}
              required
            /> sats
          </span>
          <Label className="text-sm text-gray-500">Quantity</Label>
          <Input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-10"
            min={1}
            required
          />

          <div className="gap-2 mb-4 bg-zinc-800/50 rounded-lg p-4 min-h-[100px] text-sm">
            <p className="flex justify-between gap-1 text-gray-400">
              <span>{t('common.availableBalance')} </span>
              <span className="gap-1">
                {orderType === 'buy'
                  ? `${balance.availableAmt.toLocaleString()} ${t('common.sats')}`
                  : `${displayAvailableAmt.toLocaleString()} ${tickerInfo?.displayname}`
                }
              </span>
            </p>

            {orderType === 'buy' && quantity !== "" && price !== "" && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="flex justify-between font-medium text-gray-400">
                  {t('common.estPay')} <span className="font-semibold text-zinc-200 gap-2">
                    {Math.ceil(Number(quantity) * Number(price)).toLocaleString()} {t('common.sats')}
                  </span>
                </p>
              </div>
            )}

            {orderType === 'sell' && quantity !== "" && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="flex justify-between font-medium text-gray-400">
                  {t('common.estReceive')} <span className="font-semibold text-zinc-200 gap-2">
                    {Math.ceil(Number(quantity) * Number(price)).toLocaleString()} {t('common.sats')}
                  </span>
                </p>
              </div>
            )}
          </div>
          <WalletConnectBus asChild>
            <Button onClick={handleSubmitClick} disabled={isPlacingOrder} className="min-w-[80px] btn-gradient h-11">
              {isPlacingOrder ? "Submitting..." : "Submit"}
            </Button>
          </WalletConnectBus>

        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <div className="font-bold text-lg mb-2 flex justify-between">
            <span>You Pay</span>
            <span>{confirmData.paySats} sats</span>
          </div>
          <div className="flex justify-between"><span>Bid Price</span><span>{confirmData.bidPrice} sats</span></div>
          {
            confirmData.feeSats && (<div className="flex justify-between"><span>Marketplace Fee </span><span>{confirmData.feeSats} sats</span></div>)
          }

          <div className="flex justify-between"><span>Wallet Balance</span><span>{balance.availableAmt.toLocaleString()} sats</span></div>
          <DialogFooter>
            <Button onClick={handleConfirm}>确认提交</Button>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 