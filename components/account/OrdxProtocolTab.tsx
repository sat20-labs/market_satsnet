import { Card, CardHeader, CardBody, Divider } from '@nextui-org/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { Icon } from '@iconify/react';
import { marketApi } from '@/api';
import { useCommonStore } from '@/store';
import { BtcPrice } from '@/components/BtcPrice';

interface IOrdxProtocolTabProps {
  onChange?: (key: string) => void;
}
export const OrdxProtocolTab = ({ onChange }: IOrdxProtocolTabProps) => {
  const { address } = useReactWalletStore((state) => state);
  const { chain, network} = useCommonStore();
  const isFirstRender = useRef(true);

  const { data, isLoading } = useQuery({
    queryKey: ['addressAssetsSummary', address, chain, network],
    queryFn: () => marketApi.getAddressAssetsSummary(address),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!address,
  });
  
  const list = useMemo(() => {
    const tickerInfo = data?.data?.find((v) => v.assets_type === 'ticker');
    const exoticInfo = data?.data?.find((v) => v.assets_type === 'exotic');
    const nftInfo = data?.data?.find((v) => v.assets_type === 'nft');
    const nsInfo = data?.data?.find((v) => v.assets_type === 'ns');
    return [
      {
        label: 'SAT20 Token',
        key: 'ticker',
        value: tickerInfo?.total_value || 0,
      },
      {
        label: 'Runes',
        key: 'rune',
        value: 0,
      },
      {
        label: 'Rare Sats',
        key: 'exotic',
        value: exoticInfo?.total_value || 0,
      },
      {
        label: 'Names[DID]',
        key: 'ns',
        value: nsInfo?.total_value || 0,
      },
      {
        label: 'Ordinals NFT',
        key: 'nft',
        value: nftInfo?.total_value || 0,
      },      
    ];
  }, [data]);
  const [selected, setSelected] = useState(list[0].key);

  // useEffect(() => {
  //   if (selected) {
  //     onChange?.(selected);
  //   }
  // }, []);
  useEffect(() => {
    if (selected && !isFirstRender.current) {
      onChange?.(selected);
    }
    isFirstRender.current = false;
  }, [selected]);

  return (
    <div className="grid grid-cols-2 max-w-4xl md:grid-cols-4 gap-2 md:gap-4">
      {list.map((item) => (
        <Card
          isHoverable
          isPressable
          className={`px-2 w-full h-[90px] max-w-full ${selected === item.key 
            ? 'bg-zinc-900/60 border border-purple-600/80'
            : 'bg-transparent border border-zinc-800'
          }`}
          key={item.key}
          onPress={() => {
            item.key !== 'nft' && setSelected(item.key);
          }}
        >
          <CardHeader className='px-3 pt-2 pb-0'>
            <span className="text-sm sm:text-sm font-mono text-gray-400">
              {item.label}
            </span>
          </CardHeader>
          {/* <Divider className="divide-inherit divide-dashed" /> */}
          {item.key === 'rune' ? (
            <CardBody className="text-left py-1 leading-8">
              <div className="flex items-center text-base sm:text-md">
                <Icon icon="cryptocurrency-color:btc" className="mr-1" />
                <span className='font-extrabold text-zinc-200'>{item.value}</span>
              </div>
              <div className="flex text-xs sm:font-bold">
                <span className="text-yellow-400 w-5"> &nbsp;$</span>
                <span className="text-gray-400 h-5">
                  <BtcPrice btc={item.value} />
                </span>
              </div>
            </CardBody>
          ) : (
            <CardBody className="text-left py-1 text-lg leading-8">
              <div className="flex">
                <Icon icon="cryptocurrency-color:btc" className="mr-1 mt-2" />
                <span className='font-extrabold text-zinc-200'>{item.value}</span>
              </div>
              <div className="flex text-xs sm:font-bold">
                <span className="text-yellow-400 w-5"> &nbsp;$</span>
                <span className="text-gray-400 h-5">
                  <BtcPrice btc={item.value} />
                </span>
              </div>
            </CardBody>
          )}
        </Card>
      ))}
    </div>
  );
};
