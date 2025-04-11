import { Image } from '@nextui-org/react';
import { hideStr, thousandSeparator } from '@/lib/utils';
interface Props {
  asset: any;
  otherAssets?: any[];
}
export const RareSatsItem = ({ asset, otherAssets }: Props) => {
  return (
    <div className="w-full h-full flex justify-center items-center relative">
      <div className="left-0 top-0 w-flex z-10 absolute p-2 rounded-br-[1rem] text-xs sm:text-sm text-center text-gray-200 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 backdrop-saturate-50 hover:text-gray-100">
        {asset?.assets_name}
      </div>
      <Image
        classNames={{
          wrapper: 'w-16 h-16 sm:w-32 md:h-32',
          img: 'w-full h-full',
        }}
        src={`/raresats/${asset?.assets_name}.svg`}
        alt="logo"
      />
      <div className="flex gap-1 absolute top-2 px-1 overflow-x-auto w-[90%] right-0 justify-end">
        {otherAssets?.map((item, i) => (
          <Image
            key={i}
            src={`/raresats/${item?.assets_name}.svg`}
            alt="icon"
            className="w-4 h-4 md:w-5 md:h-5"
          />
        ))}
      </div>
      <div className="font-medium  font-mono text-2xl md:text-3xl mb-1 absolute bottom-0 left-0 z-10 w-full text-center">
        {thousandSeparator(asset?.amount)}
      </div>
    </div>
  );
};
