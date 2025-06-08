import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { toast } from "sonner";
import DepthPanel from "./DepthPanel";
import MyOrdersPanel from "./MyOrdersPanel";
import TradeHistoryPanel from "./TradeHistoryPanel";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

  // 1. 获取 swapContractUrl
  const {
    data: swapContractUrl,
    isLoading: isContractUrlLoading,
  } = useQuery({
    queryKey: ["swapContractUrl", tickerInfo.displayname],
    queryFn: () => getSwapContractUrl(tickerInfo.displayname),
    staleTime: 10 * 1000,
    refetchInterval: 10000,
  });

  // 2. 获取 swapStatus，依赖 swapContractUrl
  const {
    data: swapStatus,
    isLoading: isSwapStatusLoading,
    refetch: refetchSwapStatus,
  } = useQuery({
    queryKey: ["swapStatus", swapContractUrl],
    queryFn: () => swapContractUrl ? getSwapStatus(swapContractUrl) : Promise.resolve(null),
    enabled: !!swapContractUrl,
    staleTime: 10 * 1000,
    refetchInterval: 10000,
  });

  const queryClient = useQueryClient();

  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [orderType, setOrderType] = useState("buy");
  const [myOrders, setMyOrders] = useState<{ id: number; side: string; price: number; quantity: number; status: string }[]>([]);
  const [tradeHistory, setTradeHistory] = useState<{ time: string; price: number; quantity: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [refreshIntervalId, setRefreshIntervalId] = useState<NodeJS.Timeout | null>(null);


  // 计算最大数量宽度对齐的变量，直接依赖 swapStatus 的数据
  const sellDepth = useMemo(() => {
    if (!swapStatus || !swapStatus.sellDepth) return [];
    // 过滤掉数量为0的，按价格从高到低排序
    return swapStatus.sellDepth
      .map((item: any) => ({
        price: Number(item.Price),
        quantity: Number(item.Amt),
      }))
      .filter((item: any) => item.quantity > 0)
      .sort((a: any, b: any) => b.price - a.price);
  }, [swapStatus]);

  const buyDepth = useMemo(() => {
    if (!swapStatus || !swapStatus.buyDepth) return [];
    // 过滤掉数量为0的，按价格从高到低排序
    return swapStatus.buyDepth
      .map((item: any) => ({
        price: Number(item.Price),
        quantity: Number(item.Amt),
      }))
      .filter((item: any) => item.quantity > 0)
      .sort((a: any, b: any) => b.price - a.price);
  }, [swapStatus]);
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

    setMyOrders([]);
  };

  const fetchTradeHistory = async () => {

    setTradeHistory([]);
  };

  const submitHandler = async () => {
    // 校验
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
    setIsPlacingOrder(true);
    const _asset = orderType === 'buy' ? '::' : assetName;
    console.log();

    const params = {
      action: 'swap',
      param: JSON.stringify({
        orderType: orderType === 'buy' ? 2 : 1,
        assetName: assetName,
        unitPrice: priceNum.toString()
      })
    };
    const amt = orderType === 'buy' ? (quantityNum) * priceNum + 10 : quantityNum;

    try {
      const result = await window.sat20.invokeContractV2_SatsNet(
        swapContractUrl, JSON.stringify(params), _asset, amt.toString(), '1');
      const { txId } = result;
      if (txId) {
        toast.success(`Order placed successfully, txid: ${txId}`);
      } else {
        toast.error('Order placement failed');
      }
    } catch (error) {
      toast.error('Order placement failed');
    }
    setIsPlacingOrder(false);
    setPrice("");
    setQuantity("");

    // 先失效缓存再刷新盘口\
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["swapStatus", swapContractUrl] });
      refetchSwapStatus();
      fetchMyOrders();
      fetchTradeHistory();
    }, 200);
    
  };

  // 处理 loading 和未找到合约的 UI
  if (isContractUrlLoading) {
    return <div className="w-full mt-4 text-center text-gray-400">加载中...</div>;
  }
  if (!swapContractUrl) {
    return (
      <div className="w-full mt-4">
        <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded">
          未找到合约，请联系管理员添加
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="depth" className="w-full mt-4">
      <TabsList className="mb-2">
        <TabsTrigger value="depth">Depth</TabsTrigger>
        <TabsTrigger value="myOrders">My Orders</TabsTrigger>
        <TabsTrigger value="trades">History</TabsTrigger>
      </TabsList>

      <TabsContent value="depth">
        <DepthPanel
          sellDepth={sellDepth}
          buyDepth={buyDepth}
          maxSellQtyLen={maxSellQtyLen}
          maxBuyQtyLen={maxBuyQtyLen}
          orderType={orderType}
          setOrderType={setOrderType}
          price={price}
          setPrice={setPrice}
          quantity={quantity}
          setQuantity={setQuantity}
          isPlacingOrder={isPlacingOrder}
          submitHandler={submitHandler}
        />
      </TabsContent>

      <TabsContent value="myOrders">
        <MyOrdersPanel contractURL={swapContractUrl || ""} />
      </TabsContent>

      <TabsContent value="trades">
        <TradeHistoryPanel contractURL={swapContractUrl || ""} />
      </TabsContent>
    </Tabs>
  );
}
