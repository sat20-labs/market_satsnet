import { Divider } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface FeeShowProps {
  inscriptionSize?: number;
  feeRate?: number;
  serviceFee?: number;
  discount?: number;
  totalFee?: number;
  discountServiceFee?: number;
  discountTotalFee?: number;
  totalInscriptionSize?: number;
  networkFee?: number;
  filesLength?: number;
}
export const FeeShow = ({
  inscriptionSize,
  feeRate,
  serviceFee,
  totalFee,
  discount,
  discountServiceFee,
  totalInscriptionSize,
  discountTotalFee,
  networkFee,
  filesLength,
}: FeeShowProps) => {
  const { t } = useTranslation();
  const serviceText = useMemo(() => {
    const oneFee = inscriptionSize
      ? Math.max(
          Number(process.env.NEXT_PUBLIC_SERVICE_FEE),
          Math.ceil(inscriptionSize * 0.1),
        )
      : 0;
    let text = `${oneFee} x ${filesLength} = ${serviceFee}`;
    // if (serviceStatus != 1) {
    //   text += `, ` + t('pages.inscribe.fee.no_fee');
    // }
    return text;
  }, [inscriptionSize, serviceFee, filesLength]);
  return (
    <div>
      {feeRate && (
        <>
          <div className="flex justify-between">
            <div>{t('pages.inscribe.fee.fee_rate')}</div>
            <div>
              <span>{feeRate}</span> <span> sats/vB</span>
            </div>
          </div>
          <Divider style={{ margin: '10px 0' }} />
        </>
      )}
      {!!totalInscriptionSize && (
        <div className="flex justify-between mb-2">
          <div>{t('pages.inscribe.fee.inscription_size')}</div>
          <div>
            <span>{totalInscriptionSize}</span>
            <span> sats</span>
          </div>
        </div>
      )}

      {!!networkFee && (
        <div className="flex justify-between">
          <div>{t('pages.inscribe.fee.network_fee')}(Submint&Reveal)</div>
          <div>
            <span>{networkFee}</span> <span> sats</span>
          </div>
        </div>
      )}

      <Divider style={{ margin: '10px 0' }} />
      {!!serviceFee && (
        <div className="flex justify-between mb-2">
          <div>
            {t('pages.inscribe.fee.service_fee')}
            (orginal: {serviceFee} sats, discount: {discount}%)
          </div>
          <div>
            <span>{discountServiceFee}</span> <span> sats</span>
          </div>
        </div>
      )}

      {!!totalFee && (
        <div className="flex justify-between">
          <div>{t('pages.inscribe.fee.total_fee')}</div>
          <div>
            <span>{totalFee}</span> <span> sats</span>
          </div>
        </div>
      )}
    </div>
  );
};
