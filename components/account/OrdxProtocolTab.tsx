import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useMemo, useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useAssetStore } from '@/store/asset';
import { cn } from '@/lib/utils';

interface IOrdxProtocolTabProps {
  onChange?: (key: string) => void;
}

export const OrdxProtocolTab = ({ onChange }: IOrdxProtocolTabProps) => {
  const isFirstRender = useRef(true);

  const { assets } = useAssetStore();
  const list = useMemo(() => {
    return [
      {
        label: 'SAT20 Token',
        key: 'ordx',
        value: assets.ordx.reduce((sum, asset) => sum + asset.amount, 0),
      },
      {
        label: 'Runes',
        key: 'runes',
        value: assets.runes.reduce((sum, asset) => sum + asset.amount, 0),
      },
      // {
      //   label: 'Points',
      //   key: 'points',
      //   value: '12800', // Assuming points are not yet implemented
      // },
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
          key={item.key}
          className={cn(
            'w-full h-[90px] max-w-full cursor-pointer hover:bg-zinc-800/80',
            selected === item.key
              ? 'bg-zinc-900/60 border border-purple-600/80'
              : 'bg-transparent border border-zinc-800'
          )}
          onClick={() => {
            item.key !== 'nft' && setSelected(item.key);
          }}
        >
          <CardHeader className='p-3 pb-0'>
            <span className="text-sm sm:text-sm font-mono text-gray-400">
              {item.label}
            </span>
          </CardHeader>
          <CardContent className="p-3 pt-1 leading-8">
            <div className="flex items-center text-base sm:text-md">
              {/* <Icon icon="cryptocurrency-color:btc" className="mr-1" /> */}
              {item.label === 'Points' ? (
                  <>
                    <Icon icon="mdi:medal-outline" className="mr-1 custom-medal-icon" />
                    <span className='font-extrabold text-zinc-200'>{item.value}</span><span className='text-zinc-400 ml-1'>MP</span>
                  </>
                ) : (
                  <>
                    <Icon icon="cryptocurrency:btc" className="mr-1 custom-btc-small-icon" />
                    <span className='font-extrabold text-zinc-200'>{item.value}</span>
                  </>
                )}
              
            </div>
            <div className="flex text-xs sm:font-bold">
              {/* <span className="text-yellow-400 w-5"> &nbsp;$</span> */}
              <span className="text-gray-400 h-5">
                {/* <BtcPrice btc={item.value} /> */}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
