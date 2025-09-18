'use client';
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import React from "react";
import { useCommonStore } from "@/store/common";
import { generateMempoolUrl, generateOrdUrl } from "@/utils/url";
import { Chain } from '@/types';
import { formatLargeNumber } from '@/utils';
// NEW: imports for social icons and fetching asset metadata
import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import { getAsset } from '@/api/market';

export function AssetInfoCard({ asset, tickerInfo, holdersTotal }) {
  const { network } = useCommonStore();

  // NEW: fetch asset metadata for social links
  const { data: assetMetaResp } = useQuery({
    queryKey: ['assetMeta', asset],
    queryFn: () => getAsset(asset),
    enabled: !!asset && !!tickerInfo,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (!tickerInfo) return null;
  const assetMeta = assetMetaResp?.data || assetMetaResp || {};
  const twitter = assetMeta?.twitter as string | undefined;
  const telegram = assetMeta?.telegram as string | undefined;
  const discord = assetMeta?.discord as string | undefined;

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
  });

  return (
    <Card className="mb-4 bg-zinc-900">
      <CardContent>
        <div className="space-y-2 sm:space-x-2">
          {/* <InfoRow label="Ticker" value={tickerInfo.Ticker || asset} /> */}
          <InfoRow label="Ticker" value={tickerInfo.name.Ticker} />
          <InfoRow label="Protocol" value={tickerInfo.name.Protocol} />
          {/* <InfoRow label="Supply" value={formatLargeNumber(tickerInfo.maxSupply)} /> */}
          <InfoRow
            label="Supply"
            value={tickerInfo.maxSupply}
          />
          <InfoRow
            label="Minted"
            value={tickerInfo.totalMinted}
          />
          <InfoRow
            label="Limit per mint"
            value={tickerInfo.limit}
          />
          <InfoRow label="Decimal" value={18} />
          <InfoRow label="Deploy By" value={<Link href={deployAddressLink} target="_blank" className="text-bright-blue underline">{tickerInfo.deployAddress}</Link>} />
          <InfoRow label="Deploy Height" value={tickerInfo.deployHeight} />
          <InfoRow label="Deploy Time" value={formatTime(tickerInfo.deployBlockTime)} />

          {/* NEW: Social links row - show only when at least one exists */}
          {(twitter || telegram || discord) && (
            <InfoRow
              label="Links"
              value={
                <div className="flex items-center gap-3">
                  {twitter && (
                    <Link href={twitter} target="_blank" className="text-blue-400 hover:text-blue-300" title="Twitter">
                      <Icon icon="mdi:twitter" width={20} height={20} />
                    </Link>
                  )}
                  {telegram && (
                    <Link href={telegram} target="_blank" className="text-sky-400 hover:text-sky-300" title="Telegram">
                      <Icon icon="mdi:telegram" width={20} height={20} />
                    </Link>
                  )}
                  {discord && (
                    <Link href={discord} target="_blank" className="text-indigo-400 hover:text-indigo-300" title="Discord">
                      <Icon icon="mdi:discord" width={20} height={20} />
                    </Link>
                  )}
                </div>
              }
            />
          )}

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
  const isLink = React.isValidElement(value) && value.type === Link; // 判断是否为 Link 元素  
  return (
    <>

      <div className="flex justify-between items-center bg-zinc-900 py-2 mt-3 border-b last:border-b-0 border-zinc-800/50">
        <span className="font-semibold text-zinc-500 text-base">{label}</span>
        <span
          className={`text-right text-base break-all ${isLink ? "text-sky-700" : "text-zinc-400"
            }`}
        >
          {value}
        </span>
      </div>
    </>
  );
}

function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts * 1000);
  return d.toLocaleString();
}