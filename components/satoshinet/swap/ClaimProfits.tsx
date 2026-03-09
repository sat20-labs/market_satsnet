import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useReactWalletStore } from "@sat20/btc-connect/dist/react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { ButtonRefresh } from "@/components/buttons/ButtonRefresh";
import { useCommonStore } from "@/store";
import { generateMempoolUrl } from "@/utils/url";
import { Chain } from "@/types";
import { hideStr } from "@/utils";
import { Copy, Check } from "lucide-react";

interface ClaimProfitsProps {
  asset: string;
  ticker: string;
  contractUrl: string;
  refresh: () => void;
  isRefreshing: boolean;
  swapData?: any;
  operationHistory?: string[] | null;
  isUnderMaintenance?: boolean;
  onMaintenanceAction?: () => void;
}

interface ClaimProfitsParams {
  asset: string;
  contractUrl: string;
  ratio: string;
}

const getAssetDisplayPrecision = (precision?: number) => {
  if (typeof precision === "number" && precision >= 0) {
    return precision;
  }
  return 4;
};

const formatAssetAmount = (value: number, precision?: number) => {
  return value.toFixed(getAssetDisplayPrecision(precision));
};

const ClaimProfits: React.FC<ClaimProfitsProps> = ({
  contractUrl,
  asset,
  ticker,
  refresh,
  isRefreshing,
  swapData,
  operationHistory,
  isUnderMaintenance = false,
  onMaintenanceAction,
}) => {
  const { t } = useTranslation();
  const { btcFeeRate, network } = useCommonStore();
  const [ratio, setRatio] = useState("1"); // 默认提取100%利润
  const { address } = useReactWalletStore();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const baseLptPrecision = swapData?.BaseLptAmt?.Precision || 0;
  const formattedBaseLptAmt = useMemo(() => {
    const baseValue = swapData?.BaseLptAmt?.Value;
    if (!baseValue) return "0";
    const normalized =
      Number(baseValue) / Math.pow(10, swapData?.BaseLptAmt?.Precision || 0);
    return normalized.toFixed(getAssetDisplayPrecision(baseLptPrecision));
  }, [baseLptPrecision, swapData]);

  // 复制地址功能
  const handleCopyAddress = async (addressToCopy: string, type: string) => {
    try {
      await navigator.clipboard.writeText(addressToCopy);
      setCopiedAddress(type);
      toast.success(t("common.copied") || "已复制");
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      toast.error(t("common.copy_failed", { defaultValue: "复制失败" }));
    }
  };

  // Unify deployer address extraction with the page-level fallback logic
  const deployerAddress = useMemo(() => {
    return (
      swapData?.Contract?.deployer ||
      swapData?.Contract?.deployerAddress ||
      swapData?.Contract?.Deployer ||
      swapData?.Contract?.DeployerAddress ||
      swapData?.deployer ||
      swapData?.deployerAddress ||
      swapData?.Deployer ||
      swapData?.DeployerAddress ||
      ""
    );
  }, [swapData]);

  // 检查是否为部署者
  const isDeployer = useMemo(() => {
    if (!deployerAddress || !address) return false;
    return String(deployerAddress).trim().toLowerCase() === address.trim().toLowerCase();
  }, [deployerAddress, address]);

  // 原始K值（Contract.k）
  const originalK = useMemo(() => {
    const contractK = swapData?.Contract?.k;
    if (!contractK) return null;
    return Number(contractK);
  }, [swapData]);

  // 当前K值（AssetAmtInPool * SatsValueInPool）
  const currentK = useMemo(() => {
    const assetAmtInPool = swapData?.AssetAmtInPool?.Value;
    const satsValueInPool = swapData?.SatsValueInPool;

    if (!assetAmtInPool || !satsValueInPool) return null;

    // 考虑资产精度
    const assetAmt = Number(assetAmtInPool) / Math.pow(10, swapData.AssetAmtInPool?.Precision || 0);
    const satsAmt = Number(satsValueInPool);

    return assetAmt * satsAmt;
  }, [swapData]);

  // 根据Go代码逻辑计算BaseLPT利润
  const calculateBaseLptProfit = useMemo(() => {
    const baseLptAmt = swapData?.BaseLptAmt?.Value;
    const totalLptAmt = swapData?.TotalLptAmt?.Value;

    if (!baseLptAmt || !totalLptAmt || !currentK || !originalK) {
      return null;
    }

    // 转换为数字（考虑精度）
    const baseLpt =
      Number(baseLptAmt) / Math.pow(10, swapData.BaseLptAmt?.Precision || 0);
    const totalLpt =
      Number(totalLptAmt) / Math.pow(10, swapData.TotalLptAmt?.Precision || 0);
    const k = currentK;

    // Go代码逻辑：
    // 1. 检查 BaseLptAmt > 0
    if (baseLpt <= 0) return null;

    // 2. 检查 k > originalK
    if (k <= originalK) return null;

    // 3. 计算LPT比例: BaseLptAmt / TotalLptAmt
    if (totalLpt <= 0) return null;
    const lptRatio = baseLpt / totalLpt;

    // 4. 计算k²: k * lptRatio
    const k2 = k * lptRatio;

    // 5. 计算Δk: k² - originalK
    const dk = k2 - originalK;
    if (dk <= 0) return null;

    // 6. 计算利润比例: Δk / k
    const profitRatio = dk / k;

    // 7. 计算最终利润: profitRatio * BaseLptAmt
    const profit = profitRatio * baseLpt;

    return profit;
  }, [swapData, originalK, currentK]);

  // 检查是否有足够的利润可提取
  const hasProfits = useMemo(() => {
    const baseLptProfit = calculateBaseLptProfit;
    const totalProfitSats = swapData?.TotalProfitSats;

    // 检查计算出的BaseLPT利润或者直接的Sats利润
    const hasBaseLptProfit = baseLptProfit !== null && baseLptProfit > 0;
    const hasSatsProfit =
      totalProfitSats !== null &&
      totalProfitSats !== undefined &&
      Number(totalProfitSats) > 0;

    return hasBaseLptProfit || hasSatsProfit;
  }, [calculateBaseLptProfit, swapData]);

  const lptProfitDistribution = useMemo(() => {
    const baseLptProfit = calculateBaseLptProfit;
    const totalLptAmt = swapData?.TotalLptAmt?.Value;

    if (!baseLptProfit || baseLptProfit <= 0 || !totalLptAmt) {
      return null;
    }

    const totalLpt =
      Number(totalLptAmt) / Math.pow(10, swapData?.TotalLptAmt?.Precision || 0);
    if (totalLpt <= 0) return null;

    const lptRatio = baseLptProfit / totalLpt;
    if (lptRatio <= 0) return null;

    const assetAmtInPool = swapData?.AssetAmtInPool?.Value;
    const assetPrecision = swapData?.AssetAmtInPool?.Precision || 0;
    const normalizedAssetAmt =
      assetAmtInPool !== undefined && assetAmtInPool !== null
        ? Number(assetAmtInPool) / Math.pow(10, assetPrecision)
        : 0;

    const satsInPool = Number(swapData?.SatsValueInPool || 0);

    return {
      lptRatio,
      assetAmount: normalizedAssetAmt * lptRatio,
      satsAmount: satsInPool * lptRatio,
      assetPrecision,
    };
  }, [calculateBaseLptProfit, swapData]);

  // 计算可提取的利润数量
  const availableProfits = useMemo(() => {
    const ratioValue = Number(ratio) || 0;
    if (lptProfitDistribution) {
      return {
        type: "lpt" as const,
        assetAmount: lptProfitDistribution.assetAmount * ratioValue,
        satsAmount: lptProfitDistribution.satsAmount * ratioValue,
        assetPrecision: lptProfitDistribution.assetPrecision,
        lptAmount: (calculateBaseLptProfit || 0) * ratioValue,
      };
    }

    const totalProfitSats = Number(swapData?.TotalProfitSats || 0);
    if (totalProfitSats > 0) {
      return {
        type: "sats" as const,
        satsAmount: totalProfitSats * ratioValue,
      };
    }

    const totalProfitAssets = swapData?.TotalProfitAssets;
    if (
      totalProfitAssets &&
      totalProfitAssets.Value !== null &&
      totalProfitAssets.Value !== undefined
    ) {
      const assetPrecision = totalProfitAssets?.Precision || 0;
      const normalizedAssets =
        Number(totalProfitAssets.Value) / Math.pow(10, assetPrecision);
      return {
        type: "asset" as const,
        assetAmount: normalizedAssets * ratioValue,
        assetPrecision,
      };
    }

    return null;
  }, [lptProfitDistribution, ratio, swapData]);

  // 获取利润类型和数值
  const profitInfo = useMemo(() => {
    const baseLptProfit = calculateBaseLptProfit;
    const totalProfitSats = swapData?.TotalProfitSats;
    const totalProfitAssets = swapData?.TotalProfitAssets;

    // 优先显示计算出的BaseLPT利润
    if (baseLptProfit !== null && baseLptProfit > 0) {
      if (lptProfitDistribution) {
        const assetDisplay = formatAssetAmount(
          lptProfitDistribution.assetAmount,
          lptProfitDistribution.assetPrecision,
        );
        const satsDisplay = lptProfitDistribution.satsAmount.toFixed(8);
        return {
          type: "lpt",
          value: baseLptProfit,
          displayValue: `${assetDisplay} ${ticker} / ${satsDisplay} sats`,
          lptValue: baseLptProfit,
          lptDisplayValue: `${baseLptProfit.toFixed(baseLptPrecision)} LPT`,
          unit: "",
          label: t("common.profit_label_lpt", { defaultValue: "LPT Profit" }),
        };
      }

      return {
        type: "lpt",
        value: baseLptProfit,
        displayValue: baseLptProfit.toFixed(baseLptPrecision),
        lptValue: baseLptProfit,
        lptDisplayValue: `${baseLptProfit.toFixed(baseLptPrecision)} LPT`,
        unit: "lpt",
        label: t("common.profit_label_lpt", { defaultValue: "LPT Profit" }),
      };
    }

    // 如果没有BaseLPT利润，检查Sats利润
    if (
      totalProfitSats !== null &&
      totalProfitSats !== undefined &&
      Number(totalProfitSats) > 0
    ) {
      const satsValue = Number(totalProfitSats);
      return {
        type: "sats",
        value: satsValue,
        displayValue: satsValue.toString(),
        unit: "sats",
        label: t("common.profit_label_sats", { defaultValue: "Sats Profit" }),
      };
    }

    // 检查资产利润
    if (
      totalProfitAssets !== null &&
      totalProfitAssets !== undefined &&
      totalProfitAssets.Value !== null
    ) {
      const assetPrecision = totalProfitAssets?.Precision || 0;
      const normalizedAssets =
        Number(totalProfitAssets.Value) / Math.pow(10, assetPrecision);
      return {
        type: "asset",
        value: normalizedAssets,
        displayValue: normalizedAssets.toFixed(assetPrecision),
        unit: ticker,
        label: t("common.profit_label_asset", { defaultValue: "Asset Profit" }),
      };
    }

    return null;
  }, [calculateBaseLptProfit, lptProfitDistribution, swapData, ticker, t, baseLptPrecision]);

  const claimProfitsMutation = useMutation({
    mutationFn: async ({ asset, contractUrl, ratio }: ClaimProfitsParams) => {
      const params = {
        action: "profit",
        param: JSON.stringify({
          orderType: 5, // ORDERTYPE_PROFIT
          ratio: ratio,
        }),
      };

      window.sat20.invokeContractV2_SatsNet(
        contractUrl,
        JSON.stringify(params),
        asset,
        "0", // profit 操作不需要资产数量
        btcFeeRate.value.toString(),
        {
          action: "profit",
          orderType: 5,
          ratio: ratio,
        },
      );

      return { success: true };
    },
    onSuccess: async (data) => {
      toast.success(t("common.claim_profits_success") || "提取收益成功");
      setRatio("1");
      refresh();
    },
    onError: (error: Error) => {
      toast.error(
        error.message || t("common.claim_profits_failed") || "提取收益失败",
      );
    },
  });

  const handleRatioChange = (value: string) => {
    // 验证输入的值在 0-1 之间
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 1) {
      return;
    }

    // 保留最多4位小数
    if (value.includes(".")) {
      const parts = value.split(".");
      if (parts[1] && parts[1].length > 4) {
        setRatio(`${parts[0]}.${parts[1].slice(0, 4)}`);
        return;
      }
    }

    setRatio(value);
  };

  const handleClaimProfits = () => {
    // 检查是否为维护中
    if (isUnderMaintenance) {
      onMaintenanceAction?.();
      return;
    }

    // 权限验证
    if (!isDeployer) {
      toast.error(
        t("common.only_deployer_can_claim") || "只有部署者可以提取收益",
      );
      return;
    }

    // 利润检查
    if (!hasProfits) {
      toast.error(t("common.no_profits_available") || "当前没有可提取的收益");
      return;
    }

    // 比例验证
    if (!ratio || parseFloat(ratio) <= 0 || parseFloat(ratio) > 1) {
      toast.error(t("common.invalid_ratio") || "请输入有效的提取比例(0-1)");
      return;
    }

    claimProfitsMutation.mutate({
      asset,
      contractUrl,
      ratio: ratio,
    });
  };

  const handleMaxRatio = () => {
    setRatio("1");
  };

  // 预设比例选项
  const presetRatios = [
    { value: "0.1", label: "10%" },
    { value: "0.25", label: "25%" },
    { value: "0.5", label: "50%" },
    { value: "0.75", label: "75%" },
    { value: "1", label: "100%" },
  ];

  // 如果不是部署者，显示有限的信息
  if (!isDeployer) {
    return (
      <div className="w-full">
        <div className="bg-zinc-900 sm:p-2 rounded-xl relative">
          <div className="mb-2 mx-4 py-2 rounded-lg relative">
            <div className="flex justify-between items-center text-xs text-zinc-500 mb-1 mx-2">
              <span className="py-2 uppercase">
                {t("common.claim_profits") || "提取收益"}
              </span>
              <span className="flex items-center text-xs text-zinc-500">
                <ButtonRefresh
                  onRefresh={refresh}
                  loading={isRefreshing}
                  className="bg-zinc-800/50"
                />
              </span>
            </div>

            {/* Defensive placeholder (tab should be hidden at page-level for non-deployers) */}
            <div className="mb-2 p-3 bg-zinc-800/20 border border-zinc-700/30 rounded-lg">
              <p className="text-zinc-300 text-xs">
                {t("common.deployer_only_feature") || "此功能仅限合约部署者使用"}
              </p>
              <p className="text-zinc-500 text-[11px] mt-1 leading-relaxed">
                {t("common.connect_deployer_wallet_to_claim", {
                  defaultValue:
                    "如果您是部署者，请切换到部署者地址的钱包后重试。",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-zinc-900 sm:p-2 rounded-xl relative">
        <div className="mb-2 mx-4 py-2 rounded-lg relative">
          <div className="flex justify-between items-center text-xs text-zinc-500 mb-1 mx-2">
            <span className="py-2 uppercase">
              {t("common.claim_profits") || "提取收益"}
            </span>
            <span className="flex items-center text-xs text-zinc-500">
              <ButtonRefresh
                onRefresh={refresh}
                loading={isRefreshing}
                className="bg-zinc-800/50"
              />
            </span>
          </div>

          {/* 部署者信息显示 */}
          <div className="mb-4 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
            <p className="text-sm font-medium text-zinc-400 mb-3 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              {t("common.deployer_info") || "部署者信息"}
            </p>
            <div className="grid grid-cols-1 gap-3 text-sm">
              {/* 当前部署者 */}
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-medium">
                  {t("common.current_deployer") || "当前部署者"}:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-300 font-mono text-xs bg-zinc-900/50 px-2 py-1 rounded">
                    {deployerAddress ? hideStr(deployerAddress, 6) : "无"}
                  </span>
                  {deployerAddress && (
                    <button
                      onClick={() => handleCopyAddress(deployerAddress, "deployer")}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 hover:bg-zinc-700/50 rounded"
                      title={t("common.copy_address") || "复制地址"}
                    >
                      {copiedAddress === "deployer" ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                  {isDeployer && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-medium">
                      {t("common.you", { defaultValue: "您" })}
                    </span>
                  )}
                </div>
              </div>

              {/* 合约地址 */}
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-medium">
                  {t("common.contract_address") || "合约地址"}:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-300 font-mono text-xs bg-zinc-900/50 px-2 py-1 rounded max-w-[120px] truncate">
                    {contractUrl
                      ? contractUrl.split("/").pop() || t("common.unknown")
                      : t("common.unknown")}
                  </span>
                  {contractUrl && (
                    <button
                      onClick={() => handleCopyAddress(contractUrl, "contract")}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 hover:bg-zinc-700/50 rounded"
                      title={t("common.copy_address") || "复制地址"}
                    >
                      {copiedAddress === "contract" ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* 网络状态 */}
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-medium">
                  {t("common.network_status") || "网络状态"}:
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${network === "mainnet" ? "bg-green-400" : "bg-yellow-400"
                      }`}
                  ></span>
                  <span
                    className={`text-zinc-300 font-medium ${network === "mainnet"
                        ? "text-green-400"
                        : "text-yellow-400"
                      }`}
                  >
                    {network === "mainnet"
                      ? t("common.mainnet")
                      : t("common.testnet")}
                  </span>
                </div>
              </div>

              {/* 当前用户地址 */}
              {address && (
                <div className="flex justify-between items-center pt-2 border-t border-zinc-700/50">
                  <span className="text-zinc-500 font-medium">
                    {t("common.your_address", { defaultValue: "您的地址" })}:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 font-mono text-xs bg-zinc-900/50 px-2 py-1 rounded">
                      {hideStr(address, 6)}
                    </span>
                    <button
                      onClick={() => handleCopyAddress(address, "user")}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 hover:bg-zinc-700/50 rounded"
                      title={t("common.copy_address") || "复制地址"}
                    >
                      {copiedAddress === "user" ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 利润状态显示 */}
          <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">
                {t("common.available_profits") || "可提取收益"}:
              </span>
              <span
                className={`font-semibold ${hasProfits ? "text-green-400" : "text-red-400"}`}
              >
                {profitInfo
                  ? profitInfo.type === "lpt"
                    ? `${profitInfo.displayValue || "0"}${profitInfo.lptDisplayValue ? ` (${profitInfo.lptDisplayValue})` : ""
                    }`
                    : `${profitInfo.displayValue || "0"} ${profitInfo.unit}`
                  : "0"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-zinc-400">
                {t("common.extract_amount") || "提取数量"}:
              </span>
              <span className="text-yellow-400 font-semibold">
                {availableProfits
                  ? availableProfits.type === "lpt"
                    ? `${formatAssetAmount(
                      availableProfits.assetAmount || 0,
                      availableProfits.assetPrecision,
                    )} ${ticker} / ${(availableProfits.satsAmount || 0).toFixed(8)} sats${availableProfits.lptAmount !== undefined
                      ? ` (${(availableProfits.lptAmount || 0).toFixed(baseLptPrecision)} LPT)`
                      : ""
                    }`
                    : availableProfits.type === "sats"
                      ? `${(availableProfits.satsAmount || 0).toFixed(8)} sats`
                      : `${formatAssetAmount(
                        availableProfits.assetAmount || 0,
                        availableProfits.assetPrecision,
                      )} ${ticker}`
                  : `0 ${profitInfo?.unit || ticker}`}
              </span>
            </div>
            {profitInfo && (
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-zinc-400">
                  {t("common.profit_type") || "收益类型"}:
                </span>
                <span className="text-blue-400 font-medium">
                  {profitInfo.label}
                </span>
              </div>
            )}
          </div>

          {/* 详细利润统计 */}
          <div className="mb-4 p-3 bg-zinc-800/30 rounded-lg">
            <p className="text-xs font-medium text-zinc-500 mb-2">
              {t("common.profit_statistics") || "利润统计"}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">
                  {t("common.original_k", { defaultValue: "原始K值(Contract.k)" })}:
                </span>
                <span className="text-zinc-300">
                  {originalK || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">
                  {t("common.current_k", { defaultValue: "当前K值(池子)" })}:
                </span>
                <span className="text-zinc-300">
                  {currentK?.toFixed(2) || "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">
                  {t("common.calculated_lpt_profit", { defaultValue: "计算的LPT利润" })}:
                </span>
                <span className="text-zinc-300">
                  {calculateBaseLptProfit?.toFixed(6) || t("common.none", { defaultValue: "无" })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">
                  {t("common.total_lpt_amount", { defaultValue: "总LPT数量" })}:
                </span>
                <span className="text-zinc-300">
                  {swapData?.TotalLptAmt?.Value || "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">
                  {t("common.asset_in_pool", { defaultValue: "池中资产数量" })}:
                </span>
                <span className="text-zinc-300">
                  {swapData?.AssetAmtInPool?.Value || "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">
                  {t("common.sats_in_pool", { defaultValue: "池中Sats数量" })}:
                </span>
                <span className="text-zinc-300">
                  {swapData?.SatsValueInPool || "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">
                  {t("common.total_profit_sats") || "总利润(Sats)"}:
                </span>
                <span className="text-zinc-300">
                  {swapData?.TotalProfitSats || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">
                  {t("common.total_profit_assets") || "总利润资产"}:
                </span>
                <span className="text-zinc-300">
                  {swapData?.TotalProfitAssets?.Value || 0} {ticker}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">
                  {t("common.base_lpt_amt") || "基础LPT数量"}:
                </span>
                <span className="text-zinc-300">
                  {formattedBaseLptAmt}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">
                  {t("common.total_profit_tx") || "利润交易次数"}:
                </span>
                <span className="text-zinc-300">
                  {swapData?.TotalProfitTx || 0}
                </span>
              </div>
            </div>
          </div>

          {/* 预设比例按钮 */}
          <div className="mb-4">
            <p className="text-xs font-medium text-zinc-500 mb-2">
              {t("common.quick_select_ratio") || "快速选择比例"}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {presetRatios.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setRatio(preset.value)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${ratio === preset.value
                    ? "bg-purple-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                    }`}
                  disabled={claimProfitsMutation.isPending || !hasProfits}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 自定义比例输入 */}
          <div className="relative w-full">
            <label className="text-xs font-medium text-zinc-500 mb-1 block">
              {t("common.custom_ratio") || "自定义比例"}
            </label>
            <div className="flex items-center">
              <input
                type="number"
                value={ratio}
                onChange={(e) => handleRatioChange(e.target.value)}
                className="flex-1 input-swap bg-transparent border-none rounded-lg px-4 py-2 text-xl sm:text-2xl font-bold text-white"
                placeholder={t("common.enter_ratio") || "输入提取比例"}
                min="0"
                max="1"
                step="0.0001"
                disabled={claimProfitsMutation.isPending || !hasProfits}
              />
              <div className="ml-3 text-zinc-600 text-sm">
                <button
                  onClick={handleMaxRatio}
                  className="px-2 py-1 rounded-md bg-zinc-800 text-xs hover:bg-purple-500 hover:text-white"
                  disabled={claimProfitsMutation.isPending}
                >
                  {t("common.max")}
                </button>
              </div>
            </div>
            <p className="text-xs font-medium text-zinc-500 mt-2">
              {t("common.profit_ratio_description") ||
                "设置要提取的利润比例，0.1=10%，1=100%"}
            </p>
          </div>
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        className={`w-full my-2 text-sm font-semibold transition-all duration-200 ${hasProfits
          ? "btn-gradient"
          : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
          }`}
        onClick={handleClaimProfits}
        disabled={claimProfitsMutation.isPending || !hasProfits}
      >
        {claimProfitsMutation.isPending
          ? t("common.claiming") || "提取中..."
          : t("common.claim_profits") || "提取收益"}
      </Button>

      {/* 权限和状态提示 */}
      <div className="space-y-2">
        {!hasProfits && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              {t("common.no_profits_available_pool") ||
                t("common.no_profits_available") ||
                "当前池子没有可提取的收益"}
            </p>
          </div>
        )}

        <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
          <p className="text-blue-400 text-sm">
            {t("common.deployer_only_warning") || "此功能仅限合约部署者使用"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClaimProfits;
