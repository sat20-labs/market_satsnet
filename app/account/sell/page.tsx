'use client';

import {
  Card,
  CardBody,
  CardFooter,
  Button,
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
  Spinner,
  Snippet,
} from '@nextui-org/react';
import { notification } from 'antd';
import { useSellStore } from '@/store';
import { use, useEffect, useMemo, useState } from 'react';
import {
  satsToBitcoin,
  splitBatchSignedPsbt,
  buildBatchSellOrder,
  hideStr,
  btcToSats,
} from '@/lib/utils';
import { Decimal } from 'decimal.js';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { getAssetsSummary, submitBatchOrders } from '@/api';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useDebounce } from 'react-use';
import { useCommonStore } from '@/store';

interface Asset {
  assets_name: string;
  assets_type: string;
  amount: number;
}

export default function SellPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    assets_name,
    assets_type,
    list,
    reset,
    unit,
    amountUnit,
    changeAmountUnit,
    changeUnit,
    changePrice,
  } = useSellStore((state) => state);
  console.log('app.account.sell.page: assets_name: ', assets_name);
  console.log('app.account.sell.page: assets_type: ', assets_type);
  console.log('app.account.sell.page: list: ', list);
  const [globalInputActive, setGlobalInputActive] = useState(false);
  const [globalPrice, setGlobalPrice] = useState<string | undefined>();
  console.log('app.account.sell.page: list: ', list);
  const { network, address, btcWallet } = useReactWalletStore((state) => state);
  const { chain } = useCommonStore();
  const { data, isLoading: isSummaryLoading } = useSWR(
    `getAssetsSummary-${assets_name}-${assets_type}-${chain}-${network}`,
    () => {
      console.log('app.account.sell.page: ticker: ', assets_name);
      let ret: Promise<any>;
      try {
        ret = getAssetsSummary({ assets_name, assets_type });
        return ret;
      } catch (error) {
        console.log('app.account.sell.page: getAssetsSummary err: ', error);
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const summary = useMemo(() => data?.data?.summary || {}, [data]);

  useEffect(() => {
    if (summary.lowest_price) {
      console.log('Effect running: Applying lowest price based on summary/unit change');
      for (const item of list) {
        if (unit === 'btc') {
          changePrice(
            item.utxo,
            satsToBitcoin(Number.parseInt(summary.lowest_price)).toString(),
          );
        } else {
          changePrice(item.utxo, Number.parseInt(summary.lowest_price).toString());
        }
      }
    }
  }, [summary, unit, list, changePrice]);

  useDebounce(
    () => {
      if (globalInputActive && globalPrice !== undefined) {
        console.log('Debounced: Applying global price', globalPrice);
        const priceStr = globalPrice ? globalPrice.toString() : '0';
        for (let i = 0; i < list.length; i++) {
          changePrice(list[i].utxo, priceStr);
        }
      }
    },
    300,
    [globalInputActive, globalPrice, list, changePrice],
  );

  const listItems = async () => {
    for (let i = 0; i < list.length; i++) {
      const { price, assets_list } = list[i];
      const _p = amountUnit === 'btc' ? btcToSats(price) : price;
      console.log('page chain/network:', chain,"/", network);
      if (chain === 'Bitcoin' && Number(_p) < 330) {        
        notification.error({
          message: t('notification.list_failed_title'),
          description: t('notification.list_failed_min_amount'),
        });
        return;
      }
    }
    setLoading(true);
    try {
      const batchOrderPsbt = await buildBatchSellOrder({
        inscriptionUtxos: list,
        address,
        network,
        unit: amountUnit,
        chain,
      });
      console.log('Batch Order PSBT', batchOrderPsbt);
      const signedPsbts = await btcWallet?.signPsbt(batchOrderPsbt, { chain });
      console.log('Batch Order raw', signedPsbts);
      if (signedPsbts) {
        const psbts = await splitBatchSignedPsbt(signedPsbts, network, chain);
        const orders = list.map((v, j) => {
          const { assets_list } = v;
          let asset: Asset | undefined;
          if (assets_type === 'ticker') {
            asset = assets_list?.find((a) => a.assets_name === assets_name);
          } else {
            asset = assets_list?.find((a) => a.assets_type === assets_type);
          }
          if (!asset) {
            console.error(`Asset not found for item ${j} with assets_name/type: ${assets_name}/${assets_type}`);
            return null;
          }
          return {
            assets_name: asset.assets_name,
            assets_type: asset.assets_type,
            raw: psbts[j],
          };
        });

        const validOrders = orders.filter((order): order is typeof order => order !== null);

        if (validOrders.length > 0) {
          const res = await submitBatchOrders({
            address,
            orders: validOrders,
          });
          if (res.code === 200) {
            notification.success({
              message: t('notification.list_success_title'),
              description: t('notification.list_success_description'),
            });
            reset();
            router.back();
          } else {
            notification.error({
              message: t('notification.list_failed_title'),
              description: res.msg,
            });
          }
        } else {
          notification.error({
            message: t('notification.list_failed_title'),
            description: "No valid assets found to list.",
          });
        }
      }
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      console.error('List failed', error);
      notification.error({
        message: t('notification.list_failed_title'),
        description: error.message || 'Unknown error occurred',
      });
    }
  };
  const inputBlur = (utxo: string) => {
    // const currentUtxo = list.find((v) => v.utxo === utxo);
    // if (
    //   currentUtxo &&
    //   Number(currentUtxo.price) < 0.00000546 &&
    //   unit === 'btc'
    // ) {
    //   changePrice(utxo, '0.00000546');
    // } else if (
    //   currentUtxo &&
    //   Number(currentUtxo.price) < 546 &&
    //   unit === 'sats'
    // ) {
    //   changePrice(utxo, '546');
    // }
  };
  const onPriceUnitChange = (newUnit: 'btc' | 'sats') => {
    if (newUnit === unit || !newUnit) {
      return;
    }
    console.log('Input price unit changing to:', newUnit);
    changeUnit(newUnit);
  };
  const onAmountUnitChange = (newAmountUnit: 'btc' | 'sats') => {
    console.log('Amount display unit changing to:', newAmountUnit);
    if (newAmountUnit === amountUnit || !newAmountUnit) {
      return;
    }
    changeAmountUnit(newAmountUnit);
  };
  const totalPrice = useMemo(
    () =>
      list.reduce((a, b) => {
        const price = Number(b.price) || 0;
        const decimalA = new Decimal(a);
        const decimalB = new Decimal(price);
        return decimalA.plus(decimalB).toNumber();
      }, 0) || 0,
    [list],
  );
  return (
    <div className="py-2">
      <div className="md:flex justify-between gap-4">
        <div className="flex-1 mb-2">
          <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
            {isSummaryLoading ? (
              <Spinner />
            ) : (
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-4">
                  {/* <span>{t('common.tick')}:</span>
                <span>{ticker}</span> */}
                </div>
                <div className="flex items-center gap-4">
                  <span>{t('common.lowest_price')}:</span>
                  <span>{summary.lowest_price || 'N/A'} Sats</span>
                </div>
              </div>
            )}
            <div className="w-full flex items-center gap-1 sm:w-auto md:w-80">
              <Input
                type="number"
                placeholder={t('sell_page.global_unit_price_placeholder') || "Global Unit Price"}
                aria-label="Global Unit Price"
                value={globalPrice ?? ''}
                onValueChange={(e) => {
                  setGlobalInputActive(true);
                  setGlobalPrice(e);
                }}
                onBlur={() => {
                   // Decide if global input should remain 'active' after blur
                   // setGlobalInputActive(false);
                }}
              />
              <Select
                size="sm"
                color="primary"
                aria-label="Select Input Price Unit"
                isDisabled={isSummaryLoading}
                selectedKeys={[unit]}
                onChange={(e) => onPriceUnitChange(e.target.value as any)}
                className="w-28"
              >
                <SelectItem key="btc" value="btc">
                  BTC
                </SelectItem>
                <SelectItem key="sats" value="sats">
                  sats
                </SelectItem>
              </Select>
            </div>
          </div>

          <Table aria-label="Items to Sell Table">
            <TableHeader>
              <TableColumn className="text-sm md:text-base">
                {t('common.item')}
              </TableColumn>
              <TableColumn className="text-sm md:text-base ">
                <div className="flex items-center gap-2">
                  {t('common.sell_unit_price')}
                </div>
              </TableColumn>
              <TableColumn className="text-sm md:text-base">
                <div className="flex items-center gap-2">
                  {t('common.amount')}
                  <Select
                    size="sm"
                    color="primary"
                    aria-label="Select Total Amount Unit"
                    isDisabled={isSummaryLoading}
                    selectedKeys={[amountUnit]}
                    onChange={(e) => onAmountUnitChange(e.target.value as any)}
                    className="w-28"
                  >
                    <SelectItem key="btc" value="btc">
                      BTC
                    </SelectItem>
                    <SelectItem key="sats" value="sats">
                      sats
                    </SelectItem>
                  </Select>
                </div>
              </TableColumn>
            </TableHeader>
            <TableBody>
              {list.map((item, i) => (
                <TableRow key={item.utxo}>
                  <TableCell>
                    <div className="mb-2 flex flex-wrap items-center gap-4">
                      {item.assets_list?.map((v) => (
                        <div key={v.assets_name || v.inscription_id}>
                          <div>
                            <span className="text-gray-400">
                              {v.assets_type === 'ns' ? 'Name' : 'Ticker'}：
                            </span>
                            <span>{v.assets_name}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">
                              {t('common.asset_num')}：
                            </span>
                            <span>{v.amount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <span className="text-gray-400 mr-4">Sats:</span>
                      {item.value}
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-400">Utxo：</span>
                      <Snippet
                        codeString={item?.utxo}
                        className="bg-transparent text-gray-500"
                        symbol=""
                        size="lg"
                        variant="flat"
                      >
                        <span className="font-thin">
                          {hideStr(item?.utxo, 6)}
                        </span>
                      </Snippet>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      aria-label={`Unit price for ${item.utxo}`}
                      placeholder="0.00"
                      isDisabled={isSummaryLoading}
                      value={item.unit_price?.toString() ?? ''}
                      onValueChange={(e) => {
                        setGlobalInputActive(false);
                        changePrice(item.utxo, e);
                      }}
                      onBlur={() => inputBlur(item.utxo)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {item.price != null ? new Decimal(item.price).toString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Card className="sm:w-60 shrink-0">
          <CardBody>
            <div>
              {t('common.total')}: {list.length}
            </div>
            <div>
              {t('common.your_profits')}: {totalPrice.toString()}{' '}
              {amountUnit === 'btc' ? 'BTC' : 'Sats'}
            </div>
          </CardBody>
          <CardFooter>
            <Button
              isDisabled={totalPrice <= 0 || list.length === 0}
              color="primary"
              isLoading={loading}
              className="w-full"
              onClick={listItems}
            >
              {t('buttons.list_sale')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
