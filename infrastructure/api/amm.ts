// 获取 AMM 池子原始数据
export async function fetchAmmPoolStatus(contractUrl: string) {
  // @ts-ignore
  const result = await window.sat20.getDeployedContractStatus(contractUrl);
  return result?.contractStatus ? JSON.parse(result.contractStatus) : null;
} 