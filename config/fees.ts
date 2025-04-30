export const MARKET_FEES = {
  // 服务费率 0.8%
  SERVICE_FEE_RATE: 0.008,
  // 最小服务费（sats）
  MIN_SERVICE_FEE: 10,
  // 网络费用（sats）
  NETWORK_FEE: 10,
} as const;

// 计算服务费的工具函数
export const calculateServiceFee = (amount: number): number => {
  const calculatedFee = Math.floor(amount * MARKET_FEES.SERVICE_FEE_RATE);
  return Math.max(calculatedFee, MARKET_FEES.MIN_SERVICE_FEE);
}; 