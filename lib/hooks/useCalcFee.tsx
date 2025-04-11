import { useMemo } from 'react';
import { generateMultiScript } from '@/lib/inscribe/mint';
export const useCalcFee = ({
  feeRate,
  files,
  oneUtxo,
  discount,
}: {
  feeRate: number;
  discount: number;
  oneUtxo: boolean;
  files: any[];
}) => {
  const VITE_TIP_MIN = 1000;
  const clacFee = useMemo(() => {
    const feeObj: any = {
      networkFee: 0,
      serviceFee: 0,
      totalFee: 0,
      discountServiceFee: 0,
      totalInscriptionSize: 0,
    };
    const totalInscriptionSize = files.reduce(
      (acc, cur) => acc + cur.amount,
      0,
    );
    const totalTxSize = files.reduce((acc, cur) => acc + cur.txsize, 0);
    const outputLength = oneUtxo ? 1 : files.length;
    feeObj.networkFee = Math.ceil(
      (100 + totalTxSize + 31 * outputLength + 10) * feeRate,
    );
    let totalFee = feeObj.networkFee + totalInscriptionSize;
    const oneFee =
      Number(VITE_TIP_MIN) + Math.ceil(totalInscriptionSize * 0.01);
    feeObj.serviceFee = Math.ceil(oneFee);
    feeObj.discountServiceFee = Math.ceil((oneFee * (100 - discount)) / 100);
    feeObj.totalInscriptionSize = totalInscriptionSize;
    feeObj.totalFee = totalFee;
    return feeObj;
  }, [feeRate, files, discount, oneUtxo]);
  return clacFee;
};
