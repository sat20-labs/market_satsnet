import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import axios from "axios";
import { Label } from "@radix-ui/react-dropdown-menu";
import { useSupportedContracts } from "@/lib/hooks/useSupportedContracts";
/*
status mock data:
{
    "contractType": "swap.tc",
    "startBlock": 0,
    "endBlock": 0,
    "assetName": {
        "Protocol": "ordx",
        "Type": "f",
        "Ticker": "dogcoin"
    },
    "deployTime": 1749097991,
    "status": 100,
    "enableBlock": 1309,
    "currentBlock": 1307,
    "deployer": "tb1pvcdrd5gumh8z2nkcuw9agmz7e6rm6mafz0h8f72dwp6erjqhevuqf2uhtv",
    "resvId": 1749097991934681,
    "channelId": "tb1qw86hsm7etf4jcqqg556x94s6ska9z0239ahl0tslsuvr5t5kd0nq7vh40m",
    "AssetAmtInPool": null,
    "SatsValueInPool": 0,
    "TotalDealAssets": null,
    "TotalDealSats": 0,
    "TotalDealCount": 0,
    "TotalInvalidCount": 0,
    "TotalInvalidAmt": null,
    "TotalInvalidSats": 0,
    "dealPrice": "0",
    "buyDepth": [
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        }
    ],
    "sellDepth": [
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        },
        {
            "Price": "0",
            "Amt": "0"
        }
    ]
}
*/
const getSwapContractUrl = async (assetName: string) => {
  const result = await window.sat20.getDeployedContractsInServer();
  const { contractURLs = [] } = result;
  const list = contractURLs.filter(c => c.indexOf(assetName) > -1);
  return list[0];
}
const getSwapStatus = async (contractUrl: string) => {
  const result = await window.sat20.getDeployedContractStatus(contractUrl);
  return result?.contractStatus ? JSON.parse(result?.contractStatus) : null;
}

export default function OrderBook({ tickerInfo }: { tickerInfo: any }) {
  console.log('tickerInfo', tickerInfo);
  const assetName = `${tickerInfo.name.Protocol}:${tickerInfo.name.Type}:${tickerInfo.name.Ticker}`;
  const [swapContractUrl, setSwapContractUrl] = useState<string | null>(null);
  const [swapStatus, setSwapStatus] = useState<any | null>(null);
  useEffect(() => {
    getSwapContractUrl(tickerInfo.displayname).then(url => {
      setSwapContractUrl(url);
    });
  }, [tickerInfo.displayname]);

  useEffect(() => {
    if (swapContractUrl) {
      getSwapStatus(swapContractUrl).then(status => {
        console.log('status', status);
        setSwapStatus(status);
      });
    }
  }, [swapContractUrl]);
  console.log('swapStatus', swapStatus);

  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [orderType, setOrderType] = useState("buy");
  const [myOrders, setMyOrders] = useState<{ id: number; side: string; price: number; quantity: number; status: string }[]>([]);
  const [tradeHistory, setTradeHistory] = useState<{ time: string; price: number; quantity: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [refreshIntervalId, setRefreshIntervalId] = useState<NodeJS.Timeout | null>(null);

  const [expireType, setExpireType] = useState("30d");
  const [expireDate, setExpireDate] = useState<Date | null>(null);

  // 过期时间选项
  const expireOptions = [
    { value: "ioc", label: "IOC (立即成交或取消)" },
    { value: "gtc", label: "GTC (一直有效)" },
    { value: "1h", label: "1 Hour" },
    { value: "1d", label: "1 Day" },
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "custom", label: "Custom" },
  ];

  // 过期时间变化时自动设置日期
  useEffect(() => {
    if (expireType === "custom") return;
    let date: Date | null = new Date();
    switch (expireType) {
      case "1h":
        date.setHours(date.getHours() + 1);
        break;
      case "1d":
        date.setDate(date.getDate() + 1);
        break;
      case "7d":
        date.setDate(date.getDate() + 7);
        break;
      case "30d":
        date.setDate(date.getDate() + 30);
        break;
      case "ioc":
      case "gtc":
        date = null;
        break;
    }
    setExpireDate(date);
  }, [expireType]);

  // 状态样式映射
  // 状态名说明
  // open 当前未成交，挂在订单簿上 
  // partially_filled 已部分成交，还有剩余可成交数量 
  // filled 完全成交 
  // cancelled 用户取消 
  // expired 超过有效时间或条件失效
  const statusColor = {
    open: "bg-blue-500 text-blue-700 border-blue-400",
    partially_filled: "bg-yellow-500 text-yellow-800 border-yellow-400",
    filled: "bg-green-500 text-green-700 border-green-400",
    cancelled: "bg-gray-600 text-gray-500 border-gray-400",
    expired: "bg-red-500 text-red-700 border-red-400",
  };

  // 计算最大数量宽度对齐的变量，直接依赖 swapStatus 的数据
  const sellDepth = (swapStatus && swapStatus.sellDepth) ? swapStatus.sellDepth.map((item: any) => ({
    price: Number(item.Price),
    quantity: Number(item.Amt),
  })).filter(o => o.price > 0 && o.quantity > 0) : [];
  const buyDepth = (swapStatus && swapStatus.buyDepth) ? swapStatus.buyDepth.map((item: any) => ({
    price: Number(item.Price),
    quantity: Number(item.Amt),
  })).filter(o => o.price > 0 && o.quantity > 0) : [];
  console.log('sellDepth', sellDepth);
  console.log('buyDepth', buyDepth);
  const maxSellQtyLen = Math.max(...sellDepth.map(o => o.quantity.toString().length), 1);
  const maxBuyQtyLen = Math.max(...buyDepth.map(o => o.quantity.toString().length), 1);

  // useEffect 初始化时不再调用 fetchOrders（已由 swapStatus 触发）
  useEffect(() => {
    fetchMyOrders();
    fetchTradeHistory();

    const intervalId = setInterval(() => {
      fetchMyOrders();
      fetchTradeHistory();
    }, 10000);
    setRefreshIntervalId(intervalId);

    return () => clearInterval(intervalId);
  }, []);

  const fetchMyOrders = async () => {
    // try {
    //   const { data } = await axios.get("/api/my-orders");
    //   setMyOrders(data);
    // } catch (err) {
    //   console.error("Failed to fetch my orders", err);
    // }

    setMyOrders([]); // 这里直接设为空数组，后续可接入真实数据
  };

  const fetchTradeHistory = async () => {
    // try {
    //   const { data } = await axios.get("/api/trade-history");
    //   setTradeHistory(data);
    // } catch (err) {
    //   console.error("Failed to fetch trade history", err);
    // }
    setTradeHistory([]); // 这里直接设为空数组，后续可接入真实数据
  };

  const submitHandler = async () => {
    setIsPlacingOrder(true);
    const params = {
      action: 'swap',
      param: JSON.stringify({
        orderType: orderType === 'buy' ? 2 : 1,
        assetName: assetName,
        unitPrice: price.toString()
      })
    };
    const result = await window.sat20.invokeContractV2_SatsNet(
      swapContractUrl, JSON.stringify(params), assetName, quantity.toString(), '1');
    setIsPlacingOrder(false);
    fetchMyOrders();
    setPrice(0);
    setQuantity(0);
  };

  return (
    <Tabs defaultValue="depth" className="w-full mt-4">
      <TabsList className="mb-2">
        <TabsTrigger value="depth">Depth</TabsTrigger>
        <TabsTrigger value="myOrders">My Orders</TabsTrigger>
        <TabsTrigger value="trades">History</TabsTrigger>
      </TabsList>

      <TabsContent value="depth">
        <div className="flex flex-col md:flex-row gap-4">
          <Card className="w-full">
            <CardContent className="p-2">
              <div className="flex flex-col gap-2">
                {/* 卖单深度（上） */}
                <div className="w-full">
                  <div className="flex justify-between text-xs text-gray-400 font-semibold px-1 pb-1">
                    <span>Price (sats)</span>
                    <span>Quantity</span>
                    <span>Total(BTC)</span>
                  </div>
                  <ScrollArea className="h-48">
                    {sellDepth.map((order, i, arr) => {
                      // 累计数量应从顶部（最远价）到当前行
                      const cumQty = arr.slice(i).reduce((sum, o) => sum + o.quantity, 0);
                      const maxCumQty = arr.reduce((sum, o) => sum + o.quantity, 0);
                      const widthPercent = (cumQty / maxCumQty) * 100;
                      return (
                        <div key={i} className="relative flex justify-between text-red-500 text-sm px-1 py-0.5">
                          {/* 背景柱状 */}
                          <div
                            className="absolute left-0 top-0 h-full z-0"
                            style={{
                              width: `${widthPercent}%`,
                              background: "rgba(188,2,215,0.1)",
                            }}
                          />
                          <span className="relative z-10">{order.price}</span>
                          <span className="relative z-10" style={{ minWidth: maxSellQtyLen + "ch", textAlign: "right" }}>{order.quantity}</span>
                          <span className="relative z-10" style={{ minWidth: "8ch", textAlign: "right" }}>{((order.price * order.quantity) / 100_000_000).toFixed(8)}</span>
                        </div>
                      );
                    })}
                  </ScrollArea>
                </div>

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

                {/* 买单深度（下） */}
                <div className="w-full mt-1">
                  <div className="flex justify-between text-xs text-gray-400 font-semibold px-1 pb-1">
                    <span>Price (sats)</span>
                    <span>Quantity</span>
                    <span>Total(BTC)</span>
                  </div>
                  <ScrollArea className="h-48">
                    {buyDepth.map((order, i, arr) => {
                      // 买单累计数量从顶部（最优价）到当前行
                      const cumQty = arr.slice(0, i + 1).reduce((sum, o) => sum + o.quantity, 0);
                      const maxCumQty = arr.reduce((sum, o) => sum + o.quantity, 0);
                      const widthPercent = (cumQty / maxCumQty) * 100;
                      return (
                        <div key={i} className="relative flex justify-between text-green-500 text-sm px-1 py-0.5">
                          <div
                            className="absolute left-0 top-0 h-full z-0"
                            style={{
                              width: `${widthPercent}%`,
                              background: "rgba(1,185,22,0.1)",
                            }}
                          />
                          <span className="relative z-10">{order.price}</span>
                          <span className="relative z-10" style={{ minWidth: maxBuyQtyLen + "ch", textAlign: "right" }}>{order.quantity}</span>
                          <span className="relative z-10" style={{ minWidth: "8ch", textAlign: "right" }}>{((order.price * order.quantity) / 100_000_000).toFixed(8)}</span>
                        </div>
                      );
                    })}
                  </ScrollArea>
                </div>
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
            {/* 快捷价格标签 */}
            <Label className="text-sm text-gray-500">Price (sats)</Label>
            {/* <span className="text-sm text-gray-500 block mb-1">Price</span> */}
            <div className="flex gap-2 sm:gap-4 mb-2">
              <Button
                type="button"
                variant="outline"
                className={`flex flex-col items-center justify-center sm:-4 sm:px-8 h-16 ${price === (sellDepth.length > 0 ? sellDepth[sellDepth.length - 1].price : 0) ? "btn-gradient" : "bg-gray-700"}`}
                size="sm"
                onClick={() => setPrice(
                  sellDepth.length > 0
                    ? Number(sellDepth[sellDepth.length - 1].price)
                    : 0
                )}
              >
                Lowest Ask
                <span className="ml-1 text-xs text-gray-400">
                  {sellDepth.length > 0 ? sellDepth[sellDepth.length - 1].price : "--"}
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className={`flex flex-col items-center justify-center px-8 h-16 ${price === (sellDepth.length > 0 && buyDepth.length > 0 ? Number(((sellDepth[sellDepth.length - 1].price + buyDepth[0].price) / 2).toFixed(4)) : 0) ? "btn-gradient" : "bg-gray-700"}`}
                size="sm"
                onClick={() => setPrice(
                  sellDepth.length > 0 && buyDepth.length > 0
                    ? Number(((sellDepth[sellDepth.length - 1].price + buyDepth[0].price) / 2).toFixed(4))
                    : 0
                )}
              >
                Mid
                <span className="ml-1 text-xs text-gray-400">
                  {sellDepth.length > 0 && buyDepth.length > 0
                    ? ((sellDepth[sellDepth.length - 1].price + buyDepth[0].price) / 2).toFixed(4)
                    : "--"}
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className={`flex flex-col items-center justify-center px-8 h-16 ${price === (buyDepth.length > 0 ? buyDepth[0].price : 0) ? "btn-gradient" : "bg-gray-700"}`}
                size="sm"
                onClick={() => setPrice(
                  buyDepth.length > 0
                    ? Number(buyDepth[0].price)
                    : 0
                )}
              >
                Top Bid
                <span className="ml-1 text-xs text-gray-400">
                  {buyDepth.length > 0 ? buyDepth[0].price : "--"}
                </span>
              </Button>
            </div>
            <Select value={orderType} onValueChange={setOrderType}></Select>
            <span className="flex justify-start items-center text-sm text-gray-500 gap-2">
              <Input
                type="number"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                className="h-10"
              /> sats
            </span>
            <Label className="text-sm text-gray-500">Quantity</Label>
            <Input
              type="number"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value))}
              className="h-10"
            />

            {/* Expires In */}
            <Label className="text-sm text-gray-500">Expires In</Label>
            <div className="flex gap-2 items-center">
              <Select value={expireType} onValueChange={setExpireType}>
                <SelectTrigger className="w-32 bg-zinc-800 text-gray-200 border px-2 py-2 rounded">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {expireOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(expireType === "custom") && (
                <div className="w-60">
                  <DatePicker
                    date={expireDate ?? undefined}
                    setDate={(d) => setExpireDate(d ?? null)}
                    className="w-full bg-zinc-800 text-gray-200"
                    showTimeSelect
                  />
                </div>
              )}
              {(expireType !== "custom" && expireDate && expireType !== "ioc" && expireType !== "gtc") && (
                <div className="w-60">
                  <Input
                    value={expireDate.toLocaleString()}
                    readOnly
                    className="w-full bg-zinc-800 text-gray-200"
                  />
                </div>
              )}
            </div>
            <Button onClick={submitHandler} disabled={isPlacingOrder} className="min-w-[80px]">
              {isPlacingOrder ? "Submitting..." : "Submit"}
            </Button>

          </div>
        </div>
      </TabsContent>

      <TabsContent value="myOrders">
        <ScrollArea className="">
          <div className="flex flex-wrap md:flex-nowrap justify-between text-sm font-bold border-b py-1 text-gray-600">
            <span className="w-16 text-center">Side</span>
            <span className="w-20 text-center">Price</span>
            <span className="w-20 text-center">Quantity</span>
            <span className="w-24 text-center">Status</span>
          </div>
          {myOrders.map((order, i) => (
            <div key={i} className="flex flex-wrap md:flex-nowrap justify-between text-sm border-b py-1 items-center gap-2">
              <span className={`w-16 text-center font-bold ${order.side === "buy" ? "text-green-600" : "text-red-500"}`}>
                {order.side}
              </span>
              <span className="w-20 text-center">{order.price}</span>
              <span className="w-20 text-center">{order.quantity}</span>
              <span className="w-24 flex justify-center">
                <span
                  className={`px-2 py-0.5 rounded border text-xs font-semibold ${statusColor[order.status] || "bg-gray-700 text-gray-500 border-gray-500 "}`}
                  title={order.status}
                >
                  {order.status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              </span>
            </div>
          ))}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="trades">
        <ScrollArea className="h-64">
          <div className="flex flex-wrap md:flex-nowrap justify-between text-sm font-bold border-b py-1 text-gray-600">
            <span className="w-1/3 text-left">Time</span>
            <span className="w-1/3 text-center">Price</span>
            <span className="w-1/3 text-right">Quantity</span>
          </div>
          {tradeHistory.map((trade, i) => (
            <div key={i} className="flex justify-between text-xs border-b py-2 text-gray-400">
              <span>{trade.time}</span>
              <span>{trade.price}</span>
              <span>{trade.quantity}</span>
            </div>
          ))}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
