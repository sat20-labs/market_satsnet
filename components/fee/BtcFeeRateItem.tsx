interface BtcFeeRateItemProps {
  value: any;
  label: string;
  className?: string;
  onClick?: () => void;
}
export const BtcFeeRateItem = ({
  label,
  value,
  onClick,
  className,
}: BtcFeeRateItemProps) => {
  return (
    <div
      className={`w-full h-30 p-2 cursor-pointer bg-gray-500 rounded-lg text-center border-2  ${className}`}
      onClick={onClick}>
      <div className="text-lg font-bold">{label}</div>
      <div className='flex justify-center items-center'>
        <span className="mr-2 text-xl text-orange-400 font-bold">{value}</span>
        <span>sats/vB</span>
      </div>
    </div>
  );
};
