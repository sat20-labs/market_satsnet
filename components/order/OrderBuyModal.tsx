import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Snippet,
  Chip,
  Spinner,
} from '@nextui-org/react';
import { notification } from 'antd';
import {
  hideStr,
  filterUtxosByValue,
  buildBuyOrder,
  satsToBitcoin,
  btcToSats,
  buildDummyUtxos,
} from '@/lib';
import { SIGHASH_SINGLE_ANYONECANPAY, DUMMY_UTXO_VALUE } from '@/lib/constants';
import { calcUtxosVirtualGas } from '@/lib/utils/btc';

import { getUtxoByValue, buyOrder, unlockOrder } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useState } from 'react';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { useCommonStore } from '@/store';
import { useMap } from 'react-use';

interface OrderBuyModalProps {
  visiable: boolean;
  item: any;
  orderRaw?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}
export const OrderBuyModal = ({
  visiable,
  item,
  orderRaw,
  onClose: onModalClose,
  onSuccess,
}: OrderBuyModalProps) => {
  const { t } = useTranslation();
  const [calcFeeData, { set: setCalcFeeData }] = useMap<any>({
    dummyUtxos: [],
    balanceUtxos: [],
    dummyFee: 0,
    dummyConsumedBalance: 0,
    dummyConsumeUtxos: [],
    payUtxos: [],
    payFee: 0,
  });
  let serviceFee = 0;
  if (
    process.env.NEXT_PUBLIC_SERVICE_FEE &&
    process.env.NEXT_PUBLIC_IS_FREE == '0'
  ) {
    serviceFee = Number(process.env.NEXT_PUBLIC_SERVICE_FEE);
  }
  const { feeRate, chain } = useCommonStore((state) => state);
  const { address, network } = useReactWalletStore((state) => state);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const { data, isLoading } = useSWR(
    `getUtxoByValue-${address}-${chain}-${network}`,
    () => getUtxoByValue({ address, network, value: 500 }),
  );
  const utxos = useMemo(() => data?.data || [], [data]);
  const spendableValue = useMemo(() => {
    return utxos.reduce((pre, cur) => {
      return pre + cur.value;
    }, 0);
  }, [utxos]);
  const priceSats = useMemo(() => {
    return item?.price ? btcToSats(item?.price) : 0;
  }, [item?.price]);
  const calcFee = async () => {
    if (!utxos.length) {
      return;
    }
    setLoading(true);
    try {
      const dummyUtxos = utxos.filter((v) => v.value === 0)?.slice(0, 2) || [];
      console.log('dummyUtxos', dummyUtxos);
      let dummyFee = 0;
      let dummyConsumedBalance = 0;
      let dummyConsumeUtxos: any[] = [];
      if (dummyUtxos.length !== 2) {
        const virtualDummyFee = (170 * 10 + 34 * 3 + 10) * feeRate.value;
        const { utxos: filterDummyConsumUtxos } = filterUtxosByValue(
          utxos,
          virtualDummyFee + 330 + DUMMY_UTXO_VALUE * 2,
        );
        console.log('filterDummyConsumUtxos', filterDummyConsumUtxos);
        dummyFee =
          (170 * filterDummyConsumUtxos.length + 34 * 3 + 10) * feeRate.value;
        dummyConsumeUtxos = filterDummyConsumUtxos;
        const totalDummyConsumedValue = filterDummyConsumUtxos.reduce(
          (pre, cur) => pre + cur.value,
          0,
        );
        dummyConsumedBalance = totalDummyConsumedValue - dummyFee;
        dummyFee = calcUtxosVirtualGas({
          utxos: dummyConsumeUtxos,
          address,
          network,
          estimateFee: dummyFee,
          outputLenght: 3,
          feeRate: feeRate.value,
        });
        setCalcFeeData('dummyFee', dummyFee);
        setCalcFeeData('dummyConsumedBalance', dummyConsumedBalance);
        setCalcFeeData('dummyConsumeUtxos', dummyConsumeUtxos);
      }
      console.log('dummyFee', dummyFee, dummyConsumeUtxos, dummyConsumeUtxos);
      const filterDummyUtxos = utxos.filter(
        (v) =>
          dummyUtxos.every(
            (v1) => `${v1.txid}:${v1.vout}` !== `${v.txid}:${v.vout}`,
          ) &&
          dummyConsumeUtxos.every(
            (v1) => `${v1.txid}:${v1.vout}` !== `${v.txid}:${v.vout}`,
          ),
      );
      const virtualFee = (170 * 10 + 34 * 7 + 10) * feeRate.value;
      console.log(filterDummyUtxos);
      console.log(virtualFee);
      const { utxos: filterConsumUtxos } = filterUtxosByValue(
        filterDummyUtxos,
        virtualFee + 330 + priceSats + serviceFee - dummyConsumedBalance,
      );
      let realityFee =
        (170 * (filterConsumUtxos.length + 2) +
          34 * (serviceFee === 0 ? 6 : 7) +
          10) *
        feeRate.value;
      realityFee = calcUtxosVirtualGas({
        utxos: dummyConsumeUtxos,
        address,
        network,
        estimateFee: realityFee,
        outputLenght: serviceFee === 0 ? 7 : 8,
        feeRate: feeRate.value,
      });
      console.log('filterConsumUtxos', filterConsumUtxos);
      setCalcFeeData('payFee', realityFee);
      setCalcFeeData('payUtxos', filterConsumUtxos);
    } catch (error: any) {
      console.error('calcFee error', error);
    } finally {
      setLoading(false);
    }
  };

  const networkFee = useMemo(() => {
    console.log('calcFeeData', calcFeeData);
    return calcFeeData.dummyFee + calcFeeData.payFee;
  }, [calcFeeData]);
  const totalPrice = useMemo(() => {
    if (item) {
      return btcToSats(item?.price) + serviceFee + networkFee;
    }
    return 0;
  }, [item, serviceFee, networkFee]);

  const cancelHandler = async () => {
    setLoading(true);
    try {
      const res = await unlockOrder({ address, order_id: item.order_id });
      if (res.code !== 200) {
        notification.error({
          message: t('notification.order_unlock_failed_title'),
          description: res.msg,
        });
        return;
      }
      closeHandler();
    } catch (error: any) {
      notification.error({
        message: t('notification.order_unlock_failed_title'),
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    calcFee();
  }, [utxos, item.order_id]);
  const closeHandler = () => {
    onModalClose?.();
    onClose();
  };
  const createDummyUtxo = async () => {
    const { dummyConsumedBalance, dummyConsumeUtxos, dummyFee } = calcFeeData;
    console.log(dummyFee, dummyConsumedBalance, dummyConsumeUtxos);
    const { balanceUtxo, dummyUtxos } = await buildDummyUtxos({
      utxos: dummyConsumeUtxos,
      feeRate,
    });
    console.log('dummyUtxos', dummyUtxos);
    console.log('balanceUtxo', balanceUtxo);
    if (balanceUtxo && dummyUtxos?.length) {
      const { payUtxos } = calcFeeData;
      payUtxos.push(balanceUtxo);

      setCalcFeeData('dummyUtxos', dummyUtxos);
      setCalcFeeData('payUtxos', payUtxos);
    }
  };
  const confirmHandler = async () => {
    try {
      if (!(address && network)) {
        notification.warning({
          message: t('notification.order_buy_failed_title'),
          description: t('notification.order_buy_failed_description_1'),
        });
        return;
      }
      if (!orderRaw) {
        notification.warning({
          message: t('notification.order_buy_failed_title'),
          description: t('notification.order_buy_failed_description_2'),
        });
        return;
      }
      if (calcFeeData.dummyUtxos.length < 2) {
        notification.warning({
          message: t('notification.order_buy_failed_title'),
          description: t('notification.order_buy_failed_description_3'),
        });
        return;
      }
      setLoading(true);
      console.log('calcFeeData', calcFeeData);
      const buyRaw = await buildBuyOrder({
        orderId: item.order_id,
        orderRaw,
        utxos: calcFeeData.payUtxos,
        dummyUtxos: calcFeeData.dummyUtxos,
        fee: calcFeeData.payFee,
        address,
        network,
        serviceFee: serviceFee,
        feeRate: feeRate.value,
      });
      const res = await buyOrder({
        order_id: item?.order_id,
        address,
        raw: buyRaw,
      });
      if (res.code === 200) {
        notification.success({
          message: t('notification.order_buy_success_title'),
          description: t('notification.order_buy_success_description'),
        });
        onSuccess?.();
        closeHandler();
      } else {
        notification.error({
          message: t('notification.order_buy_failed_title'),
          description: res.msg,
        });
      }
    } catch (error: any) {
      console.log('buy order error', error);
      notification.error({
        message: t('notification.order_buy_failed_title'),
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };
  const paySpendableValue = useMemo(() => {
    return calcFeeData.payUtxos.reduce((pre, cur) => {
      return pre + cur.value;
    }, 0);
  }, [calcFeeData.payUtxos]);
  const insufficientBalance = useMemo(() => {
    return spendableValue < totalPrice || paySpendableValue < totalPrice;
  }, [spendableValue, totalPrice]);
  const buttonDisabled = useMemo(() => {
    return insufficientBalance;
  }, [insufficientBalance]);
  useEffect(() => {
    if (visiable) {
      onOpen();
    } else {
      onClose();
    }
  }, [visiable]);

  return (
    <Modal
      hideCloseButton
      backdrop="blur"
      isDismissable={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onClose={closeHandler}
    >
      <ModalContent>
        <ModalHeader className="">{t('pages.order.modal_title')}</ModalHeader>
        <ModalBody>
          <div className="flex  justify-between">
            <div className="flex-1">
              {item?.assets?.map((v: any) => (
                <div key={v.inscriptionnum}>
                  <div>
                    <div className="font-bold">
                      {t('common.tick')}: {v.ticker}
                    </div>
                    <div className="text-sm">
                      {t('common.asset_num')}: {v.amount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div>
                {t('common.price')}: {item?.price} BTC
              </div>
              <div className="flex items-center">
                {t('common.from')}:
                <Snippet
                  codeString={item?.address}
                  className="bg-transparent"
                  symbol=""
                  size="sm"
                  variant="flat"
                >
                  {hideStr(item?.address, 4)}
                </Snippet>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>{t('common.fee_rate')}</span>
            <div>
              {feeRate.value} <span>sats</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>{t('common.service_fee')}</span>
            <div>
              {serviceFee} <span>sats</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span>{t('common.network_fee')}</span>
            {isLoading ? (
              <Spinner size="sm" />
            ) : (
              <div>
                {networkFee} <span>sats</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span>Dummy Utxo length</span>
            <div>
              {calcFeeData.dummyUtxos.length}
              {calcFeeData.dummyUtxos.length < 2 && (
                <Button
                  size="sm"
                  className="ml-2"
                  onClick={createDummyUtxo}
                  isDisabled={!utxos.length}
                >
                  Split
                </Button>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center font-bold text-lg">
            <span>{t('common.total')}</span>
            <div>
              {satsToBitcoin(totalPrice)} <span>BTC</span>
            </div>
          </div>
          <Chip radius="sm" size="lg" className="w-full max-w-none text-small">
            <div
              className={`flex items-center justify-between ${
                insufficientBalance ? 'text-red-600' : ''
              }`}
            >
              <span>{t('common.available_balance')}</span>
              {isLoading ? (
                <Spinner size="sm" />
              ) : (
                <span>{satsToBitcoin(spendableValue)} BTC</span>
              )}
            </div>
          </Chip>
        </ModalBody>
        <ModalFooter>
          <Button
            color="danger"
            isLoading={loading}
            variant="light"
            onPress={cancelHandler}
          >
            {t('buttons.cancel')}
          </Button>
          <Button
            isLoading={loading}
            isDisabled={buttonDisabled}
            color="primary"
            onPress={confirmHandler}
          >
            {t('buttons.confirm')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
/**{
    "order_id": 10000079,
    "address": "tb1prcc8rp5wn0y9vp434kchl3aag8r8hz699006ufvczwnneuqx0wdsfmvq4y",
    "order_type": 1,
    "currency": "BTC",
    "price": 0.00001,
    "utxo": "1f8863156b8c53aeddcf912cbb02884e0b1379920cd698c8f9080e126ba98593:0",
    "value": 546,
    "assets": [
        {
            "ticker": "123123123123",
            "amount": 546,
            "inscriptionnum": 1742327,
            "unit_price": 0.00018315018315018315,
            "uint_amount": 10000
        }
    ],
    "order_time": 1710844436820
} */
