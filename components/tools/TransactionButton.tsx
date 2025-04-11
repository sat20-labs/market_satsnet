import { Button } from '@nextui-org/react';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import { useTranslation } from 'react-i18next';

export function TransactionButton({
  loading,
  splitHandler,
  fee,
  feeRate,
}: {
  loading: boolean;
  splitHandler: () => void;
  fee: number;
  feeRate: { value: number };
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center w-full space-y-2 sm:space-y-3">
      <WalletConnectBus className="w-full">
        <Button
          color="primary"
          onClick={splitHandler}
          isLoading={loading}
          className="w-full sm:w-auto"
          size="sm"
        >
          {t('pages.tools.transaction.btn_send')}
        </Button>
      </WalletConnectBus>
      <div className="text-xs sm:text-sm text-gray-400 text-center">
        <p>
          {t('pages.tools.transaction.network_fee')}: {fee} sats
        </p>
        <p>{feeRate.value} sat/vb</p>
      </div>
    </div>
  );
}
