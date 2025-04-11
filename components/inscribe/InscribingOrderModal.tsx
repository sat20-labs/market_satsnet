import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Card,
  CardBody,
  CardHeader,
  Button,
  Divider,
} from '@nextui-org/react';
import { Steps, Tag, Progress, notification } from 'antd';
import { InscribeOrderItem } from './InscribeOrderItem';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { sleep, sum } from 'radash';
import { filterUtxosByValue, calcNetworkFee } from '@/lib/wallet';
import { addMintRecord } from '@/api';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import {
  useOrderStore,
  OrderItemType,
  useCommonStore,
  useUtxoStore,
} from '@/store';
import {
  inscribe,
  generateSendBtcPsbt,
  sendBtcPsbt,
  returnInscribe,
} from '@/lib/inscribe';
import { mintRune, etchRune } from '@/lib/inscribe/rune';
import { deleteMintRecord } from '@/api';
import { generateMempoolUrl } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { tryit } from 'radash';
import { hideStr } from '@/lib/utils';
import { FeeShow } from './FeeShow';
import { useTranslation } from 'react-i18next';

interface InscribingOrderMdaolProps {
  show: boolean;
  orderId: string;
  onFinished?: (id: string) => void;
  onClose?: () => void;
}
export const InscribingOrderModal = ({
  show,
  orderId,
  onClose,
  onFinished,
}: InscribingOrderMdaolProps) => {
  const { t } = useTranslation();
  const {
    list: utxoList,
    getUnspendUtxos,
    add: addUtxo,
    removeUtxos,
  } = useUtxoStore();
  const [sendFee, setSendFee] = useState<number>();
  const [retryCount, setRetryCount] = useState(0);
  const [psbt, setPsbt] = useState<any>();
  const { feeRate } = useCommonStore();
  const {
    address: currentAccount,
    publicKey,
    network,
    connected,
  } = useReactWalletStore();
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const { changeStatus, setCommitTx, addSucccessTxid, findOrder } =
    useOrderStore((state) => state);
  const steps = [
    {
      title: (
        <div className="dark:text-white">
          {t('pages.inscribe.pay.step_one.name')}
        </div>
      ),
    },
    {
      title: (
        <div className="dark:text-white">
          {t('pages.inscribe.pay.step_three.name')}
        </div>
      ),
    },
    {
      title: (
        <div className="dark:text-white">
          {t('pages.inscribe.pay.step_four.name')}
        </div>
      ),
    },
  ];
  const vertualGasFee = useMemo(() => {
    const fee = (148 * 10 + 34 * 3 + 10) * feeRate.value;
    return fee;
  }, [feeRate]);
  const order = useMemo(() => {
    return findOrder(orderId) as OrderItemType;
  }, [orderId]);
  const balacne = useMemo(() => {
    const unspendUtxos = getUnspendUtxos();
    if (!currentAccount || unspendUtxos?.length === 0) {
      return 0;
    }
    return sum(unspendUtxos, (utxo: any) => utxo.value);
  }, [utxoList, currentAccount]);
  const canCalcPsbt = useMemo(() => {
    const unspendUtxos = getUnspendUtxos();

    const orderUtxos = order?.metadata?.utxos || [];
    const orderAmount = orderUtxos.reduce(
      (acc, cur) => acc + cur?.value || 0,
      0,
    );
    const filterUnspendUtxos = unspendUtxos.filter((v) => {
      return (
        orderUtxos.find(
          (utxo) => utxo.txid === v.txid && utxo.vout === v.vout,
        ) == undefined
      );
    });
    const unspendAmount = sum(filterUnspendUtxos, (utxo: any) => utxo.value);
    const serviceFee = order?.fee?.discountServiceFee || 0;
    const totalFee = order?.fee?.totalFee || 0;
    const totalInscriptionSize = order?.fee?.totalInscriptionSize || 0;
    if (order?.metadata?.isSpecial) {
      return (
        unspendAmount >
        totalFee + serviceFee + vertualGasFee - totalInscriptionSize
      );
    } else {
      return (
        unspendAmount + orderAmount > totalFee + serviceFee + vertualGasFee
      );
    }
  }, [vertualGasFee, utxoList, order?.metadata, order.fee]);

  const psbtData = useMemo(() => {
    if (!canCalcPsbt || !order || !connected) {
      return null;
    }
    const tipAddress =
      network === 'testnet'
        ? process.env.NEXT_PUBLIC_SERVICE_TESTNET_ADDRESS
        : process.env.NEXT_PUBLIC_SERVICE_ADDRESS;
    const unspendUtxos = getUnspendUtxos();
    const orderUtxos = order?.metadata?.utxos || [];
    const orderAmount = orderUtxos.reduce(
      (acc, cur) => acc + cur?.value || 0,
      0,
    );
    const filterUnspendUtxos = unspendUtxos.filter((v) => {
      return (
        orderUtxos.find(
          (utxo) => utxo.txid === v.txid && utxo.vout === v.vout,
        ) == undefined
      );
    });
    const serviceFee = order?.fee?.discountServiceFee || 0;
    const totalFee = order?.fee?.totalFee || 0;
    const totalInscriptionSize = order?.fee?.totalInscriptionSize || 0;
    const isSpecial = order?.metadata?.isSpecial || false;
    const specialOffsetAmount = order?.metadata?.specialOffsetAmount || 0;
    const inputUntxos: any[] = orderUtxos.map((v) => ({
      txid: v.txid,
      vout: v.vout,
      value: v.value,
    }));
    const totalNetworkFee = vertualGasFee + totalFee - totalInscriptionSize;

    const totalSpendAmount = totalFee + serviceFee + vertualGasFee;

    let pickAmount = totalSpendAmount;
    const disAcmount = orderAmount - totalSpendAmount;
    if (isSpecial) {
      pickAmount = serviceFee + totalNetworkFee;
    } else if (orderAmount > totalSpendAmount)
      if (disAcmount < 0) {
        pickAmount = totalSpendAmount;
      }
    pickAmount = Math.max(pickAmount, 1000);
    const outputs: any[] = [];
    inputUntxos.push(...filterUnspendUtxos);
    if (specialOffsetAmount > 0 && isSpecial) {
      outputs.push({
        address: currentAccount,
        value: specialOffsetAmount,
      });
    }
    console.log('order', order);

    if (order.type === 'rune' && order.metadata.action === 'mint') {
      outputs.push({
        script: Buffer.from(order.opReturnScript, 'hex'),
        value: 0,
      });
      outputs.push({
        address: order.toAddress[0],
        value: 330,
      });
      if (order.files.length > 1) {
        outputs.push({
          address: order?.runeMetadata?.address,
          value: totalFee - 330,
        });
      }
    } else if (order.type === 'rune' && order.metadata.action === 'etch') {
      outputs.push({
        address: order?.inscription.address,
        value: totalFee,
      });
    } else {
      outputs.push({
        address: order?.inscription.inscriptionAddress,
        value: totalFee,
      });
    }

    if (isSpecial && orderAmount - totalFee > 330) {
      outputs.push({
        address: currentAccount,
        value: orderAmount - totalFee,
      });
    }
    if (serviceFee && tipAddress) {
      outputs.push({
        value: serviceFee,
        address: tipAddress,
      });
    }
    return [inputUntxos, outputs];
  }, [
    canCalcPsbt,
    vertualGasFee,
    utxoList,
    order?.metadata,
    order.fee,
    order.toAddress,
    currentAccount,
    order.type,
    order.files,
    order.runeMetadata,
    order.opReturnScript,
  ]);
  const caclPsbtAndFee = async () => {
    if (psbtData?.[0]?.length && psbtData?.[1]?.length) {
      setLoading(true);
      console.log('psbtData', psbtData);
      const params = {
        address: currentAccount,
        publicKey,
        network,
        utxos: psbtData[0],
        outputs: psbtData[1],
        feeRate: feeRate.value,
        suitable: true,
      };
      console.log('params', params);

      const [psbtError, psbt] = await tryit(generateSendBtcPsbt)(params);
      console.log('psbt', psbt);

      const [feeError, fee] = await tryit(calcNetworkFee)(params);
      console.error(feeError);

      console.log('fee', fee);
      setPsbt(psbt);
      setSendFee(fee);
      setLoading(false);
    }
  };
  useEffect(() => {
    caclPsbtAndFee();
  }, [psbtData]);

  const totalFee = useMemo(() => {
    if (!order) {
      return 0;
    }
    const { fee } = order;
    return fee.totalFee + fee.discountServiceFee + (sendFee ?? vertualGasFee);
  }, [order?.fee, sendFee]);

  const totalNetworkFee = useMemo(() => {
    if (!order) {
      return 0;
    }
    const { fee } = order;
    return fee.networkFee + (sendFee ?? vertualGasFee);
  }, [order?.fee, sendFee]);

  const payOrder = async () => {
    if (!order) {
      return;
    }
    setLoading(true);

    try {
      const { fee, metadata } = order;
      let txid;
      if (!psbt) {
        return;
      }
      const spendUtxos = psbtData?.[0]?.slice(0, psbt.txInputs.length);
      console.log('psbt', psbt);

      console.log('spendUtxos', spendUtxos);
      txid = await sendBtcPsbt(psbt, currentAccount);
      let vout = 0;
      if (metadata?.specialOffsetAmount > 0) {
        vout = 1;
      } else if (order.type === 'rune' && order.metadata.action === 'mint') {
        vout = 2;
      }
      const commitTx = {
        txid,
        vout,
        amount: fee.totalFee,
      };
      if (spendUtxos?.length) {
        removeUtxos(spendUtxos);
        console.log(utxoList);
      }
      if (
        order.type === 'rune' &&
        order.metadata.action === 'mint' &&
        order.files.length === 1
      ) {
        notification.success({
          message: 'Success',
          description: 'Iweinscribe Success',
        });
        order.toAddress.forEach((address) => addSucccessTxid(orderId, txid));
        await changeStatus(orderId, 'inscribe_success');
        setLoading(false);
        setActiveStep(2);
        onFinished?.(`${txid}i0`);
        return;
      }
      setCommitTx(orderId, commitTx);
      await changeStatus(orderId, 'paid');
      setActiveStep(1);
      await tryit(addMintRecord)({
        address: currentAccount,
        txid,
        record_data: JSON.stringify({
          ...order,
          commitTx,
        }),
      });
      setLoading(false);
      if (order.type !== 'rune' && order.metadata.action !== 'etch') {
        setTimeout(() => {
          inscribeHandler();
        }, 0);
      }
    } catch (error: any) {
      setLoading(false);
      console.error(error);
      notification.error({
        message: error.message || JSON.stringify(error),
      });
    }
  };
  // console.log(order);

  const returnInscirbe = async () => {
    if (!(order && order.commitTx)) {
      return;
    }
    try {
      setLoading(true);
      console.log('order', order);
      const { commitTx, fee } = order;
      const commitTxid = (commitTx.txid as any)?.data || commitTx.txid;
      await sleep(3000);
      // await ordx.pollGetTxStatus(commitTxid, order.network);
      console.log('feeNetwork', fee);
      const txid = await returnInscribe({
        secret: order.secret,
        network: order.network as any,
        inscription: order.inscription,
        files: order.files,
        metadata: order.metadata,
        txid: commitTxid,
        networkFee: fee.networkFee,
        feeRate: order.feeRate,
        vout: commitTx.vout,
        amount: commitTx.amount,
        fromAddress: currentAccount,
      });
      notification.success({
        message: 'Success',
        description: 'return success',
      });
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      notification.error({
        message: 'error',
        description: error.message || 'error',
      });
      console.error(error);
    }
  };
  const inscribeButtonHandler = async () => {
    await inscribeHandler(true);
  };
  const inscribeHandler = async (btnStatus = false) => {
    if (!(order && order.commitTx)) {
      return;
    }
    try {
      setLoading(true);
      console.log('order', order);
      const { commitTx, fee, oneUtxo, tight } = order;
      const commitTxid = (commitTx.txid as any)?.data || commitTx.txid;
      await sleep(10000);
      let txid;
      if (order.type === 'rune' && order.metadata.action === 'mint') {
        txid = await mintRune({
          secret: order.wifPrivateKey,
          network: order.network,
          opReturnScript: order.opReturnScript,
          runeMetadata: order.runeMetadata,
          files: order.files,
          toAddress: order.toAddress[0],
          feeRate: order.feeRate,
          utxo: {
            txid: commitTx.txid,
            vout: commitTx.vout,
            value: commitTx.amount - 330,
          },
        });
      } else if (order.type === 'rune' && order.metadata.action === 'etch') {
        txid = await etchRune({
          secret: order.wifPrivateKey,
          network: order.network,
          opReturnScript: order.opReturnScript,
          files: order.files,
          inscription: order.inscription,
          toAddress: order.toAddress[0],
          feeRate: order.feeRate,
          utxo: {
            txid: commitTx.txid,
            vout: commitTx.vout,
            value: commitTx.amount,
          },
        });
      } else {
        txid = await inscribe({
          secret: order.secret,
          oneUtxo,
          tight,
          network: order.network as any,
          inscription: order.inscription,
          files: order.files,
          metadata: order.metadata,
          txid: commitTxid,
          vout: commitTx.vout,
          amount: commitTx.amount,
          toAddresses: order.toAddress,
        });
      }
      try {
        txid = JSON.parse(txid);
      } catch (error) {}
      order.toAddress.forEach((address) => addSucccessTxid(orderId, txid));
      //addSucccessTxid(orderId, txid);

      notification.success({
        message: 'Success',
        description: 'Inscribe Success',
      });
      await changeStatus(orderId, 'inscribe_success');
      await tryit(deleteMintRecord)({
        address: currentAccount,
        txid: commitTxid,
      });
      setLoading(false);
      setActiveStep(2);
      onFinished?.(`${txid}i0`);
    } catch (error: any) {
      console.error(error);
      if (btnStatus) {
        setRetryCount(retryCount + 1);
      }
      setLoading(false);
      await changeStatus(orderId, 'inscribe_fail');
      notification.error({
        message: 'Error',
        description: error.message || 'error',
      });
    }
  };
  const checkStatus = () => {
    if (order.status === 'paid' || order.status === 'inscribe_fail') {
      setActiveStep(1);
    }
    if (order.status === 'inscribe_success') {
      setActiveStep(2);
    }
  };

  const fundingAddressHref = (address?: string) => {
    if (!address || !order.network) {
      return '';
    }
    return generateMempoolUrl({
      network: order.network,
      path: `address/${address}`,
    });
  };
  useEffect(() => {
    const onBeforeunload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    if (loading) {
      window.addEventListener('beforeunload', onBeforeunload);
    } else {
      window.removeEventListener('beforeunload', onBeforeunload);
    }

    return () => {
      window.removeEventListener('beforeunload', onBeforeunload);
    };
  }, [loading]);
  useEffect(() => {
    checkStatus();
  }, []);
  const closeHandler = () => {
    if (!loading) {
      onClose?.();
    }
  };
  return (
    <Modal
      isDismissable={false}
      size="3xl"
      isOpen={show}
      classNames={{
        base: 'max-h-screen overflow-y-auto my-0 sm:my-0',
      }}
      onClose={closeHandler}
    >
      <ModalContent>
        <ModalHeader className="flex items-center">
          <span className="mr-2">Inscribing Order</span>
          <Tag color="error">{order.network}</Tag>
        </ModalHeader>
        <ModalBody>
          <div className="mb-4">
            <Steps current={activeStep} items={steps} />
          </div>
          <div>
            {activeStep === 0 && order.status !== 'timeout' && (
              <div>
                <div className="text-center mb-2 text-red-600">
                  {!canCalcPsbt && `${t('notification.insufficient_balance')}`}
                </div>
                <div className="text-center mb-4">
                  {t('common.balance')}: {balacne} Sats
                </div>
                <div className="flex justify-center">
                  <WalletConnectBus>
                    <Button
                      color="primary"
                      isLoading={loading}
                      disabled={!canCalcPsbt}
                      onClick={payOrder}
                    >
                      {t('buttons.pay_wallet')}
                    </Button>
                  </WalletConnectBus>
                </div>
              </div>
            )}
            {/* step two */}
            {activeStep === 1 && (
              <div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {t('pages.inscribe.pay.step_three.name')}
                  </div>
                  <div className="text-sm text-gray-400">
                    {t('pages.inscribe.pay.step_three.des')}
                  </div>
                  <div className="text-sm text-red-400">
                    {t('pages.inscribe.pay.step_three.hint')}
                  </div>
                </div>
                <div className="flex justify-center mt-4 gap-4">
                  <Button
                    color="primary"
                    isLoading={loading}
                    onClick={inscribeButtonHandler}
                  >
                    {t('buttons.inscribe')}
                  </Button>
                  {retryCount > 10 && (
                    <Button
                      color="danger"
                      isLoading={loading}
                      onClick={returnInscirbe}
                    >
                      返回余额
                    </Button>
                  )}
                </div>
                <div className="text-amber-400 text-base text-center">
                  {t('pages.inscribe.order.continue')}
                </div>
              </div>
            )}
            {activeStep === 2 && (
              <div>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold">
                    {t('pages.inscribe.pay.step_four.name')}
                  </div>
                  <div className="text-sm text-gray-400">
                    {t('pages.inscribe.pay.step_four.des')}
                  </div>
                </div>
                <div className="max-h-[20rem] overflow-y-auto">
                  <div className="flex justify-between mb-4">
                    <div>{t('pages.inscribe.pay.step_four.genesis_tx')}</div>
                    <a
                      className="text-blue-500 underline"
                      href={generateMempoolUrl({
                        network: order.network,
                        path: `tx/${order.txid}`,
                      })}
                      target="_blank"
                    >
                      {hideStr(order.txid, 10)}
                    </a>
                  </div>
                </div>
                <div className="flex justify-center mt-4">
                  <Button
                    color="primary"
                    isLoading={loading}
                    size="lg"
                    onClick={closeHandler}
                  >
                    {t('buttons.close')}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <FeeShow
            feeRate={feeRate.value}
            totalInscriptionSize={order.fee.totalInscriptionSize}
            serviceFee={order.fee.serviceFee}
            discount={order?.discount}
            discountServiceFee={order.fee.discountServiceFee}
            // filesLength={order.inscriptions.length}
            totalFee={totalFee}
            networkFee={totalNetworkFee}
          />

          <>
            <Divider />
            <Card>
              <CardBody>
                <CardHeader>Funding Account</CardHeader>
                <div className="flex justify-between">
                  <div>{t('common.address')}</div>
                  <a
                    className="text-blue-500 underline ml-4"
                    href={fundingAddressHref(
                      order.inscription?.inscriptionAddress,
                    )}
                    target="_blank"
                  >
                    {hideStr(order.inscription?.inscriptionAddress, 10)}
                  </a>
                </div>
              </CardBody>
            </Card>
          </>
          <Divider />
          <div className="max-h-[20rem] overflow-y-auto">
            <div className="mb-2 flex flex-col gap-2">
              {order.files?.map((item, index) => (
                <InscribeOrderItem
                  key={index}
                  label={index + 1}
                  txid={order.txid}
                  status={item?.status}
                  value={item.show}
                  offset={item.offset}
                  address={
                    order.toAddress?.length > 1
                      ? order.toAddress[index]
                      : order.toAddress[0]
                  }
                />
              ))}
            </div>
          </div>
          {order.createAt && (
            <div className="text-right text-sm text-gray-400">
              {t('pages.inscribe.pay.created_text')}{' '}
              {new Date(order.createAt).toLocaleString('af')}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
