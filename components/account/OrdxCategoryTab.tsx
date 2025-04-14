// import { Card, CardHeader, CardBody, Divider } from '@nextui-org/react';
// import { useQuery } from '@tanstack/react-query';
// import { useMemo, useState, useEffect, useRef } from 'react';
// import { useTranslation } from 'react-i18next';
// import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
// import { Icon } from '@iconify/react';
// import { getAddressAssetsSummary } from '@/api';
// import { useCommonStore } from '@/store';
// import { BtcPrice } from '@/components/BtcPrice';

// interface IOrdxCategoryTabProps {
//   onChange?: (key: string) => void;
// }
// export const OrdxCategoryTab = ({ onChange }: IOrdxCategoryTabProps) => {
//   const { t } = useTranslation();
//   const { address, balance, network } = useReactWalletStore((state) => state);
//   const { chain } = useCommonStore();
//   const isFirstRender = useRef(true);

//   const { data, isLoading } = useQuery({
//     queryKey: ['addressAssetsSummary', address, chain, network],
//     queryFn: () => getAddressAssetsSummary(address),
//     refetchOnWindowFocus: false,
//     refetchOnReconnect: false,
//     enabled: !!address,
//   });

//   const list = useMemo(() => {
//     const tickerInfo = data?.data?.find((v) => v.assets_type === 'ticker');
//     const exoticInfo = data?.data?.find((v) => v.assets_type === 'exotic');
//     const nftInfo = data?.data?.find((v) => v.assets_type === 'nft');
//     const nsInfo = data?.data?.find((v) => v.assets_type === 'ns');
//     return [
//       {
//         label: 'ORDX',
//         key: 'ticker',
//         value: tickerInfo?.total_value || 0,
//       },
//       {
//         label: 'Runes',
//         key: 'rune',
//         value: 0,
//       },
//       // {
//       //   label: 'Rare Sats',
//       //   key: 'exotic',
//       //   value: exoticInfo?.total_value || 0,
//       // },
//       // {
//       //   label: 'Names[DID]',
//       //   key: 'ns',
//       //   value: nsInfo?.total_value || 0,
//       // },
//       {
//         label: 'Ordinals',
//         key: 'ordinals',
//         value: nftInfo?.total_value || 0,
//       },      
//     ];
//   }, [data]);
//   const [selected, setSelected] = useState(list[0].key);

//   // useEffect(() => {
//   //   if (selected) {
//   //     onChange?.(selected);
//   //   }
//   // }, []);
//   useEffect(() => {
//     if (selected && !isFirstRender.current) {
//       onChange?.(selected);
//     }
//     isFirstRender.current = false;
//   }, [selected]);

//   return (
//     <div className="grid grid-cols-2 max-w-4xl md:grid-cols-4 gap-2 md:gap-4">
//       {list.map((item) => (
//         <Card
//           isHoverable
//           isPressable
//           className={`px-2 w-full h-[90px] max-w-full ${selected === item.key 
//             ? 'bg-zinc-900/60 border border-purple-600/80'
//             : 'bg-transparent border border-zinc-800'
//           }`}
//           key={item.key}
//           onPress={() => {
//             item.key !== 'nft' && setSelected(item.key);
//           }}
//         >
//           <CardHeader className='px-3 pt-2 pb-0'>
//             <span className="text-sm sm:text-sm font-mono text-gray-400">
//               {item.label}
//             </span>
//           </CardHeader>
//           {/* <Divider className="divide-inherit divide-dashed" /> */}
//           {item.key === 'rune' ? (
//             <CardBody className="text-left py-1 text-lg leading-8">
//               <div className="flex">
//               <Icon icon="cryptocurrency-color:btc" className="mr-1 mt-2" />
//                 <span className='font-extrabold text-zinc-200'>{item.value}</span>
//               </div>
//               <div className="text-xs sm:font-bold text-zinc-400 gap-2">                
//                <span className='ml-1 mr-1'>$</span>
//                <span className="h-4">
//                 <BtcPrice btc={item.value} />
//                 </span>
//               </div>
//             </CardBody>
//           ) : (
//             <CardBody className="text-left py-1 text-lg leading-8">
//               <div className="flex">
//                 <Icon icon="cryptocurrency-color:btc" className="mr-1 mt-2" />
//                 <span className='font-extrabold text-zinc-200'>{item.value}</span>
//               </div>
//               <div className="text-xs sm:font-bold text-zinc-400 gap-2">                
//                <span className='ml-1 mr-1'>$</span>
//                <span className="h-4">
//                 <BtcPrice btc={item.value} />
//                 </span>
//               </div>
//             </CardBody>
//           )}
//         </Card>
//       ))}
//     </div>
//   );
// };

'use client';

import { Card, CardHeader, CardBody } from '@nextui-org/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { Icon } from '@iconify/react';
import { getAddressAssetsSummary } from '@/api';
import { useCommonStore } from '@/store';
import { BtcPrice } from '@/components/BtcPrice';

interface IOrdxCategoryTabProps {
  onChange?: (key: string) => void;
}

export const OrdxCategoryTab = ({ onChange }: IOrdxCategoryTabProps) => {
  const { t } = useTranslation();
  const { address, network } = useReactWalletStore((state) => state);
  const { chain } = useCommonStore();
  const isFirstRender = useRef(true);

  const { data, isLoading } = useQuery({
    queryKey: ['addressAssetsSummary', address, chain, network],
    queryFn: () => getAddressAssetsSummary(address),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!address,
  });

  // 资产分类列表
  const list = useMemo(() => {
    const tickerInfo = data?.data?.find((v) => v.assets_type === 'ticker');
    const nftInfo = data?.data?.find((v) => v.assets_type === 'nft');
    return [
      {
        label: 'ORDX',
        key: 'ticker',
        value: tickerInfo?.total_value || 0,
      },
      {
        label: 'Runes',
        key: 'rune',
        value: 0,
      },
      {
        label: 'BRC20',
        key: 'brc20',
        value: 0,
      },
      {
        label: 'Ordinals',
        key: 'ordinals',
        value: nftInfo?.total_value || 0,
      },
    ];
  }, [data]);

  const [selected, setSelected] = useState(list[0].key); // 当前选中的主分类
  const [subSelected, setSubSelected] = useState('rareSats'); // Ordinals 下的子标签，默认选中 Rare Sats

  // 触发 onChange 回调
  useEffect(() => {
    if (selected && !isFirstRender.current) {
      if (selected === 'ordinals') {
        onChange?.(subSelected); // 如果是 Ordinals，传递子标签的选中状态
      } else {
        onChange?.(selected); // 其他分类直接传递主分类
      }
    }
    isFirstRender.current = false;
  }, [selected, subSelected]);

  return (
    <div>
      {/* 主分类 */}
      <div className="grid grid-cols-2 max-w-4xl md:grid-cols-4 gap-2 md:gap-4">
        {list.map((item) => (
          <Card
            isHoverable
            isPressable
            className={`px-2 w-full h-[90px] max-w-full bg-zinc-800 ${selected === item.key
                ? 'bg-zinc-800 border border-purple-600/80'
                : 'border border-zinc-800'
              }`}
            key={item.key}
            onPress={() => {
              setSelected(item.key);
            }}
          >
            <CardHeader className="px-3 pt-2 pb-0">
              <span className="text-sm sm:text-sm font-mono text-gray-400">
                {item.label}
              </span>
            </CardHeader>
            <CardBody className="text-left py-1 text-lg leading-8">
              <div className="flex">
                <Icon icon="cryptocurrency-color:btc" className="mr-1 mt-2" />
                <span className="font-extrabold text-zinc-200">{item.value}</span>
              </div>
              <div className="text-xs sm:font-bold text-zinc-400 gap-2">
                <span className="ml-1 mr-1">$</span>
                <span className="h-4">
                  <BtcPrice btc={item.value} />
                </span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Ordinals 子标签 */}
      {selected === 'ordinals' && (
        <div className="mt-4 flex gap-2">
          <button
            className={`px-3 py-1 text-sm font-medium rounded-xl ${subSelected === 'rareSats'
                ? 'btn-gradient text-white'
                : 'bg-zinc-800 text-gray-400'
              }`}
            onClick={() => setSubSelected('rareSats')}
          >
            RareSats
          </button>
          <button
            className={`px-3 py-1 text-sm font-medium rounded-xl ${subSelected === 'namesDID'
                ? 'btn-gradient text-white'
                : 'bg-zinc-800 text-gray-400'
              }`}
            onClick={() => setSubSelected('namesDID')}
          >
            Names
          </button>
        </div>
      )}
    </div>
  );
};
