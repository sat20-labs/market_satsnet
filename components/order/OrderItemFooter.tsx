import { useState } from 'react';
import { Button } from '@nextui-org/react';
import { Icon } from '@iconify/react';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';

export const OrderItemFooter = ({
  item,
  canBuy,
  showResale,
  currentAddress,
  onBuy,
  onCancelOrder,
  t,
}) => {
  const [loading, setLoading] = useState(false);

  const buyHandler = async () => {
    setLoading(true);
    try {
      await onBuy?.(item);
    } catch (error) {
      console.error('Buy error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WalletConnectBus className="flex-1" text={t('buttons.buy')}>
      {item?.address === currentAddress && showResale ? (
        <Button
          className="text-tiny h-8 w-full bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 hover:border-none hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 uppercase"
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
          className="flex-1 border-none h-8 w-full bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50 hover:border-none hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 uppercase"
          variant="ghost"
          size="md"
          isDisabled={!canBuy && false}
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
  );
};
