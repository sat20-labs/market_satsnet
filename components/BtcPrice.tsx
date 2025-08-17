import { useBtcPrice } from '@/lib/hooks';

interface Props {
  btc: string | number;
  className?: string;
}
export const BtcPrice = ({ btc, className }: Props) => {
  const price = useBtcPrice(btc);
  console.log('price', price);
  return <span className={className}>{price}</span>;
};