import { getContractPriceChange, getContractStatus, getDeployedContractInfo, requestContract } from "./market";
import { getConfiguredNetwork } from "@/store/common";

type Kind = "amm" | "swap";

// The testnet nodes are upgraded independently of the production market.
async function testnetUrls(kind: Kind) {
  const { url } = await getDeployedContractInfo();
  return (url as string[]).filter(u => u.endsWith("_" + kind + ".tc"));
}

export async function marketList(kind: Kind): Promise<any[]> {
  if (getConfiguredNetwork() === "testnet") {
    const urls = await testnetUrls(kind);
    return Promise.all(urls.map(async contractURL => {
      const [s, change] = await Promise.all([getContractStatus(contractURL), getContractPriceChange(contractURL)]);
      return { ...JSON.parse(s.status), contractURL, pct24h: change?.pct_24h };
    }));
  }
  const { data } = await requestContract("/info/market/" + kind);
  return data.map((row: any) => ({ ...row, Contract: { assetName: row.assetName } }));
}

export async function marketDetail(kind: Kind, asset: string, url?: string) {
  if (getConfiguredNetwork() === "testnet") {
    const hits = (await testnetUrls(kind)).filter(u => u.endsWith("_" + asset + "_" + kind + ".tc"));
    const contractURL = url ? hits.find(u => u === url) : hits[0];
    if (!contractURL) throw new Error("Contract not deployed for this asset");
    const [s, change] = await Promise.all([getContractStatus(contractURL), getContractPriceChange(contractURL)]);
    return { ...JSON.parse(s.status), contractURL, lastDealPrice: change?.last_price, pct24h: change?.pct_24h };
  }
  const query = new URLSearchParams({ asset });
  if (url) query.set("url", url);
  return (await requestContract("/info/market/" + kind + "/detail?" + query)).data;
}
