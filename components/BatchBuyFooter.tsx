import {
  Button,
  Input,
  Slider,
  Popover,
  PopoverContent,
  Checkbox,
  PopoverTrigger,
} from '@nextui-org/react';
import { useBuyStore } from '@/store';
import { Icon } from '@iconify/react';
import { BatchCart } from './BatchCart';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { tryit } from 'radash';
import useSWRMutation from 'swr/mutation';
import { notification } from 'antd';
import { Decimal } from 'decimal.js';
import { useDebounce } from 'react-use';
import {
  buildDummyUtxos,
  DUMMY_UTXO_VALUE,
  filterUtxosByValue,
  btcToSats,
  buildBuyOrder,
  calcBuyOrderFee,
  satsToBitcoin,
  buildBuyThirdOrder,
} from '@/lib';
import {
  getUtxoByValue,
  bulkBuyingThirdOrder,
  bulkBuyOrder,
  clientApi,
  lockBulkOrder,
  unlockBulkOrder,
  unlockOrder,
} from '@/api';
import { useCommonStore } from '@/store';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { Console, log } from 'console';

interface Props {
  list: any[];
  assets_name?: string;
  assets_type?: string;
  selectedSource?: string;
  toBuy?: () => void;
  onSuccess?: () => void;
  onClose?: () => void;
}
export const BatchBuyFooter = ({
  list: assetsList,
  assets_name,
  assets_type,
  selectedSource,
  onSuccess,
  onClose,
}: Props) => {
  let minServiceFee = 1000;
  if (
    process.env.NEXT_PUBLIC_SERVICE_FEE &&
    process.env.NEXT_PUBLIC_IS_FREE == '0'
  ) {
    minServiceFee = Number(process.env.NEXT_PUBLIC_SERVICE_FEE);
  }
  const { chain } = useCommonStore();
  const [selectMaxPrice, setSelectMaxPrice] = useState(false);
  const [maxPurchasePrice, setMaxPurchasePrice] = useState<any>();
  const [raws, setRaws] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const { list, setList, remove: removeBuy } = useBuyStore();
  const [selectSize, setSelectSize] = useState(list.length || 0);
  const { t } = useTranslation();
  const [show, setShow] = useState(true);
  const [removeOrderIds, setRemoveOrderIds] = useState<
    { raw: string; order_id: string }[]
  >([]);
  const [networkFee, setNetworkFee] = useState(0);
  const { feeRate, btcHeight } = useCommonStore((state) => state);
  const { address, network, btcWallet } = useReactWalletStore();

  const lockOrderIds = useMemo(() => {
    return list.map((v) => v.order_id);
  }, [list]);

  const { data, isLoading } = useSWR(
    `getUtxoByValue-${address}-${chain}-${network}`,
    () => clientApi.getOrdxAddressHolders(address, '::', 0, 100),
  );

  const {
    data: lockData,
    isMutating: lockLoading,
    trigger: lockTrigger,
  } = useSWRMutation(
    `getUtxoByValue-${address}-${chain}-${network}-${JSON.stringify(lockOrderIds)}`,
    () => lockBulkOrder({ address, orderIds: lockOrderIds }),
  );
  const orderLength = useMemo(() => list.length || 0, [list]);
  const dummyLength = useMemo(() => orderLength + 1, [orderLength]);

  useEffect(() => {
    if (lockData?.code === 200) {
      setRaws(lockData.data?.filter((v) => !!v.raw) || []);
      const len = lockData.data?.length || 0;
      for (let i = 0; i < lockData.data?.length; i++) {
        const { raw, order_id } = lockData.data[i];
        if (!raw && selectedSource !== 'Magisat') {
          removeBuy(order_id);
        }
      }
    }
  }, [lockData]);

  const canSelectLength = useMemo(() => {
    return Math.min(
      assetsList.filter((i) => i.locked === 0 && i.address !== address).length,
      32,
    );
  }, [assetsList, selectedSource]);

  const utxos = useMemo(
    () =>
      data?.data?.map((v) => {
        const { Outpoint, Value } = v;
        const [txid, vout] = Outpoint.split(':');
        return {
          txid,
          vout: Number(vout),
          value: Value,
          utxo: Outpoint,
        };
      }) || [],
    [data],
  );
  const dummyUtxos = useMemo(
    () => utxos.filter((v) => v.value === DUMMY_UTXO_VALUE),
    [utxos],
  );
  const splitDummyBol = useMemo(
    () => dummyLength > dummyUtxos.length,
    [dummyLength, dummyUtxos],
  );
  const canSpendableUtxos = useMemo(
    () => utxos.filter((v) => v.value !== DUMMY_UTXO_VALUE),
    [utxos],
  );
  const totalBalacne = useMemo(() => {
    return canSpendableUtxos.reduce((a, b) => a + b.value, 0) || 0;
  }, [utxos]);
  const totalPrice = useMemo(
    () =>
      list.reduce((a, b) => {
        const decimalA = new Decimal(a);
        const decimalB = new Decimal(Number(btcToSats(b.price)));
        return decimalA.plus(decimalB).toNumber();
      }, 0) || 0,
    [list],
  );
  const serviceFee = useMemo(() => {
    if (selectedSource === 'Magisat') {
      return 0;
    }
    if (chain !== 'Bitcoin') {
      return 10;
    }
    if (assets_name === 'btc' && assets_type === 'ns' && btcHeight < 863000) {
      return 0;
    }
    const minServiceDecimal = new Decimal(minServiceFee);
    const _s = list.reduce((a, b) => {
      let decimalB = new Decimal(Number(btcToSats(b.price)));
      decimalB = decimalB.mul(new Decimal(0.01)).ceil();

      const totalSercice = a.plus(decimalB);
      return totalSercice;
    }, new Decimal(0));
    return _s.plus(minServiceDecimal).toNumber();
  }, [list, btcHeight, assets_name, assets_type, selectedSource]);
  const insufficientBalanceStatus = useMemo(
    () => totalBalacne > totalPrice + serviceFee,
    [totalBalacne, totalPrice, serviceFee],
  );

  const findDummyUtxos = async () => {
    const spendableDummyUtxos = dummyUtxos?.slice(0, dummyLength) || [];
    const virtualDummyFee = (170 * 10 + 34 * 3 + 10) * feeRate.value;
    const dis = dummyLength - spendableDummyUtxos.length;
    let balanceUtxo: any;
    let spendedUtxos: any = [];
    if (dis > 0) {
      const { utxos: filterDummyConsumUtxos } = filterUtxosByValue(
        utxos,
        virtualDummyFee + 330 + DUMMY_UTXO_VALUE * dis,
      );
      const { dummyUtxos: newDummyUtxos, balanceUtxo: newBalanceUtxo } =
        await buildDummyUtxos({
          utxos: filterDummyConsumUtxos,
          feeRate: feeRate.value,
          num: dis,
        });
      spendedUtxos = filterDummyConsumUtxos;
      balanceUtxo = newBalanceUtxo;
      spendableDummyUtxos.push(...newDummyUtxos);
    }
    return {
      dummyUtxos: spendableDummyUtxos,
      balanceUtxo,
      spendedUtxos,
    };
  };
  const calcFee = async () => {
    console.log("BatchBuyFooter chain/network:", chain,"/", network);
    if (chain === 'SatoshiNet') {
      setNetworkFee(10);
      setCalcLoading(false);
      return;
    }
    if (calcLoading || list.length === 0 || chain !== 'Bitcoin') {
      return;
    }
    if (!insufficientBalanceStatus) {
      setNetworkFee(
        Math.ceil(
          (170 * (list.length + 1) +
            34 * (list.length * 2 + dummyLength + 2) +
            10) *
            feeRate.value,
        ),
      );
      setCalcLoading(false);
      return;
    }
    setCalcLoading(true);
    const newDummyUtxos = dummyUtxos?.slice(0, dummyLength);

    const virtualFee = (172 * 10 + 34 * (3 + dummyLength) + 10) * feeRate.value;
    const { utxos: filterConsumUtxos } = filterUtxosByValue(
      canSpendableUtxos,
      virtualFee +
        330 +
        totalPrice +
        serviceFee +
        DUMMY_UTXO_VALUE * dummyLength,
    );

    const networkFee = await calcBuyOrderFee({
      raws,
      utxos: filterConsumUtxos,
      dummyUtxos: newDummyUtxos,
      serviceFee: serviceFee,
      feeRate: feeRate.value,
      network: network,
    });
    setCalcLoading(false);
    setNetworkFee(networkFee);
  };
  useEffect(() => {
    calcFee();
  }, [
    dummyLength,
    serviceFee,
    dummyUtxos,
    canSpendableUtxos,
    totalPrice,
    feeRate.value,
  ]);
  const previousLockOrderIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (
      lockOrderIds.length > 0 &&
      !arraysEqual(lockOrderIds, previousLockOrderIdsRef.current)
    ) {
      previousLockOrderIdsRef.current = lockOrderIds;
      lockTrigger();
    }
  }, [lockOrderIds, lockTrigger]);

  function arraysEqual(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }
  useEffect(() => {
    setSelectSize(list.length);
  }, [list]);
  useDebounce(
    () => {
      if (removeOrderIds.length) {
        unlockBulkOrder({ address, orderIds: removeOrderIds });
      }
    },
    1000,
    [removeOrderIds],
  );
  useDebounce(
    () => {
      let _list = structuredClone(list);
      const len = _list.length;
      setRemoveOrderIds([]);
      if (selectSize < len) {
        const removeOrder = _list.slice(selectSize, len);
        setRemoveOrderIds(removeOrder.map((v) => v.order_id));
        _list = _list.slice(0, selectSize);
      } else if (selectSize > len) {
        for (let i = 0; i < assetsList.length; i++) {
          const item = assetsList[i];
          if (_list.length >= selectSize) {
            break;
          }
          if (
            item.locked === 0 &&
            item.order_source === selectedSource &&
            item.address !== address &&
            _list.findIndex((v) => v.order_id === item.order_id) === -1
          ) {
            if (selectMaxPrice) {
              if (item.price <= Number(maxPurchasePrice)) {
                _list.push(item);
              }
            } else {
              _list.push(item);
            }
          }
        }
      }
      setList(_list);
    },
    300,
    [selectSize],
  );
  const unlockHandler = async (item) => {
    try {
      const res = await unlockOrder({
        address,
        order_id: item.order_id,
      });
      removeBuy(item.utxo);
    } catch (error: any) {
      notification.error({
        message: t('notification.order_unlock_failed_title'),
        description: error.message,
      });
    }
  };
  const onRemoveItem = async (u: string) => {
    const item = list.find((i) => i.utxo === u);
    if (item) {
      const res = await unlockHandler(item);
    }
  };
  const buyHandler = async () => {
    try {
      if (!utxos.length) {
        notification.error({
          message: t('notification.order_buy_failed_title'),
          description: t('notification.order_buy_failed_description_4'),
        });
        return;
      }
      setLoading(true);
      let buyRaw = '';
      if (chain === 'Bitcoin') {
        const {
          dummyUtxos: newDummyUtxos,
          balanceUtxo,
          spendedUtxos,
        } = await findDummyUtxos();

        const spendableUtxos = canSpendableUtxos.filter((v) => {
          const l = !!spendedUtxos.find(
            (s) => s.txid === v.txid && s.vout === v.vout,
          );
          return !l;
        });
        if (balanceUtxo) {
          spendableUtxos.push(balanceUtxo);
        }
        const virtualFee =
          (170 * 10 + 34 * (3 + dummyLength * 3) + 10) * feeRate.value;
        const { utxos: filterConsumUtxos } = filterUtxosByValue(
          spendableUtxos,
          virtualFee +
            330 +
            totalPrice +
            serviceFee +
            DUMMY_UTXO_VALUE * dummyLength,
        );

        console.log('selectedSource', selectedSource);

        if (selectedSource === 'Magisat') {
          buyRaw = await buildBuyThirdOrder({
            order_ids: list.map((v) => v.order_id),
            fee_rate_tier: 'halfHourFee',
          });
        } else {
          if (raws.length === 0) {
            notification.error({
              message: t('notification.order_buy_failed_title'),
              description: t('notification.order_buy_failed_description_2'),
            });
            setLoading(false);
            return;
          }
          console.log('serviceFee', serviceFee);

          buyRaw = await buildBuyOrder({
            raws,
            utxos: filterConsumUtxos,
            dummyUtxos: newDummyUtxos,
            serviceFee: serviceFee,
            feeRate: feeRate.value,
          });
        }
        console.log('buyRaw', buyRaw);

        if (!buyRaw) {
          notification.error({
            message: t('notification.order_buy_failed_title'),
            description: t('notification.order_buy_failed_description_1'),
          });
          setLoading(false);
          return;
        }
      } else {
        console.log('utxos', utxos);
        const NEXT_PUBLIC_SERVICE_ADDRESS =
          network === 'testnet'
            ? process.env.NEXT_PUBLIC_SERVICE_TESTNET_ADDRESS
            : process.env.NEXT_PUBLIC_SERVICE_ADDRESS;
        console.log(raws);
        const buyUtxoInfos: any[] = [];
        for (let i = 0; i < utxos.length; i++) {
          const { utxo, price } = utxos[i];
          const [error2, utxoInfo] = await tryit(clientApi.getUtxoInfo)(utxo);
          if (error2) {
            throw error2;
          }
          buyUtxoInfos.push({
            ...utxoInfo.data
          });
        }
        const res = await window.sat20.finalizeSellOrder(
          raws[0].raw,
          buyUtxoInfos.map((v) => JSON.stringify(v)),
          address,
          NEXT_PUBLIC_SERVICE_ADDRESS,
          network,
          serviceFee,
          networkFee,
        );
        console.log('finalizeSellOrder res', res);
        
        if (res.code !== 0) {
          console.log('res', res);
        }
        const signedPsbt = await btcWallet?.signPsbt(res.psbt, { chain });
        if (!signedPsbt) {
          throw new Error('signPsbt failed');
        }
        buyRaw = await window.sat20?.extractTxFromPsbt(signedPsbt, chain);
      }
      const order_ids = list.map((v) => v.order_id);
      const res = await bulkBuyOrder({
        address,
        order_ids,
        raw: buyRaw,
      });
      setLoading(false);
      if (res.code === 200) {
        notification.success({
          message: t('notification.order_buy_success_title'),
          description: t('notification.order_buy_success_description'),
        });
        onSuccess?.();
      } else {
        notification.error({
          message: t('notification.order_buy_failed_title'),
          description: res.msg,
        });
      }
    } catch (error: any) {
      setLoading(false);
      console.log('buy order error', error);
      notification.error({
        message: t('notification.order_buy_failed_title'),
        description: error,
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {show && list.length > 0 && (
        <BatchCart
          splitDummyBol={splitDummyBol}
          networkFee={networkFee}
          serviceFee={serviceFee}
          calcLoading={calcLoading}
          onRemove={onRemoveItem}
        />
      )}
      <div className="batch-sell-footer fixed bottom-0 w-full h-28 sm:h-20 left-0 dark:bg-slate-900 bg-gray-100 z-[99]">
        <div className="flex gap-2 justify-center sm:justify-between items-center flex-col sm:flex-row w-full h-full px-4">
          <div className="sm:flex-1 flex items-center flex-wrap gap-4">
            <div className="flex items-center gap-4 w-60">
              <Input
                type="number"
                className="w-20"
                value={selectSize.toString()}
                onValueChange={(e) => setSelectSize(Number(e))}
              />
              <Slider
                size="sm"
                step={1}
                minValue={0}
                maxValue={canSelectLength}
                value={[selectSize]}
                className="flex-1"
                onChange={(e) => {
                  setSelectSize(isNaN(e[0]) ? 0 : e[0]);
                }}
              />
              <Popover placement="top">
                <PopoverTrigger>
                  <Button
                    variant="light"
                    isIconOnly
                    color="primary"
                    aria-label="Like"
                  >
                    <Icon icon="solar:settings-bold" className="text-xl" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="flex items-center gap-6 py-2 px-1">
                    <Checkbox
                      size="sm"
                      className="text-xs"
                      isSelected={selectMaxPrice}
                      onValueChange={(e) => setSelectMaxPrice(e)}
                    >
                      最高扫货价格
                    </Checkbox>
                    <Input
                      classNames={{
                        input: 'text-right',
                      }}
                      size="sm"
                      isDisabled={!selectMaxPrice}
                      type="number"
                      className="w-28"
                      value={maxPurchasePrice}
                      onValueChange={(e) => {
                        console.log(e);
                        setMaxPurchasePrice(e);
                      }}
                      endContent="BTC"
                    ></Input>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Icon icon="cryptocurrency-color:btc" className="" />
                {satsToBitcoin(totalPrice)} BTC
              </div>
              <div
                className={`text-xs text-right  ${!insufficientBalanceStatus ? 'text-red-500' : 'text-gray-400'}`}
              >
                {t('common.balance')}:&nbsp;&nbsp;{satsToBitcoin(totalBalacne)}{' '}
                BTC
              </div>
            </div>
            <Button
              className="btn btn-primary"
              color="primary"
              isDisabled={!insufficientBalanceStatus || !list.length}
              isLoading={loading || isLoading}
              onClick={buyHandler}
            >
              {t('common.buy')}
            </Button>
            <Button isIconOnly color="danger" onClick={() => setShow(!show)}>
              <Icon icon="mdi:cart" className="text-white text-2xl" />
            </Button>
            <Button isIconOnly onClick={onClose}>
              <Icon icon="mdi:close" className="text-white text-2xl" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
