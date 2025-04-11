import {
  Button,
  Card,
  CardFooter,
  CardBody,
  Chip,
  Checkbox,
  Listbox,
  ListboxItem,
  Snippet,
  Image,
} from '@nextui-org/react';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { UtxoContent } from '@/components/UtxoContent';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { Icon } from '@iconify/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hideStr, thousandSeparator } from '@/lib/utils';
import { BtcPrice } from '../BtcPrice';

interface Props {
  item: any;
  onBuy?: any;
  delay?: number;
  assets_type?: string;
  assets_name?: string;
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
  onSelect,
  assets_name,
  assets_type,
  onCancelOrder,
  delay,
  showResale = true,
}: Props) => {
  const { address: currentAddress } = useReactWalletStore();
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation();
  // console.warn("content_type==========" + asset.content_type.toLowerCase());
  const buyHandler = async () => {
    setLoading(true);
    try {
      await onBuy?.(item);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const canBuy = useMemo(
    () => currentAddress && item.address !== currentAddress,
    [currentAddress, item.address],
  );
  const showContent = (content_type?: string, delegate?: string) => {
    if (!content_type) return false;
    return (
      !!delegate ||
      !['text/plain'].some((type) => content_type.indexOf(type) > -1)
    );
  };
  const asset = useMemo(
    () =>
      item?.assets.find((v) => v.assets_name === assets_name) ||
      item?.assets?.[0],
    [item?.assets, assets_name],
  );
  const selectHandler = (b: boolean) => {
    if (!canBuy) {
      return;
    }
    onSelect?.(b);
  };

  return (
    <Card
      isPressable
      radius="lg"
      classNames={{
        footer: 'p-1 sm:p-2',
      }}
      // className="border-none w-full h-[14rem] md:h-[18rem] relative"
      className="forced-colors:hidden border-none w-[10rem] h-[16rem] md:w-[16rem] md:h-[22.6rem] relative hover:border-1 hover:border-solid hover:border-indigo-500 bg-repeat hover:bg-[url('/bg.gif')]"
    >
      {canSelect && (
        <div
          className="absolute top-0 left-0 w-full h-full z-30 cursor-pointer bg-gray-600 bg-opacity-50"
          onClick={() => {
            selectHandler?.(!selected);
          }}
        >
          <div className="flex absolute top-4 right-4">
            <Checkbox
              isDisabled={!canBuy}
              isSelected={selected}
              onValueChange={selectHandler}
            />
          </div>
        </div>
      )}
      <CardBody className="radius-lg w-[10rem] h-[10rem] md:w-[16em] md:h-[16rem] top-0 bottom-0 left-0">
        <div className="flex-1 text-xs tracking-widest antialiased md:text-base">
          <div className="flex-1 justify-center h-full overflow-hidden top-1 left-1">
            <div className="absolute items-center inset-0 z-10">
              {asset?.assets_type === 'exotic' ? (
                <Image
                  radius="full"
                  src={`/raresats/${asset?.assets_name}.svg`}
                  alt="logo"
                  className="w-32 h-32 md:w-36 md:h-36 top-8 left-8 md:top-14 md:left-14 rounded-full"
                />
              ) : (
                showContent(asset?.content_type, asset?.delegate) && (
                  <div className="h-full w-full">
                    <UtxoContent
                      defaultImage="/ordx-utxo-content-default.jpg"
                      inscriptionId={asset?.inscription_id}
                      delay={delay}
                      utxo={item?.utxo}
                    ></UtxoContent>
                  </div>
                )
              )}
            </div>
            {showContent(asset?.content_type, asset?.delegate) ? (
              <section className="text-center font-mono absolute top-0 left-0 w-full h-full z-20 flex flex-col justify-end">
                <p className="font-medium text-2xl md:text-3xl mb-1">
                  {thousandSeparator(asset?.amount)}
                </p>
              </section>
            ) : (
              <section className="text-center pt-10 font-mono md:pt-12 absolute top-0 left-0 w-full h-full z-20">
                <p className="font-medium pt-5 text-2xl md:text-3xl md:pt-6">
                  {assets_type === 'ns'
                    ? asset?.assets_name
                    : thousandSeparator(asset?.amount)}
                </p>
                {assets_type !== 'ns' && (
                  <>
                    <p className="pt-12 md:pb-2 md:text-sm">
                      <span className="font-bold text-amber-400">
                        {(asset?.unit_price / asset?.unit_amount).toFixed(2)}
                      </span>
                      <span className="font-mono text-gray-100">
                        &nbsp;sats/{asset?.assets_name}
                      </span>
                    </p>
                    <p className="md:text-sm">
                      <span className="font-mono text-gray-100">
                        $
                        <BtcPrice
                          btc={
                            asset?.unit_price / asset?.unit_amount / 100000000
                          }
                        />
                        &nbsp; /{asset?.assets_name}
                      </span>
                    </p>
                  </>
                )}
              </section>
            )}
          </div>{' '}
          {assets_type !== 'ns' && (
            <div className="left-0 top-0 flex absolute p-2 rounded-br-[1rem] text-center text-gray-200 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 backdrop-saturate-50 hover:text-gray-100 z-10">
              {asset?.assets_name}
            </div>
          )}
        </div>
      </CardBody>
      <CardFooter className="block item-center bg-gray-800 w-full h-[6rem] md:h-[6.5rem]">
        <div
          className={`flex-1 flex items-center justify-between gap-4 font-bold mb-1 sm:md-2 ${assets_type === 'ns' ? 'mb-4' : ''}`}
        >
          <div className="flex ">
            {item.currency === 'BTC' && (
              <Icon icon="cryptocurrency-color:btc" className="mr-1 mt-0.5" />
            )}
            <span className="text-sm text-gray-400">{item?.price}</span>
          </div>
          <div className="flex">
            <span className="text-sm text-gray-500">
              $
              <BtcPrice btc={item?.price} />
            </span>
          </div>
        </div>
        {assets_type !== 'ns' && (
          <div className="flex-1 flex items-center justify-between gap-4  md:mb-2 text-[10px] md:text-xs mb-1">
            <div className="flex items-center">
              {item.currency === 'BTC' && (
                <Icon icon="cryptocurrency-color:btc" className="mr-1 mt-0.5" />
              )}
              <span className="font-bold text-amber-400">
                {(asset?.unit_price / asset?.unit_amount).toFixed(2)}
              </span>
              <span className="font-mono text-gray-100">
                &nbsp;sats/{asset?.assets_name}
              </span>
            </div>
          </div>
        )}

        <WalletConnectBus className={`flex-1`} text={t('buttons.buy')}>
          {item?.address === currentAddress && showResale ? (
            <Button
              className="text-tiny h-8 w-full bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 hover:border-none hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 ${buttonStyles.buyNowButton}` uppercase"
              variant="flat"
              radius="sm"
              startContent={
                item.locked == '1' ? (
                  <Icon icon="mdi:lock" className="text-lg" />
                ) : null
              }
              onClick={onCancelOrder}
            >
              {t('buttons.remove_sale')}
            </Button>
          ) : (
            <Button
              className="flex-1 border-none h-8 w-full bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 hover:border-none hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 ${buttonStyles.buyNowButton}` uppercase"
              variant="ghost"
              size="md"
              isDisabled={!canBuy}
              isLoading={loading}
              radius="sm"
              startContent={
                item.locked == '1' ? (
                  <Icon icon="mdi:lock" className="text-lg" />
                ) : null
              }
              onClick={buyHandler}
            >
              {t('buttons.buy')}
            </Button>
          )}
        </WalletConnectBus>
      </CardFooter>
    </Card>
  );
};
