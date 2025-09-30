import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useMemo, useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useAssetStore } from '@/store/asset';
import { cn } from '@/lib/utils';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getDeployedContractInfo, getContractStatus } from '@/api/market';
import { useCommonStore } from '@/store/common';

interface IOrdxProtocolTabProps {
  onChange?: (key: string) => void;
}

export const OrdxProtocolTab = ({ onChange }: IOrdxProtocolTabProps) => {
  const isFirstRender = useRef(true);
  const { t } = useTranslation();
  const { address, connected } = useReactWalletStore((s) => s);
  const { network } = useCommonStore();

  const { assets } = useAssetStore();

  // Fetch AMM and LimitOrder contract URLs
  const { data: deployedUrls } = useQuery({
    queryKey: ['deployedContractURLs', network],
    queryFn: async () => {
      const deployed = await getDeployedContractInfo();
      const urls = deployed?.url || (deployed?.data && deployed.data.url) || [];
      return Array.isArray(urls) ? urls : [];
    },
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
  });

  const ammUrls = useMemo(() => (deployedUrls || []).filter((u: string) => typeof u === 'string' && u.includes('amm.tc')), [deployedUrls]);
  const swapUrls = useMemo(() => (deployedUrls || []).filter((u: string) => typeof u === 'string' && u.includes('swap.tc')), [deployedUrls]);

  // Helper: derive latest price (sats per asset) similar to pages
  const deriveSatsPrice = (pool: any): number => {
    if (!pool) return 0;
    const satsValueInPool = Number(pool.SatsValueInPool ?? pool.SatsAmtInPool ?? 0);
    const amtObj = pool.AssetAmtInPool ?? pool.AssetAmt;
    let assetAmtInPool = 0;
    if (amtObj && typeof amtObj === 'object') {
      const v = Number(amtObj.Value ?? amtObj.value ?? 0);
      const p = Number(amtObj.Precision ?? amtObj.precision ?? 0);
      if (!isNaN(v)) assetAmtInPool = v / Math.pow(10, p || 0);
    }
    // 直接使用池子数据计算价格，不使用接口返回的LastDealPrice
    const derived = assetAmtInPool > 0 ? satsValueInPool / assetAmtInPool : 0;
    return derived;
  };

  // Fetch statuses for both sets and build a price map: `${protocol}:${ticker}` -> sats price
  const { data: ammPools } = useQuery({
    queryKey: ['ammPrices', ammUrls],
    enabled: ammUrls.length > 0,
    queryFn: async () => {
      const list = await Promise.all(ammUrls.map(async (u: string) => {
        try {
          const { status } = await getContractStatus(u);
          return status ? { ...JSON.parse(status), contractURL: u } : null;
        } catch { return null; }
      }));
      return list.filter(Boolean) as any[];
    },
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
  });

  const { data: swapPools } = useQuery({
    queryKey: ['limitOrderPrices', swapUrls],
    enabled: swapUrls.length > 0,
    queryFn: async () => {
      const list = await Promise.all(swapUrls.map(async (u: string) => {
        try {
          const { status } = await getContractStatus(u);
          return status ? { ...JSON.parse(status), contractURL: u } : null;
        } catch { return null; }
      }));
      return list.filter(Boolean) as any[];
    },
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
  });

  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    const apply = (pools?: any[] | null) => {
      (pools || []).forEach(pool => {
        const name = pool?.Contract?.assetName || {};
        const proto = (name.Protocol || '').toLowerCase();
        const tick = (name.Ticker || '').toLowerCase();
        if (!proto || !tick) return;
        const key = `${proto}:${tick}`;
        const price = deriveSatsPrice(pool);
        if (price > 0) {
          // prefer AMM price; if exists, don't override
          if (!(key in map)) map[key] = price;
        }
      });
    };
    apply(ammPools);
    apply(swapPools);
    return map;
  }, [ammPools, swapPools]);

  // Compute BTC balances for ORDX and RUNES
  const ordxBtc = useMemo(() => {
    return (assets.ordx || []).reduce((sum, a) => {
      const key = `${(a.protocol || 'ordx').toLowerCase()}:${(a.ticker || '').toLowerCase()}`;
      const price = priceMap[key] || 0;
      return sum + (price * Number(a.amount || 0)); // sats
    }, 0) / 1e8; // to BTC
  }, [assets.ordx, priceMap]);

  const runesBtc = useMemo(() => {
    return (assets.runes || []).reduce((sum, a) => {
      const key = `${(a.protocol || 'runes').toLowerCase()}:${(a.ticker || '').toLowerCase()}`;
      const price = priceMap[key] || 0;
      return sum + (price * Number(a.amount || 0));
    }, 0) / 1e8;
  }, [assets.runes, priceMap]);

  const fmtBtc = (v: number) => (isNaN(v) ? '0' : Number(v).toFixed(6));

  const list = useMemo(() => {
    return [
      {
        label: 'SAT20 Token',
        key: 'ordx',
        value: fmtBtc(ordxBtc),
      },
      {
        label: 'Runes',
        key: 'runes',
        value: fmtBtc(runesBtc),
      },
      // {
      //   label: t('pages.points.tab'),
      //   key: 'points',
      //   value: pointsValue,
      // },
    ];
  }, [ordxBtc, runesBtc, t]);

  const [selected, setSelected] = useState(list[0].key);

  useEffect(() => {
    if (selected && !isFirstRender.current) {
      onChange?.(selected);
    }
    isFirstRender.current = false;
  }, [selected]);

  return (
    <div className="grid grid-cols-2 max-w-4xl md:grid-cols-4 gap-2 md:gap-4">
      {list.map((item) => {
        const iconSpec = (() => {
          if (item.key === 'runes') return { icon: 'pajamas:status-waiting', grad: 'from-cyan-400 to-blue-500' };
          return { icon: 'pajamas:status-health', grad: 'from-pink-500 to-violet-600' }; // ordx
        })();
        return (
          <Card
            key={item.key}
            className={cn(
              'relative w-full h-[120px] max-w-full cursor-pointer hover:bg-zinc-800/80 opacity-75 hover:opacity-100',
              selected === item.key
                ? 'bg-zinc-900/60 border border-purple-600/80'
                : 'bg-transparent border border-zinc-800'
            )}
            onClick={() => {
              item.key !== 'nft' && setSelected(item.key);
            }}
          >
            <CardHeader className='p-3 pb-0'>
              {/* Top single-line icon */}
              <div className="flex mb-1">
                <span className={`w-9 h-9 rounded-lg shadow-sm shadow-black/30 flex items-center justify-center bg-gradient-to-br ${iconSpec.grad}`}>
                  <Icon icon={iconSpec.icon} width={28} height={28} className="text-white" />
                </span>
              </div>
              <span className="text-sm sm:text-sm font-mono text-gray-400">
                {item.label}
              </span>
            </CardHeader>
            <CardContent className="p-3 pt-1 leading-8">
              <div className="flex items-center text-base sm:text-md">
                <>
                  <Icon icon="cryptocurrency:btc" className="mr-1 custom-btc-small-icon" />
                  <span className='font-extrabold text-zinc-200'>{item.value}</span>
                </>
              </div>
              <div className="flex text-xs sm:font-bold">
                <span className="text-gray-400 h-5">
                  {/* <BtcPrice btc={item.value} /> */}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
