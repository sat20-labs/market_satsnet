import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useCommonStore } from "@/store/common";
import { generateMempoolUrl, generateOrdUrl } from "@/utils/url";
import { Chain } from '@/types';

export function AssetInfoCard({ asset, tickerInfo, holdersTotal }) {
  const { network } = useCommonStore();
  if (!tickerInfo) return null;

  const deployTxLink = generateMempoolUrl({
    network,
    path: `tx/${tickerInfo.deployTx}`,
    chain: Chain.BTC,
    env: 'dev',
  });
  const deployAddressLink = generateMempoolUrl({
    network,
    path: `address/${tickerInfo.deployAddress}`,
    chain: Chain.BTC,
    env: 'dev',
  });
  const inscriptionIdLink = generateOrdUrl({
    network,
    path: `content/${tickerInfo.inscriptionId}`,
  })
  return (
    <Card className="mb-6">
      <CardContent>
        <div className="space-y-2">
          <InfoRow label="Ticker" value={tickerInfo.Ticker || asset} />
          <InfoRow label="Supply" value={tickerInfo.maxSupply} />
          <InfoRow label="Minted" value={tickerInfo.totalMinted} />
          <InfoRow label="Limit per mint" value={tickerInfo.limit} />
          <InfoRow label="Decimal" value={18} />
          <InfoRow label="Deploy By" value={<Link href={deployAddressLink} target="_blank" className="text-bright-blue underline">{tickerInfo.deployAddress}</Link>} />
          <InfoRow label="Deploy Height" value={tickerInfo.deployHeight} />
          <InfoRow label="Deploy Time" value={formatTime(tickerInfo.deployBlockTime)} />
          <InfoRow label="Deploy Tx" value={<Link href={deployTxLink} target="_blank" className="text-bright-blue underline">{tickerInfo.deployTx}</Link>} />
          <InfoRow label="Start Block" value={tickerInfo.startBlock} />
          <InfoRow label="End Block" value={tickerInfo.endBlock} />
          <InfoRow label="Inscription ID" value={<Link href={inscriptionIdLink} target="_blank" className="text-bright-blue underline">{tickerInfo.inscriptionId}</Link>} />
          <InfoRow label="Inscription Number" value={`#${tickerInfo.inscriptionNum}`} />
          <InfoRow label="Holders" value={holdersTotal} />
          <InfoRow label="Mint Times" value={tickerInfo.mintTimes} />
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1 border-b last:border-b-0">
      <span className="font-semibold text-blue-800 text-base">{label}</span>
      <span className="text-right text-sky-500 font-bold text-base break-all">{value}</span>
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts * 1000);
  return d.toLocaleString();
} 