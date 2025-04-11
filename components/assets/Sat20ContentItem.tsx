import { useMemo } from 'react';
import { hideStr, thousandSeparator } from '@/lib/utils';
import { UtxoContent } from '../UtxoContent';

interface Props {
  asset: any;
  utxo?: string;
}
export const Sat20ContentItem = ({ asset, utxo }: Props) => {
  return (
    <div className="w-full h-full relative antialiased  tracking-widest">
      <div className="left-0 top-0 flex z-10 absolute p-2 rounded-br-[1rem] text-xs md:text-base text-center text-gray-200 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 backdrop-saturate-50 hover:text-gray-100">
        {asset?.assets_name}
      </div>
      <UtxoContent
        defaultImage="/ordx-utxo-content-default.jpg"
        inscriptionId={asset?.inscriptionId}
        utxo={utxo}
      ></UtxoContent>
      <div className="font-medium  font-mono text-2xl md:text-3xl mb-1 absolute bottom-0 left-0 z-10 w-full text-center">
        {thousandSeparator(asset?.amount)}
      </div>
    </div>
  );
};
