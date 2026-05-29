import { getWalletAdapter } from '@/lib/walletAdapter';

// 获取 AMM 池子原始数据
export async function fetchAmmPoolStatus(contractUrl: string) {
  const result = await getWalletAdapter().getDeployedContractStatus(contractUrl);
  return result?.contractStatus ? JSON.parse(result.contractStatus) : null;
}
