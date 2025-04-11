import {
  Button,
  Card,
  CardFooter,
  CardBody,
  Checkbox,
  Chip,
  Snippet,
  Image,
} from '@nextui-org/react';
import { Icon } from '@iconify/react';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { hideStr, thousandSeparator } from '@/lib/utils';

import { NameItem } from './NameItem';
import { Sat20Item } from './Sat20Item';
import { Sat20ContentItem } from './Sat20ContentItem';
import { RareSatsItem } from './RareSatsItem';
import { OrdinalsNftItem } from './OrdinalsNftItem';

interface Props {
  item: any;
  assets_type;
  assets_name: string;
  onSell?: (item: any) => void;
  onTransfer?: (item: any) => void;
  onSplit?: (item: any) => void;
  onCancelOrder?: () => void;
  selected?: boolean;
  canSelect?: boolean;
  onSelect?: (b: boolean) => void;
  delay?: number;
}
export const AssetsItem = ({
  item,
  onSell,
  onTransfer,
  onSplit,
  onCancelOrder,
  selected,
  assets_name,
  assets_type,
  canSelect,
  onSelect,
  delay,
}: Props) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  let isText = true;

  const sellHandler = async () => {
    setLoading(true);
    await onSell?.(item);
    setLoading(false);
  };
  const asset = useMemo(
    () =>
      item?.assets_list?.find((v) => v?.assets_name === assets_name) ||
      item?.assets_list[0],
    [item?.assets_list, assets_name],
  );
  // const otherAssets = [
  //   {
  //     assets_name: 'pizza',
  //     amount: 0,
  //     content_type: '',
  //     delegate: '',
  //     assets_type: 'exotic',
  //   },
  // ];
  const otherAssets = useMemo(() => {
    if (item?.assets_list?.length > 1) {
      return item.assets_list.filter((v) => v.assets_name !== assets_name);
    }
    return [];
  }, [item?.assets, assets_name]);
  const showContent = (content_type?: string, delegate?: string) => {
    if (!content_type || assets_type !== 'ticker') return false;
    return (
      !!delegate ||
      !['text/plain'].some((type) => content_type.indexOf(type) > -1)
    );
  };
  const isSat20Content = useMemo(() => {
    if (!asset?.content_type || assets_type !== 'ticker') return false;
    return (
      !!asset?.delegate ||
      !['text/plain'].some((type) => asset?.content_type.indexOf(type) > -1)
    );
  }, [asset]);

  const isSat20Ticker = useMemo(() => {
    if (assets_type !== 'ticker') return false;
    return !isSat20Content;
  }, [asset, isSat20Content]);
  let tickContent =
    "{'p':'ordx','op':'mint','tick':'" +
    asset?.assets_name +
    "','amt':'" +
    asset?.amount +
    "'}";
  if (
    asset?.assets_type === 'exotic' ||
    showContent(item?.assets?.[0]?.content_type, item?.assets?.[0]?.delegate)
  ) {
    tickContent = '';
    isText = false;
  }
  const splitHandler = async (item: any) => {
    setLoading(true);
    try {
      await onSplit?.(item);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  const cancelHandler = async () => {
    setLoading(true);
    await onCancelOrder?.();
    setLoading(false);
  };
  const showSplit = assets_type === 'ticker' && ['图币测试5', 'pearl', 'rarepizza'].includes(assets_name);
  
  return (
    <Card
      radius="lg"
      classNames={{
        footer: 'p-1 md:p-3',
      }}
      className="card-hover forced-colors:hidden min-w-[10rem] h-[16rem] md:w-[16rem] md:h-[22.6rem] relative border-1 border-solid border-transparent hover:border hover:border-solid hover:border-indigo-500 bg-repeat hover:bg-[url('/bg.gif')]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {canSelect && (
        <div
          className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-70 z-30 cursor-pointer"
          onClick={() => {
            onSelect?.(!selected);
          }}
        >
          <div className="flex absolute top-4 right-4">
            <Checkbox isSelected={selected} onValueChange={onSelect} />
          </div>
        </div>
      )}
      <CardBody className="radius-lg min-w-[10rem] min-h-[10rem] md:w-[16rem] md:h-[16rem] p-0 justify-center overflow-hidden">
        {asset?.assets_type === 'ns' && <NameItem asset={asset} />}
        {isSat20Ticker && <Sat20Item asset={asset} />}
        {isSat20Content && <Sat20ContentItem asset={asset} utxo={item?.utxo} />}
        {asset?.assets_type === 'exotic' && (
          <RareSatsItem asset={asset} otherAssets={otherAssets} />
        )}
        {asset?.assets_type === 'nft' && <OrdinalsNftItem asset={asset} />}
      </CardBody>

      <CardFooter className="block item-center bg-gray-800 h-[6rem] md:h-[6.5rem]">
        <Snippet
          codeString={item?.utxo}
          className="bg-transparent text-blue-400 pt-0 pb-0"
          symbol=""
          size="sm"
          variant="flat"
        >
          <span className="font-thin md:pl-8">{hideStr(item?.utxo, 6)}</span>
        </Snippet>
        <div className="flex item-center justify-center pb-1 gap-2">
          {item.order_id === 0 ? (
            <>
              <Button
                // fullWidth
                variant="ghost"
                size="md"
                isLoading={loading}
                // color="primary"
                radius="sm"
                onClick={sellHandler}
                className="text-tiny h-8 flex-1 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 hover:border-none hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 ${buttonStyles.buyNowButton}` uppercase min-w-unit-2"
              >
                {t('buttons.list_sale')}
              </Button>
              <Button
                // fullWidth
                variant="ghost"
                size="md"
                isLoading={loading}
                // color="primary"
                radius="sm"
                onClick={() => onTransfer?.(item)}
                className="text-tiny h-8 flex-1 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 hover:border-none hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 ${buttonStyles.buyNowButton}` uppercase min-w-unit-2"
              >
                {t('common.transfer')}
              </Button>
              {showSplit && (
                  <Button
                    // fullWidth
                    variant="ghost"
                    size="md"
                    isLoading={loading}
                    // color="primary"
                    radius="sm"
                    onClick={() => {
                      splitHandler?.(item);
                    }}
                    className="text-tiny h-8 flex-1 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 hover:border-none hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 ${buttonStyles.buyNowButton}` uppercase min-w-unit-2"
                  >
                    {t('common.split')}
                  </Button>
                )}
            </>
          ) : (
            <Button
              className="text-tiny h-8 w-5/6 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 hover:border-none hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 ${buttonStyles.buyNowButton}` uppercase"
              // fullWidth
              variant="flat"
              // color="default"
              radius="sm"
              isLoading={loading}
              startContent={
                item.locker == '1' ? (
                  <Icon icon="mdi:lock" className="text-lg" />
                ) : null
              }
              onClick={cancelHandler}
            >
              {t('buttons.remove_sale')}（{item.price} {item.currency}）
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
