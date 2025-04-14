import { Card, CardHeader, CardBody, Divider } from '@nextui-org/react';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { Icon } from '@iconify/react';
import { useCommonStore } from '@/store';
import { BtcPrice } from '@/components/BtcPrice';
import { useAssetStore } from '@/store/asset';

interface IOrdxProtocolTabProps {
  onChange?: (key: string) => void;
}

export const OrdxProtocolTab = ({ onChange }: IOrdxProtocolTabProps) => {
  const isFirstRender = useRef(true);

  const { assets } = useAssetStore();
  console.log('assets', assets);
  const list = useMemo(() => {
    return [
      {
        label: 'SAT20 Token',
        key: 'ordx',
        value: assets.ordx.reduce((sum, asset) => sum + asset.amount, 0),
      },
      {
        label: 'Runes',
        key: 'rune',
        value: assets.runes.reduce((sum, asset) => sum + asset.amount, 0),
      },
    ];
  }, [assets]);
  
  const [selected, setSelected] = useState(list[0].key);

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
          <CardBody className="text-left py-1 leading-8">
            <div className="flex items-center text-base sm:text-md">
              <Icon icon="cryptocurrency-color:btc" className="mr-1" />
              <span className='font-extrabold text-zinc-200'>{item.value}</span>
            </div>
            <div className="flex text-xs sm:font-bold">
              <span className="text-yellow-400 w-5"> &nbsp;$</span>
              <span className="text-gray-400 h-5">
                {/* <BtcPrice btc={item.value} /> */}
              </span>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};
