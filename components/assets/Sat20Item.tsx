import { useMemo } from 'react';
import { hideStr, thousandSeparator } from '@/lib/utils';

interface Props {
  asset: any;
}
export const Sat20Item = ({ asset }: Props) => {
  const tickContent = useMemo(() => {
    return (
      "{'p':'ordx','op':'mint','tick':'" +
      asset?.assets_name +
      "','amt':'" +
      asset?.amount +
      "'}"
    );
  }, [asset]);
  return (
    <div className="w-full h-full text-xs tracking-widest antialiased md:text-base flex items-center justify-center relative">
      <div className="left-0 top-0 flex z-10 absolute p-2 rounded-br-[1rem] text-center text-gray-200 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 backdrop-saturate-50 hover:text-gray-100">
        {asset?.assets_name}
      </div>
      <section className="text-center pt-4 font-mono md:pt-12 absolute top-0 left-0 w-full h-full z-10">
        <p className="font-medium pt-3 text-2xl md:text-3xl md:pt-3">
          {thousandSeparator(asset?.amount)}
        </p>
        <p className=" pt-4 md:pt-12 md:pb-2 md:text-xs p-4">
          <span className="font-mono text-gray-100">{tickContent}</span>
        </p>
      </section>
    </div>
  );
};
