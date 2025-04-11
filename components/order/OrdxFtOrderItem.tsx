import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { Card, CardBody, CardFooter } from '@nextui-org/react';
import { OrderAssetContent } from './OrderAssetContent';
import { OrderAssetInfo } from './OrderAssetInfo';
import { OrderItemFooter } from './OrderItemFooter';
import { OrderSelectOverlay } from './OrderSelectOverlay';

interface Props {
  item: any;
  onBuy?: (item: any) => Promise<void>;
  delay?: number;
  assets_type?: string;
  assets_name?: string;
  selectedSource?: string;
  showResale?: boolean;
  onCancelOrder?: () => void;
  canSelect?: boolean;
  selected?: boolean;
  onSelect?: (s: boolean) => void;
}

export const OrdxFtOrderItem = ({
  item,
  onBuy,
  canSelect,
  selected,
  selectedSource,
  onSelect,
  assets_name,
  assets_type,
  onCancelOrder,
  delay,
  showResale = true,
}: Props) => {
  const { address: currentAddress } = useReactWalletStore();
  const { t } = useTranslation();

  const asset = useMemo(
    () =>
      item?.assets.find((v) => v.assets_name === assets_name) ||
      item?.assets?.[0],
    [item?.assets, assets_name],
  );
  const othersAssets = useMemo(() => {
    if (item?.assets.length > 1) {
      return item?.assets.filter((v) => v.assets_name !== assets_name);
    }
    return [];
  }, [item?.assets, assets_name]);
  const canBuy = useMemo(
    () =>
      currentAddress &&
      item.address !== currentAddress &&
      (!selectedSource || selectedSource === item.order_source),
    [currentAddress, item.address],
  );

  return (
    <Card
      isPressable
      radius="lg"
      className="forced-colors:hidden border-none w-[10rem] h-[16rem] md:w-[16rem] md:h-[22.6rem] relative hover:border-1 hover:border-solid hover:border-indigo-500 bg-repeat hover:bg-[url('/bg.gif')]"
    >
      {canSelect && (
        <OrderSelectOverlay
          canBuy={canBuy}
          selected={selected}
          onSelect={onSelect}
        />
      )}
      <CardBody className="radius-lg w-[10rem] h-[10rem] md:w-[16em] md:h-[16rem] top-0 bottom-0 left-0">
        <OrderAssetContent
          asset={asset}
          othersAssets={othersAssets}
          order_source={item?.order_source}
          assets_type={assets_type}
          utxo={item?.utxo}
        />
      </CardBody>
      <CardFooter className="block item-center bg-gray-800 w-full h-[6rem] md:h-[6.5rem] p-1 sm:p-2">
        <OrderAssetInfo item={item} asset={asset} assets_type={assets_type} />
        <OrderItemFooter
          item={item}
          canBuy={canBuy}
          showResale={showResale}
          currentAddress={currentAddress}
          onBuy={onBuy}
          onCancelOrder={onCancelOrder}
          t={t}
        />
      </CardFooter>
    </Card>
  );
};
