"use client";

import { useMemo, useState, useEffect } from "react";
import { HomeTypeTabs } from "@/components/market/HomeTypeTabs";
import { Badge } from "@/components/ui/badge";
import { PoolStatus, statusTextMap, statusColorMap } from "@/types/launchpool";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CustomPagination } from "@/components/ui/CustomPagination";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useCommonStore } from "@/store/common";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { BtcPrice } from "@/components/BtcPrice";
import {
  getDeployedContractInfo,
  getContractStatus,
  getContractPriceChange,
} from "@/api/market";
import { Button } from "@/components/ui/button";
import { WalletConnectBus } from "@/components/wallet/WalletConnectBus";
import AssetLogo from "@/components/AssetLogo";
import { useSwapDetailData } from "@/hooks/pages/useSwapDetailData";
import { getValueFromPrecision, formatLargeNumber } from "@/utils";
import { clientApi } from "@/api";
// import { Icon } from 'lucide-react';
import { Icon } from "@iconify/react";
import { SortDropdown } from "@/components/SortDropdown";
import { toast } from "sonner";

// 每页显示的数量
const PAGE_SIZE = 10;

// 维护中的 Runes 资产列表
const MAINTENANCE_RUNES = [
  "DOG•GO•TO•THE•MOON",
  "SHIB•SHIB•SHIB",
  "LOBO•THE•WOLF•PUP",
  "FUNNY•FISH•MASK",
];

// 白名单用户地址（可以绕过维护限制）
const WHITELIST_ADDRESSES = [
  "bc1pnax37hkq9dl2asph7cw9ay7vxvpl3tmnjdyd8eafdrfr4ur6kxnsvk4yq4",
  "bc1pydmhr3ud7e28g6lq7xgmfrz2e3uzxvw0zatv0d8auhwnatzrqawsq6pct6",
];

function extractAmount(obj) {
  if (!obj) return 0;
  if (typeof obj === "number") return obj;
  if (typeof obj === "string") {
    const n = Number(obj);
    return isNaN(n) ? 0 : n;
  }
  if (typeof obj === "object") {
    const v = obj.Value ?? obj.value;
    if (v == null) return 0;
    const p = obj.Precision ?? obj.precision ?? 0;
    const numV = Number(v);
    const numP = Number(p) || 0;
    if (isNaN(numV)) return 0;
    return numV / Math.pow(10, numP);
  }
  return 0;
}

function getMaxSupply(pool: any): number {
  const raw =
    (pool && pool.maxSupply) ?? (pool?.Contract && pool.Contract.maxSupply);
  if (raw == null) return 0;
  if (typeof raw === "object" && typeof raw.Value === "number") {
    return parseFloat(getValueFromPrecision(raw as any).value || "0");
  }
  const n = Number(raw);
  return isNaN(n) ? 0 : n;
}

function adaptPoolData(pool, satsnetHeight) {
  // 添加数据验证，防止访问 undefined 对象的属性
  if (!pool || typeof pool !== "object") {
    console.warn("Invalid pool data:", pool);
    return null;
  }

  const assetNameObj = pool.Contract?.assetName || {};
  const ticker = assetNameObj.Ticker || "-";
  const protocol = assetNameObj.Protocol || "-";
  let poolStatus = PoolStatus.NOT_STARTED;
  const status = Number(pool.status);
  const enableBlock = Number(pool.enableBlock);
  if (status === 100) {
    if (!isNaN(enableBlock) && typeof satsnetHeight === "number") {
      if (satsnetHeight < enableBlock) {
        poolStatus = PoolStatus.NOT_STARTED;
      } else {
        poolStatus = PoolStatus.ACTIVE;
      }
    }
  } else if (status === 101) {
    poolStatus = PoolStatus.LIQUIDITY_OPEN;
  } else if (status === 200) {
    poolStatus = PoolStatus.COMPLETED;
  } else if (status === -1) {
    poolStatus = PoolStatus.CLOSED;
  } else if (status === -2) {
    poolStatus = PoolStatus.EXPIRED;
  } else {
    poolStatus = PoolStatus.NOT_STARTED;
  }

  const satsValueInPool = Number(
    pool.SatsValueInPool ?? pool.SatsAmtInPool ?? 0,
  );
  const assetAmtInPool =
    extractAmount(pool.AssetAmtInPool) || extractAmount(pool.AssetAmt) || 0;
  const rawDealPrice = Number(pool.dealPrice ?? 0);
  const lastDealPrice = Number(pool.LastDealPrice ?? pool.lastDealPrice ?? 0);
  const derivedDealPrice =
    assetAmtInPool > 0 ? satsValueInPool / assetAmtInPool : 0; // latest pool price
  let effectivePoolPrice = derivedDealPrice;
  if (effectivePoolPrice === 0) {
    if (rawDealPrice > 0) effectivePoolPrice = rawDealPrice;
    else if (lastDealPrice > 0) effectivePoolPrice = lastDealPrice;
  }
  const finalDealPrice =
    rawDealPrice > 0
      ? rawDealPrice
      : derivedDealPrice > 0
        ? derivedDealPrice
        : lastDealPrice > 0
          ? lastDealPrice
          : 0;
  const volume24hBtc = Number(pool?.["24hour"]?.volume ?? 0);

  const maxSupply = getMaxSupply(pool);
  const marketCap = maxSupply > 0 ? effectivePoolPrice * maxSupply : 0;
  if (marketCap === 0) {
    console.debug("[Swap MarketCap Debug]", {
      id: pool?.contractURL,
      maxSupply,
      effectivePoolPrice,
      satsValueInPool,
      assetAmtInPool,
      rawDealPrice,
      lastDealPrice,
      derivedDealPrice,
      supplyKeys: Object.keys(pool || {}).filter((k) => /supply/i.test(k)),
    });
  }

  return {
    ...pool,
    id: pool.contractURL ?? pool.id,
    assetName: ticker,
    protocol: protocol,
    poolStatus,
    deployTime: pool.deployTime ?? "",
    // 转为数值，便于排序
    dealPrice: Number(finalDealPrice || 0),
    satsValueInPool,
    volume24hBtc,
    totalDealSats: Number(pool.TotalDealSats ?? 0),
    totalDealCount: Number(pool.TotalDealCount ?? 0),
    maxSupply,
    marketCap,
  };
}

// 新增：名称缩写函数（移动端显示优化）
function abbreviateTicker(name: string): string {
  if (!name) return "";
  if (name.length <= 12) return name;
  if (/[._-]/.test(name)) {
    const parts = name.split(/[._-]/).filter(Boolean);
    if (parts.length >= 3)
      return `${parts[0]}-${parts[1]}…-${parts[parts.length - 1]}`.slice(0, 18);
  }
  return `${name.slice(0, 6)}…${name.slice(-4)}`;
}

// 新增：仅格式化日期（精确到日）
function formatDeployDate(ts?: number) {
  if (!ts) return "-";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(); // 如需固定格式可改为 d.toISOString().slice(0,10)
}

const Swap = () => {
  const { t } = useTranslation(); // Specify the namespace
  const { satsnetHeight, network } = useCommonStore();
  const { btcPrice } = useCommonStore();
  const { address } = useReactWalletStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const PAGE_SIZES = [10, 20, 50, 100];

  // 判断资产是否在维护中
  const isUnderMaintenance = (pool: any) => {
    // 检查用户地址是否在白名单中
    const isUserWhitelisted = address && WHITELIST_ADDRESSES.includes(address);

    // 如果用户在白名单中，则不视为维护状态
    if (isUserWhitelisted) {
      return false;
    }

    return (
      pool?.protocol === "runes" && MAINTENANCE_RUNES.includes(pool?.assetName)
    );
  };

  // 处理维护中资产的点击
  const handleMaintenanceClick = (e: React.MouseEvent, pool: any) => {
    if (isUnderMaintenance(pool)) {
      e.preventDefault();
      toast.warning(t("common.contract_maintenance"));
      return false;
    }
  };
  const SORTABLE_COLUMNS = [
    { key: "assetName", label: t("pages.launchpool.asset_name") },
    { key: "dealPrice", label: t("common.price") },
    { key: "volume24hBtc", label: t("common.24h_volume_btc") },
    { key: "totalDealSats", label: t("common.volume_btc") },
    { key: "totalDealCount", label: t("common.tx_order_count") },
    { key: "marketCap", label: t("pages.launchpool.market_cap") },
    { key: "holders", label: t("common.holder") },
    { key: "satsValueInPool", label: t("common.pool_size_sats") },
  ];

  const [sortKey, setSortKey] = useState("volume24hBtc");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const SORT_OPTIONS = [
    { label: t("common.24h_volume_btc"), value: "volume24hBtc_desc" },
    { label: t("common.24h_volume_btc"), value: "volume24hBtc_asc" },
    { label: t("common.price"), value: "dealPrice_desc" },
    { label: t("common.price"), value: "dealPrice_asc" },
    { label: t("pages.launchpool.market_cap"), value: "marketCap_desc" },
    { label: t("pages.launchpool.market_cap"), value: "marketCap_asc" },
  ];
  const getSortStateFromValue = (val: string) => {
    const [key, order] = val.split("_");
    return { key, order };
  };
  const [sortDropdownValue, setSortDropdownValue] =
    useState("volume24hBtc_desc");
  useEffect(() => {
    const { key, order } = getSortStateFromValue(sortDropdownValue);
    setSortKey(key);
    setSortOrder(order as "asc" | "desc");
  }, [sortDropdownValue]);

  // 获取所有合约URL列表
  const { data: contractURLsData, error: contractURLsError } = useQuery({
    queryKey: ["ammContractURLs", network],
    queryFn: async () => {
      try {
        const deployed = await getDeployedContractInfo();
        const contractURLs =
          deployed?.url || (deployed?.data && deployed.data.url) || [];

        // 验证返回的数据是否为数组
        if (!Array.isArray(contractURLs)) {
          console.warn("Contract URLs data is not an array:", contractURLs);
          return [];
        }

        return contractURLs.filter((c: string) => {
          // 确保 c 是字符串且包含 'amm.tc'
          return typeof c === "string" && c.indexOf("amm.tc") > -1;
        });
      } catch (error) {
        console.error("Failed to get deployed contract info:", error);
        throw error;
      }
    },
    gcTime: 0,
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    retry: 2, // 失败重试2次
    retryDelay: 1000, // 重试间隔1秒
  });

  // 全量获取合约状态（全局排序，前端分页）
  const getSwapList = async () => {
    if (!contractURLsData || contractURLsData.length === 0) {
      return { pools: [], totalCount: 0 };
    }

    const statusList = await Promise.all(
      contractURLsData.map(async (item: string) => {
        try {
          const { status } = await getContractStatus(item);
          if (status) {
            try {
              const parsedStatus = JSON.parse(status);
              return {
                ...parsedStatus,
                contractURL: item,
              };
            } catch (parseError) {
              console.error(
                `Failed to parse status for ${item}:`,
                parseError,
                "Raw status:",
                status,
              );
              return null;
            }
          }
          return null;
        } catch (error) {
          console.error(`Failed to get contract status for ${item}:`, error);
          return null;
        }
      }),
    );

    const validPools = statusList.filter(Boolean);
    return {
      pools: validPools,
      totalCount: validPools.length,
    };
  };

  const {
    data: poolListData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ammList", network],
    queryFn: () => getSwapList(),
    enabled: !!contractURLsData,
    gcTime: 0,
    refetchInterval: 120000, // 增加到2分钟，减少刷新频率
    refetchIntervalInBackground: false, // 禁止后台刷新
    retry: 2, // 失败重试2次
    retryDelay: 1000, // 重试间隔1秒
  });
  //console.log('poolListData', poolListData);
  const poolList = poolListData?.pools || [];

  const adaptedPoolList = useMemo(() => {
    return poolList
      .map((pool) => adaptPoolData(pool, satsnetHeight))
      .filter(Boolean); // 过滤掉 null 值
  }, [poolList, satsnetHeight]);

  // 获取价格涨跌幅
  const priceChangeContracts = useMemo(
    () => adaptedPoolList.map((p) => p.contractURL).filter(Boolean),
    [adaptedPoolList],
  );
  const { data: priceChangeMap } = useQuery({
    queryKey: ["swapPriceChanges", network, priceChangeContracts],
    enabled: priceChangeContracts.length > 0,
    gcTime: 60 * 1000,
    queryFn: async () => {
      const entries = await Promise.all(
        priceChangeContracts.map(async (c: string) => {
          const d = await getContractPriceChange(c);
          return [c, d] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  });

  // 组装资产标识，用于获取 ticker 详情（参照 ticker/detail/page.tsx 使用的接口）
  const assetKeys = useMemo(() => {
    return Array.from(
      new Set(
        (poolList || [])
          .map((p: any) => {
            const proto = p?.Contract?.assetName?.Protocol;
            const ticker = p?.Contract?.assetName?.Ticker;
            if (!proto || !ticker) return "";
            return `${proto}:f:${ticker}`;
          })
          .filter(Boolean),
      ),
    );
  }, [poolList]);

  // 获取各资产 ticker 信息（含 maxSupply）
  const { data: tickerInfoMap } = useQuery({
    queryKey: ["ammTickerInfos", network, assetKeys],
    enabled: assetKeys.length > 0,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const results = await Promise.all(
        assetKeys.map(async (asset) => {
          try {
            const res = await clientApi.getTickerInfo(asset);
            return [asset, res?.data || null] as const;
          } catch (e) {
            console.warn("getTickerInfo failed for", asset, e);
            return [asset, null] as const;
          }
        }),
      );
      return Object.fromEntries(results);
    },
  });

  // NEW: 获取各资产 holders 总数（使用 holders 接口 total，避免使用 tickerInfo.holdersCount 可能不准确）
  const { data: holdersTotalsMap } = useQuery({
    queryKey: ["holdersTotals", network, assetKeys],
    enabled: assetKeys.length > 0,
    gcTime: 60 * 1000,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const results = await Promise.all(
        assetKeys.map(async (asset) => {
          try {
            const res = await clientApi.getTickerHolders(asset, 1, 1); // limit=1 取 total 即可
            const total = res?.data?.total ?? 0;
            return [asset, total] as const;
          } catch (e) {
            console.warn("getTickerHolders failed for", asset, e);
            return [asset, 0] as const;
          }
        }),
      );
      return Object.fromEntries(results);
    },
  });

  // 将 ticker 的 maxSupply 应用到池子数据，优先使用 tickerInfo.maxSupply
  const mergedPoolList = useMemo(() => {
    if (!adaptedPoolList || adaptedPoolList.length === 0)
      return adaptedPoolList;
    return adaptedPoolList.map((p: any) => {
      const ak = `${p?.Contract?.assetName?.Protocol}:f:${p?.Contract?.assetName?.Ticker}`;
      const ti = tickerInfoMap?.[ak];
      let maxSupply = p.maxSupply;
      if (ti && ti.maxSupply != null) {
        if (
          typeof ti.maxSupply === "object" &&
          typeof ti.maxSupply.Value === "number"
        ) {
          maxSupply = parseFloat(
            getValueFromPrecision(ti.maxSupply as any).value || "0",
          );
        } else {
          const n = Number(ti.maxSupply);
          maxSupply = isNaN(n) ? 0 : n;
        }
      }

      const marketCap =
        maxSupply > 0
          ? (Number(p.dealPrice || 0) > 0 ? Number(p.dealPrice) : 0) * maxSupply
          : 0;
      // NEW: 优先使用 holdersTotalsMap 的准确 total
      const holders =
        holdersTotalsMap?.[ak] ?? ti?.holdersCount ?? p.holders ?? 0;

      return { ...p, maxSupply, marketCap, holders };
    });
  }, [adaptedPoolList, tickerInfoMap, holdersTotalsMap]);

  const [protocol, setProtocol] = useState("all");
  const protocolChange = (newProtocol) => setProtocol(newProtocol);

  const protocolTabs = [
    { label: t("pages.launchpool.all"), key: "all" },
    { label: t("pages.launchpool.ordx"), key: "ordx" },
    { label: t("pages.launchpool.runes"), key: "runes" },
  ];

  const sortedPoolList = useMemo(() => {
    let list =
      protocol === "all"
        ? mergedPoolList
        : mergedPoolList.filter((pool) => pool.protocol === protocol);
    return list.slice().sort((a, b) => {
      let vA = a[sortKey] ?? 0;
      let vB = b[sortKey] ?? 0;
      // assetName 字符串排序
      if (sortKey === "assetName") {
        vA = String(vA).toLowerCase();
        vB = String(vB).toLowerCase();
        if (vA < vB) return sortOrder === "asc" ? -1 : 1;
        if (vA > vB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      }
      vA = Number(vA);
      vB = Number(vB);
      if (vA !== vB) return sortOrder === "asc" ? vA - vB : vB - vA;
      // 次级排序：成交笔数、部署时间
      const cA = Number(a.totalDealCount ?? 0);
      const cB = Number(b.totalDealCount ?? 0);
      if (cA !== cB) return cB - cA;
      return Number(b.deployTime ?? 0) - Number(a.deployTime ?? 0);
    });
  }, [mergedPoolList, protocol, sortKey, sortOrder]);

  const pagedPoolList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPoolList.slice(start, start + pageSize);
  }, [sortedPoolList, currentPage, pageSize]);

  const totalCount = sortedPoolList.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  // 处理分页变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="p-4 relative">
      <div className="mb-2 px-2 flex items-center">
        <span className="text-sm text-gray-400 mr-4">
          Current Bitcoin Price：
          <BtcPrice btc={1} className="text-green-500 font-bold" /> USDT
        </span>
      </div>
      <div className="py-2 px-2 sm:px-1 flex justify-between items-center gap-1 border-b border-zinc-800">
        <HomeTypeTabs
          value={protocol}
          onChange={protocolChange}
          tabs={protocolTabs}
        />
        <div className="flex items-center gap-2 mr-4">
          <WalletConnectBus asChild>
            <Button
              className="h-9 btn-gradient"
              onClick={() => (window.location.href = "/swap/create")}
            >
              Create Amm
            </Button>
          </WalletConnectBus>
        </div>
      </div>

      {/* 错误状态 */}
      {(error || contractURLsError) && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-red-500 mb-4">
            <h3 className="text-lg font-semibold">Loading failed</h3>
            <p className="text-sm text-gray-400 mt-1">
              {error?.message ||
                contractURLsError?.message ||
                "Network connection error, please check your network and try again."}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Reload...
          </button>
        </div>
      )}

      {/* 加载状态 */}
      {(isLoading || !contractURLsData) && !error && !contractURLsError && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">
            {t("common.loading")}
          </span>
        </div>
      )}

      {/* 移动端排序下拉菜单 */}
      <div className="sm:hidden mb-2 px-1 mt-2 text-sm">
        <SortDropdown
          sortList={SORT_OPTIONS}
          value={sortDropdownValue}
          onChange={(v) => setSortDropdownValue(v ?? "")}
        />
      </div>

      {/* 移动端卡片列表视图 */}
      <div className="sm:hidden space-y-3 mt-2">
        {pagedPoolList.map((p: any, idx: number) => (
          <div
            key={p.id || idx}
            className="rounded-lg bg-zinc-900/70 border border-zinc-800 p-3 flex gap-3"
          >
            <div className="flex-shrink-0 flex flex-col items-center justify-start w-12">
              <Avatar className="w-10 h-10 text-xl text-gray-300 font-medium bg-zinc-700">
                <AssetLogo
                  protocol={p?.Contract?.assetName?.Protocol}
                  ticker={p?.Contract?.assetName?.Ticker}
                  className="w-10 h-10"
                />
                <AvatarFallback>
                  {p?.Contract?.assetName?.Ticker?.charAt(0)?.toUpperCase() ||
                    "₿"}
                </AvatarFallback>
              </Avatar>
              {(() => {
                const pc = priceChangeMap?.[p.contractURL]?.pct_24h;
                if (typeof pc === "number") {
                  const pct = pc * 100;
                  const up = pct > 0;
                  const cls = up
                    ? "text-green-500"
                    : pct < 0
                      ? "text-red-500"
                      : "text-zinc-500";
                  return (
                    <span
                      className={`mt-8 text-[11px] font-medium leading-none ${cls}`}
                    >
                      {up ? "+" : ""}
                      {pct.toFixed(2)}%
                    </span>
                  );
                }
                return (
                  <span className="mt-1 text-[11px] text-zinc-600 leading-none">
                    --
                  </span>
                );
              })()}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/swap/detail?asset=${p?.Contract?.assetName?.Protocol}:f:${p?.Contract?.assetName?.Ticker}`}
                  className="flex flex-col justify-start text-primary font-medium text-left max-w-[150px]"
                  title={p?.assetName}
                  onClick={(e) => handleMaintenanceClick(e, p)}
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {p?.protocol === "runes" ? (
                    <>
                      <span className="text-[13px]">{p?.assetName || ""}</span>
                      <span
                        className="text-[11px] text-zinc-500"
                        style={{ display: "block" }}
                      >
                        ({p?.protocol})
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[16px]">{p?.assetName || ""}</span>
                      <span className="ml-1 text-[11px] text-zinc-500">
                        ({p?.protocol})
                      </span>
                    </>
                  )}
                </Link>

                {p.poolStatus === PoolStatus.ACTIVE ? (
                  <Link
                    href={`/swap/detail?asset=${p?.Contract?.assetName?.Protocol}:f:${p?.Contract?.assetName?.Ticker}`}
                    className={`${statusColorMap[p.poolStatus]} inline-flex items-center  text-white text-xs px-2 py-1 rounded font-medium shadow-sm hover:opacity-90 transition-opacity`}
                    onClick={(e) => handleMaintenanceClick(e, p)}
                  >
                    <Icon
                      icon="lucide:zap"
                      width={18}
                      height={18}
                      className="text-white mr-1"
                    />
                    {t("common.buy")}
                  </Link>
                ) : (
                  <span
                    className={`${statusColorMap[p.poolStatus]} !bg-opacity-30 !text-white/70 inline-flex items-center text-xs px-2 py-1 rounded font-medium`}
                  >
                    {t(statusTextMap[p.poolStatus])}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-[11px] text-zinc-400">
                <span className="truncate">
                  {t("common.price")}:{" "}
                  <span className="ml-0.5 text-[11px] font-bold">
                    {Number(p.dealPrice || 0).toFixed(4)}
                  </span>
                  <span className="ml-0.5 text-[10px] text-zinc-500">sats</span>
                </span>
                <span className="truncate">
                  {t("common.tx_order_count")}: {p.totalDealCount}
                </span>

                <span className="truncate">
                  24h Vol:
                  <span className="ml-0.5 text-[11px] font-bold">
                    {" "}
                    {(Number(p.volume24hBtc || 0) / 1e8).toFixed(4)}
                  </span>
                  <span className="ml-0.5 text-[10px] text-zinc-500 font-medium">
                    BTC
                  </span>
                </span>
                <span className="truncate">
                  {t("common.volume_btc")}:{" "}
                  {(Number(p.totalDealSats || 0) / 1e8).toFixed(4)}
                  <span className="ml-0.5 text-[10px] text-zinc-500">BTC</span>
                </span>

                <span className="truncate">
                  MC: {(Number(p.marketCap || 0) / 1e8).toFixed(4)}
                  <span className="ml-0.5 text-[10px] text-zinc-500">BTC</span>
                </span>
                <span className="truncate">
                  {t("common.holder")}: {p.holders}
                </span>
                <span className="truncate  col-span-2 text-zinc-500">
                  {t("pages.launchpool.deploy_time")}:{" "}
                  {p.deployTime ? formatDeployDate(p.deployTime) : "-"}
                  {p.poolStatus === PoolStatus.ACTIVE ? (
                    <span className="text-zinc-400 ml-1 text-[9px] bg-zinc-700 px-2 py-1 rounded-lg">
                      {t(statusTextMap[p.poolStatus])}
                    </span>
                  ) : (
                    <></>
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
        {pagedPoolList.length === 0 && !isLoading && !error && (
          <div className="text-center py-8 text-sm text-zinc-500">
            {t("common.no_data") || "No Data"}
          </div>
        )}
      </div>

      {/* 桌面端表格视图 */}
      <div className="relative overflow-x-auto w-full px-3 py-3 bg-zinc-900/80 rounded-lg hidden sm:block">
        <Table className="w-full table-auto border-collapse rounded-lg shadow-md min-w-[900px] bg-zinc-950/50">
          <TableHeader>
            <TableRow>
              {SORTABLE_COLUMNS.map((column) => {
                const hiddenOnMedium = ["totalDealCount", "deployTime"];
                const headExtraClass = hiddenOnMedium.includes(column.key)
                  ? "hidden lg:table-cell"
                  : "";
                const isSorted = sortKey === column.key;
                return (
                  <TableHead
                    key={column.key}
                    className={`px-4 py-2 text-left font-semibold text-muted-foreground bg-zinc-900 whitespace-nowrap cursor-pointer select-none ${headExtraClass} ${isSorted ? "text-zinc-200" : ""}`}
                    onClick={() => handleSort(column.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.label}
                      <span className="flex flex-col text-[8px] gap-1 ml-0.5">
                        <span
                          style={{
                            color:
                              isSorted && sortOrder === "asc"
                                ? "#e14b7b"
                                : "#444",
                            fontWeight:
                              isSorted && sortOrder === "asc"
                                ? "bold"
                                : "normal",
                            lineHeight: "0.8",
                          }}
                        >
                          &#9650;
                        </span>
                        <span
                          style={{
                            color:
                              isSorted && sortOrder === "desc"
                                ? "#e14b7b"
                                : "#444",
                            fontWeight:
                              isSorted && sortOrder === "desc"
                                ? "bold"
                                : "normal",
                            lineHeight: "0.8",
                          }}
                        >
                          &#9660;
                        </span>
                      </span>
                    </span>
                  </TableHead>
                );
              })}
              <TableHead className="px-4 py-2 text-left font-semibold text-muted-foreground bg-zinc-900 whitespace-nowrap">
                {t("common.trade")}
              </TableHead>
              <TableHead className="px-4 py-2 text-left font-semibold text-muted-foreground bg-zinc-900 whitespace-nowrap hidden lg:table-cell">
                {t("pages.launchpool.deploy_time")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPoolList.length === 0 && !isLoading && !error ? (
              <TableRow>
                <TableCell
                  colSpan={SORTABLE_COLUMNS.length + 2}
                  className="text-center py-8 text-gray-400"
                >
                  No data available.
                </TableCell>
              </TableRow>
            ) : (
              pagedPoolList.map((adaptedPool, index) => {
                if (!adaptedPool) return null;
                return (
                  <TableRow
                    key={adaptedPool.id ?? index}
                    className="border-b border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200/88 hover:text-zinc-100 transition-colors whitespace-nowrap"
                  >
                    <TableCell
                      className={`px-4 py-4 flex items-center ${adaptedPool.protocol === "runes" ? "gap-1" : "gap-2"}`}
                    >
                      {adaptedPool.protocol === "runes" ? (
                        <Avatar className="w-10 h-10 bg-zinc-700 flex-shrink-0">
                          <AssetLogo
                            protocol={
                              adaptedPool?.Contract?.assetName?.Protocol
                            }
                            ticker={adaptedPool?.Contract?.assetName?.Ticker}
                            className="w-10 h-10"
                          />
                          <AvatarFallback>
                            {adaptedPool?.Contract?.assetName?.Ticker?.charAt(
                              0,
                            )?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Avatar className="w-10 h-10 text-xl text-gray-300 font-medium bg-zinc-700 flex-shrink-0">
                          <AssetLogo
                            protocol={
                              adaptedPool?.Contract?.assetName?.Protocol
                            }
                            ticker={adaptedPool?.Contract?.assetName?.Ticker}
                            className="w-10 h-10"
                          />
                          <AvatarFallback>
                            {adaptedPool?.Contract?.assetName?.Ticker?.charAt(
                              0,
                            )?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <Link
                        href={`/swap/detail?asset=${adaptedPool?.Contract?.assetName?.Protocol}:f:${adaptedPool?.Contract?.assetName?.Ticker}`}
                        className={`cursor-pointer text-primary hover:underline leading-snug ${adaptedPool.protocol !== "runes" ? "max-w-[160px]" : "max-w-[180px]"}`}
                        prefetch={true}
                        title={adaptedPool.assetName}
                        onClick={(e) => handleMaintenanceClick(e, adaptedPool)}
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {adaptedPool.assetName}
                        <span className="ml-1 text-zinc-500">
                          ({adaptedPool.protocol})
                        </span>
                      </Link>
                    </TableCell>

                    <TableCell className="px-4 py-4">
                      {Number(adaptedPool.dealPrice ?? 0).toFixed(4)}
                      <span className="ml-1 text-xs text-zinc-500 font-medium">
                        sats
                      </span>
                      {(() => {
                        const pc =
                          priceChangeMap?.[adaptedPool.contractURL]?.pct_24h;
                        if (typeof pc === "number") {
                          const pct = pc * 100;
                          const up = pct > 0;
                          const cls = up
                            ? "text-green-500"
                            : pct < 0
                              ? "text-red-500"
                              : "text-zinc-400";
                          return (
                            <div
                              className={`text-[11px] mt-1 font-medium ${cls}`}
                            >
                              {up ? "+" : ""}
                              {pct.toFixed(2)}%
                            </div>
                          );
                        }
                        return (
                          <div className="text-[11px] mt-1 text-zinc-600">
                            --
                          </div>
                        );
                      })()}
                    </TableCell>

                    <TableCell className="px-4 py-4">
                      <div className="flex flex-col leading-tight gap-1">
                        <span>
                          {(
                            Number(adaptedPool.volume24hBtc || 0) / 1e8
                          ).toFixed(4)}{" "}
                          <span className="text-xs text-zinc-500 font-medium">
                            BTC
                          </span>
                        </span>
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                          {"$"}
                          {formatLargeNumber(
                            (Number(adaptedPool.volume24hBtc || 0) / 1e8) *
                              (Number(btcPrice) || 0),
                          )}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-4">
                      <div className="flex flex-col leading-tight gap-1">
                        <span>
                          {(
                            Number(adaptedPool.totalDealSats || 0) / 1e8
                          ).toFixed(4)}{" "}
                          <span className="text-xs text-zinc-500 font-medium">
                            BTC
                          </span>
                        </span>
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                          {"$"}
                          {formatLargeNumber(
                            (Number(adaptedPool.totalDealSats || 0) / 1e8) *
                              (Number(btcPrice) || 0),
                          )}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-4 hidden lg:table-cell">
                      <div className="flex flex-col leading-tight">
                        <span>{adaptedPool.totalDealCount}</span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-4">
                      <div className="flex flex-col leading-tight gap-1">
                        <span>
                          {(Number(adaptedPool.marketCap || 0) / 1e8).toFixed(
                            4,
                          )}{" "}
                          <span className="text-xs text-zinc-500 font-medium">
                            BTC
                          </span>
                        </span>
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                          {"$"}
                          {formatLargeNumber(
                            (Number(adaptedPool.marketCap || 0) / 1e8) *
                              (Number(btcPrice) || 0),
                          )}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-4">
                      <div className="flex flex-col leading-tight">
                        <span>{adaptedPool.holders}</span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-4">
                      <div className="flex flex-col leading-tight gap-1">
                        <span>
                          {Number(adaptedPool.satsValueInPool || 0) * 2}
                        </span>
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                          {"$"}
                          {formatLargeNumber(
                            ((Number(adaptedPool.satsValueInPool || 0) * 2) /
                              1e8) *
                              (Number(btcPrice) || 0),
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      {adaptedPool.poolStatus === PoolStatus.ACTIVE ? (
                        <Link
                          href={`/swap/detail?asset=${adaptedPool?.Contract?.assetName?.Protocol}:f:${adaptedPool?.Contract?.assetName?.Ticker}`}
                          className={`${statusColorMap[adaptedPool.poolStatus]} inline-flex items-center  text-white text-xs px-2 py-1 rounded font-medium shadow-sm hover:opacity-90 transition-opacity`}
                          onClick={(e) =>
                            handleMaintenanceClick(e, adaptedPool)
                          }
                        >
                          <Icon
                            icon="lucide:zap"
                            width={16}
                            height={16}
                            className="text-white mr-1"
                          />{" "}
                          {t("common.buy")}
                        </Link>
                      ) : (
                        <Badge
                          className={`${statusColorMap[adaptedPool.poolStatus]} !bg-opacity-30 !text-white/70`}
                        >
                          {t(statusTextMap[adaptedPool.poolStatus])}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4 hidden lg:table-cell text-zinc-400">
                      {adaptedPool.deployTime
                        ? formatDeployDate(adaptedPool.deployTime)
                        : "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页组件 */}
      <div className="bg-zinc-900/80 px-4 py-0 rounded-b-lg flex flex-row items-center justify-between gap-3 border-t border-zinc-800">
        <CustomPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSize={pageSize}
          availablePageSizes={PAGE_SIZES}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default Swap;
