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
// 合约模版：{"contractType":"swap.tc","startBlock":0,"endBlock":0,"assetName":{"Protocol":"","Type":"","Ticker":""}}
// 支持两个接口，统一的接口调用方式：{"action":"xxx","param":xxx} 
// 第一个接口是swap，参数："{\"orderType\":0,\"assetName\":\"\",\"unitPrice\":\"\"}"
// 第二个接口是refund，参数随便填个字符串当reason
export default function OrderBook() {
    const [date, setDate] = useState<Date | undefined>(undefined);
    const { supportedContracts } = useSupportedContracts();
    console.log('supportedContracts', supportedContracts);
    const [buyOrders, setBuyOrders] = useState<{ price: number; quantity: number }[]>([]);
    const [sellOrders, setSellOrders] = useState<{ price: number; quantity: number }[]>([]);
    const [price, setPrice] = useState(0);
    const [quantity, setQuantity] = useState(0);
    const [orderType, setOrderType] = useState("buy");
    const [myOrders, setMyOrders] = useState<{ id: number; side: string; price: number; quantity: number; status: string }[]>([]);
    const [tradeHistory, setTradeHistory] = useState<{ time: string; price: number; quantity: number }[]>([]);
    const [cancelingOrderId, setCancelingOrderId] = useState(null);
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


    // 样例数据（各10条）
    const mockBuyOrders = [
        { price: 4.450, quantity: 500000 },
        { price: 4.361, quantity: 3772728 },
        { price: 4.272, quantity: 3130000 },
        { price: 4.183, quantity: 150000 },
        { price: 4.094, quantity: 200000 },
        { price: 3.916, quantity: 750000 },
        { price: 3.738, quantity: 272995 },
        { price: 3.560, quantity: 496667 },
        { price: 3.471, quantity: 351857 },
        { price: 3.293, quantity: 385872 },
    ];
    const mockSellOrders = [
        { price: 5.381, quantity: 127115.143 },
        { price: 5.292, quantity: 12509854.42 },
        { price: 5.203, quantity: 886547.132 },
        { price: 5.114, quantity: 2105194.513 },
        { price: 5.025, quantity: 3292177.267 },
        { price: 4.936, quantity: 4351095.566 },
        { price: 4.847, quantity: 996907.195 },
        { price: 4.758, quantity: 1664458.879 },
        { price: 4.669, quantity: 5396026.374 },
        { price: 4.580, quantity: 1168500 },
    ];
    // const mockMyOrders = [
    //     { id: 1, side: "buy", price: 4.361, quantity: 100000, status: "open" },
    //     { id: 2, side: "sell", price: 5.025, quantity: 50000, status: "filled" },
    //     { id: 3, side: "buy", price: 3.738, quantity: 20000, status: "open" },
    //     { id: 4, side: "sell", price: 4.936, quantity: 10000, status: "open" },
    //     { id: 5, side: "buy", price: 4.094, quantity: 15000, status: "open" },
    //     { id: 6, side: "sell", price: 5.292, quantity: 8000, status: "open" },
    //     { id: 7, side: "buy", price: 3.471, quantity: 12000, status: "filled" },
    //     { id: 8, side: "sell", price: 4.847, quantity: 9000, status: "open" },
    //     { id: 9, side: "buy", price: 4.183, quantity: 7000, status: "open" },
    //     { id: 10, side: "sell", price: 5.381, quantity: 6000, status: "open" },
    // ];
    const mockTradeHistory = [
        { time: "2024-06-01 12:00", price: 4.450, quantity: 10000 },
        { time: "2024-06-01 12:01", price: 4.361, quantity: 20000 },
        { time: "2024-06-01 12:02", price: 4.272, quantity: 15000 },
        { time: "2024-06-01 12:03", price: 4.183, quantity: 12000 },
        { time: "2024-06-01 12:04", price: 4.094, quantity: 11000 },
        { time: "2024-06-01 12:05", price: 3.916, quantity: 9000 },
        { time: "2024-06-01 12:06", price: 3.738, quantity: 8000 },
        { time: "2024-06-01 12:07", price: 3.560, quantity: 7000 },
        { time: "2024-06-01 12:08", price: 3.471, quantity: 6000 },
        { time: "2024-06-01 12:09", price: 3.293, quantity: 5000 },
    ];

    const mockMyOrders = [
        { id: 1, side: "buy", price: 4.361, quantity: 100000, status: "open" },
        { id: 2, side: "sell", price: 5.025, quantity: 50000, status: "filled" },
        { id: 3, side: "buy", price: 3.738, quantity: 20000, status: "partially_filled" },
        { id: 4, side: "sell", price: 4.936, quantity: 10000, status: "cancelled" },
        { id: 5, side: "buy", price: 4.094, quantity: 15000, status: "expired" },
        { id: 6, side: "sell", price: 5.292, quantity: 8000, status: "open" },
        { id: 7, side: "buy", price: 3.471, quantity: 12000, status: "filled" },
        { id: 8, side: "sell", price: 4.847, quantity: 9000, status: "partially_filled" },
        { id: 9, side: "buy", price: 4.183, quantity: 7000, status: "cancelled" },
        { id: 10, side: "sell", price: 5.381, quantity: 6000, status: "expired" },
    ];
    // ...existing code...
    
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

    useEffect(() => {
        fetchOrders();
        fetchMyOrders();
        fetchTradeHistory();

        const intervalId = setInterval(() => {
            fetchOrders();
            fetchMyOrders();
            fetchTradeHistory();
          }, 10000);
          setRefreshIntervalId(intervalId);

          return () => clearInterval(intervalId);
    }, []);

    const fetchOrders = async () => {
        // try {
        //   const { data } = await axios.get("/api/orderbook");
        //   setBuyOrders(data.buy.slice(0, 10));
        //   setSellOrders(data.sell.slice(0, 10));
        // } catch (err) {
        //   console.error("Failed to fetch orders", err);
        // }
        setBuyOrders(mockBuyOrders);
        setSellOrders(mockSellOrders);
    };

    const fetchMyOrders = async () => {
        // try {
        //   const { data } = await axios.get("/api/my-orders");
        //   setMyOrders(data);
        // } catch (err) {
        //   console.error("Failed to fetch my orders", err);
        // }

        setMyOrders(mockMyOrders);
    };

    const fetchTradeHistory = async () => {
        // try {
        //   const { data } = await axios.get("/api/trade-history");
        //   setTradeHistory(data);
        // } catch (err) {
        //   console.error("Failed to fetch trade history", err);
        // }
        setTradeHistory(mockTradeHistory);
    };

    const placeOrder = async () => {
        setIsPlacingOrder(true);
        // try {
        //   await axios.post("/api/place-order", {
        //     price,
        //     quantity,
        //     side: orderType,
        //   });
        //   fetchOrders();
        //   fetchMyOrders();
        // } catch (err) {
        //   console.error("Failed to place order", err);
        // }
        // 模拟下单后刷新
        fetchOrders();
        fetchMyOrders();
        setPrice(0);
        setQuantity(0);
    };

    const cancelOrder = async (orderId) => {
        setCancelingOrderId(orderId);
        try {
            await axios.post("/api/cancel-order", { orderId });
            fetchOrders();
            fetchMyOrders();
        } catch (err) {
            console.error("Failed to cancel order", err);
        } finally {
            setCancelingOrderId(null);
        }
    };

    // 计算最大数量宽度对齐
    const maxSellQtyLen = Math.max(...mockSellOrders.map(o => o.quantity.toString().length));
    const maxBuyQtyLen = Math.max(...mockBuyOrders.map(o => o.quantity.toString().length));

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
                                        {sellOrders.map((order, i, arr) => {
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
                                        const bestBid = buyOrders.length > 0 ? buyOrders[0].price : 0;
                                        const bestAsk = sellOrders.length > 0 ? sellOrders[sellOrders.length - 1].price : 0;
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
                                        {buyOrders.map((order, i, arr) => {
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
                                className={`flex flex-col items-center justify-center sm:-4 sm:px-8 h-16 ${price === (sellOrders.length > 0 ? sellOrders[sellOrders.length - 1].price : 0) ? "btn-gradient" : "bg-gray-700"}`}
                                size="sm"
                                onClick={() => setPrice(
                                    sellOrders.length > 0
                                        ? Number(sellOrders[sellOrders.length - 1].price)
                                        : 0
                                )}
                            >
                                Lowest Ask
                                <span className="ml-1 text-xs text-gray-400">
                                    {sellOrders.length > 0 ? sellOrders[sellOrders.length - 1].price : "--"}
                                </span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className={`flex flex-col items-center justify-center px-8 h-16 ${price === (sellOrders.length > 0 && buyOrders.length > 0 ? Number(((sellOrders[sellOrders.length - 1].price + buyOrders[0].price) / 2).toFixed(4)) : 0) ? "btn-gradient" : "bg-gray-700"}`}
                                size="sm"
                                onClick={() => setPrice(
                                    sellOrders.length > 0 && buyOrders.length > 0
                                        ? Number(((sellOrders[sellOrders.length - 1].price + buyOrders[0].price) / 2).toFixed(4))
                                        : 0
                                )}
                            >
                                Mid
                                <span className="ml-1 text-xs text-gray-400">
                                    {sellOrders.length > 0 && buyOrders.length > 0
                                        ? ((sellOrders[sellOrders.length - 1].price + buyOrders[0].price) / 2).toFixed(4)
                                        : "--"}
                                </span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className={`flex flex-col items-center justify-center px-8 h-16 ${price === (buyOrders.length > 0 ? buyOrders[0].price : 0) ? "btn-gradient" : "bg-gray-700"}`}
                                size="sm"
                                onClick={() => setPrice(
                                    buyOrders.length > 0
                                        ? Number(buyOrders[0].price)
                                        : 0
                                )}
                            >
                                Top Bid
                                <span className="ml-1 text-xs text-gray-400">
                                    {buyOrders.length > 0 ? buyOrders[0].price : "--"}
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
                        <Button onClick={placeOrder} disabled={isPlacingOrder} className="min-w-[80px]">
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
                        <span className="w-20 text-center">Action</span>
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
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={cancelingOrderId === order.id || order.status !== "open"}
                                onClick={() => cancelOrder(order.id)}
                            >
                                {cancelingOrderId === order.id ? "Canceling..." : "Cancel"}
                            </Button>
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
