import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@radix-ui/react-dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// 直接内联 DepthList 组件
function DepthList({ depth, type, maxQtyLen }: { depth: { price: number; quantity: number }[]; type: 'buy' | 'sell'; maxQtyLen: number }) {
  const isSell = type === 'sell';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 font-semibold px-1 pb-1">
        <span>Price (sats)</span>
        <span>Quantity</span>
        <span>Total(BTC)</span>
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
              <span className="relative z-10" style={{ minWidth: "8ch", textAlign: "right" }}>{((order.price * order.quantity) / 100_000_000).toFixed(8)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 直接内联 QuickPriceButtons 组件
function QuickPriceButtons({ price, setPrice, sellDepth, buyDepth }: { price: number; setPrice: (v: number) => void; sellDepth: any[]; buyDepth: any[] }) {
  const lowestAskRaw = sellDepth.length > 0 ? sellDepth[sellDepth.length - 1].price : 0;
  const topBidRaw = buyDepth.length > 0 ? buyDepth[0].price : 0;
  const midRaw = sellDepth.length > 0 && buyDepth.length > 0 ? (lowestAskRaw + topBidRaw) / 2 : 0;
  const lowestAsk = Math.round(lowestAskRaw);
  const topBid = Math.round(topBidRaw);
  const mid = Math.round(midRaw);
  return (
    <div className="flex gap-2 sm:gap-4 mb-2">
      <Button
        type="button"
        variant="outline"
        className={`flex flex-col items-center justify-center sm:-4 sm:px-8 h-16 ${price === lowestAsk ? "btn-gradient" : "bg-gray-700"}`}
        size="sm"
        onClick={() => setPrice(lowestAsk)}
      >
        Lowest Ask
        <span className="ml-1 text-xs text-gray-400">{lowestAsk || "--"}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className={`flex flex-col items-center justify-center px-8 h-16 ${price === mid ? "btn-gradient" : "bg-gray-700"}`}
        size="sm"
        onClick={() => setPrice(mid)}
      >
        Mid
        <span className="ml-1 text-xs text-gray-400">{mid || "--"}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className={`flex flex-col items-center justify-center px-8 h-16 ${price === topBid ? "btn-gradient" : "bg-gray-700"}`}
        size="sm"
        onClick={() => setPrice(topBid)}
      >
        Top Bid
        <span className="ml-1 text-xs text-gray-400">{topBid || "--"}</span>
      </Button>
    </div>
  );
}

export default function DepthPanel({
  sellDepth,
  buyDepth,
  maxSellQtyLen,
  maxBuyQtyLen,
  orderType,
  setOrderType,
  price,
  setPrice,
  quantity,
  setQuantity,
  isPlacingOrder,
  submitHandler
}: {
  sellDepth: any[],
  buyDepth: any[],
  maxSellQtyLen: number,
  maxBuyQtyLen: number,
  orderType: string,
  setOrderType: (v: string) => void,
  price: number,
  setPrice: (v: number) => void,
  quantity: number,
  setQuantity: (v: number) => void,
  isPlacingOrder: boolean,
  submitHandler: () => void
}) {
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
                  const spread = bestAsk && bestBid ? (bestAsk - bestBid).toFixed(3) : "--";
                  const spreadPercent = bestAsk && bestBid ? (((bestAsk - bestBid) / bestAsk) * 100).toFixed(2) : "--";
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
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="sell">Sell</SelectItem>
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
              onChange={(e) => setPrice(parseFloat(e.target.value))}
              className="h-10"
              min={1}
              required
            /> sats
          </span>
          <Label className="text-sm text-gray-500">Quantity</Label>
          <Input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value))}
            className="h-10"
            min={1}
            required
          />
          <Button onClick={submitHandler} disabled={isPlacingOrder} className="min-w-[80px]">
            {isPlacingOrder ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </>
  );
} 