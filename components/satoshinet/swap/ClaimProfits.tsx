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
import { log } from "console";
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

  // 复制地址功能
  const handleCopyAddress = async (addressToCopy: string, type: string) => {
    try {
      await navigator.clipboard.writeText(addressToCopy);
      setCopiedAddress(type);
      toast.success(t("common.copied") || "已复制");
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      toast.error("复制失败");
    }
  };

  // 检查是否为部署者
  const isDeployer = useMemo(() => {
    const deployer = swapData?.deployer;
    if (!deployer || !address) return false;
    return deployer.toLowerCase() === address.toLowerCase();
  }, [swapData, address]);

  // 检查是否有足够的利润可提取
  const hasProfits = useMemo(() => {
    const baseLptAmt = swapData?.BaseLptAmt;
    const totalProfitSats = swapData?.TotalProfitSats;

    // 检查 BaseLptAmt 或者 TotalProfitSats 是否有利润
    const hasBaseLptProfit =
      baseLptAmt !== null && baseLptAmt !== undefined && Number(baseLptAmt) > 0;
    const hasSatsProfit =
      totalProfitSats !== null &&
      totalProfitSats !== undefined &&
      Number(totalProfitSats) > 0;

    return hasBaseLptProfit || hasSatsProfit;
  }, [swapData]);

  // 计算可提取的利润数量
  const availableProfits = useMemo(() => {
    const baseLptAmt = swapData?.BaseLptAmt;
    const totalProfitSats = swapData?.TotalProfitSats;

    if (
      baseLptAmt !== null &&
      baseLptAmt !== undefined &&
      Number(baseLptAmt) > 0
    ) {
      return Number(baseLptAmt) * Number(ratio);
    }

    if (
      totalProfitSats !== null &&
      totalProfitSats !== undefined &&
      Number(totalProfitSats) > 0
    ) {
      return Number(totalProfitSats) * Number(ratio);
    }

    return 0;
  }, [swapData, ratio]);

  // 获取利润类型和数值
  const profitInfo = useMemo(() => {
    const baseLptAmt = swapData?.BaseLptAmt;
    const totalProfitSats = swapData?.TotalProfitSats;
    const totalProfitAssets = swapData?.TotalProfitAssets;

    if (
      baseLptAmt !== null &&
      baseLptAmt !== undefined &&
      Number(baseLptAmt) > 0
    ) {
      return {
        type: "lpt",
        value: baseLptAmt,
        displayValue: baseLptAmt,
        unit: ticker,
        label: "LPT收益",
      };
    }

    if (
      totalProfitSats !== null &&
      totalProfitSats !== undefined &&
      Number(totalProfitSats) > 0
    ) {
      return {
        type: "sats",
        value: totalProfitSats,
        displayValue: totalProfitSats,
        unit: "sats",
        label: "Sats收益",
      };
    }

    if (
      totalProfitAssets !== null &&
      totalProfitAssets !== undefined &&
      totalProfitAssets.Value !== null
    ) {
      return {
        type: "asset",
        value: totalProfitAssets.Value,
        displayValue: totalProfitAssets.Value,
        unit: ticker,
        label: "资产收益",
      };
    }

    return null;
  }, [swapData, ticker]);

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

  // 如果不是部署者，不显示组件
  if (!isDeployer) {
    return (
      <div className="w-full p-4 bg-zinc-800/50 rounded-lg text-center">
        <p className="text-zinc-400 text-sm">
          {t("common.only_deployer_can_view") || "只有部署者可以查看此功能"}
        </p>
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
                    {swapData?.deployer ? hideStr(swapData.deployer, 6) : "无"}
                  </span>
                  {swapData?.deployer && (
                    <button
                      onClick={() => handleCopyAddress(swapData.deployer, "deployer")}
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
                      您
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
                    {contractUrl ? contractUrl.split("/").pop() || "未知" : "未知"}
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
                  <span className={`w-2 h-2 rounded-full ${
                    network === "mainnet" ? "bg-green-400" : "bg-yellow-400"
                  }`}></span>
                  <span className={`text-zinc-300 font-medium ${
                    network === "mainnet" ? "text-green-400" : "text-yellow-400"
                  }`}>
                    {network === "mainnet" ? "Mainnet" : "Testnet"}
                  </span>
                </div>
              </div>

              {/* 当前用户地址 */}
              {address && (
                <div className="flex justify-between items-center pt-2 border-t border-zinc-700/50">
                  <span className="text-zinc-500 font-medium">
                    您的地址:
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
                  ? `${profitInfo.displayValue || "0"} ${profitInfo.unit}`
                  : "0"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-zinc-400">
                {t("common.extract_amount") || "提取数量"}:
              </span>
              <span className="text-yellow-400 font-semibold">
                {availableProfits.toFixed(4)} {profitInfo?.unit || ticker}
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
                  {swapData?.BaseLptAmt !== null &&
                  swapData?.BaseLptAmt !== undefined
                    ? swapData.BaseLptAmt
                    : "无"}
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
                  className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                    ratio === preset.value
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
        className={`w-full my-2 text-sm font-semibold transition-all duration-200 ${
          hasProfits
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
              {t("common.no_profits_available") || "当前池子没有可提取的收益"}
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
