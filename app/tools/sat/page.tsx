'use client';

import {
  addOrderTask,
  getLastOrderTaskByParameters,
  getSatsByAddress,
  getUtxoByValue,
} from '@/api';
import { buildTransaction, calcNetworkFee } from '@/lib';
import { useCommonStore } from '@/store';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Switch,
  Table,
  TableBody,
  TableColumn,
  TableHeader,
  Image,
} from '@nextui-org/react';
import { notification } from 'antd';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useList, useMap } from 'react-use';

export default function HuntSatTool() {
  const { t, i18n } = useTranslation();
  const params = useSearchParams();
  const txid = params.get('txid') as string;

  const [loading, setLoading] = useState(false);
  const { feeRate } = useCommonStore((state) => state);
  const {
    address: currentAccount,
    network,
    publicKey,
  } = useReactWalletStore((state) => state);
  const [utxoList, { set: setUtxoList }] = useList<any>([]);
  const [address, setAddress] = useState('');
  const [searchSatList, { set: setSearchSatList }] = useMap<any>({
    items: [],
  });
  const [selectGlobal, setSelectGlobal] = useState(false);
  const serviceFee = 100000; // 100,000sats
  const tipAddress =
    network === 'testnet'
      ? process.env.NEXT_PUBLIC_SERVICE_TESTNET_ADDRESS
      : process.env.NEXT_PUBLIC_SERVICE_ADDRESS;

  const setSat = (itemId: number, sat: string) => {
    searchSatList.items[itemId - 1].sat = sat;
    setSearchSatList('items', searchSatList.items);
  };

  const addSat = () => {
    const newId = searchSatList.items.length + 1;
    const newItem = {
      id: newId,
      sat: '',
    };

    setSearchSatList('items', [...searchSatList.items, newItem]);
  };

  const removeSat = (itemId: number) => {
    if (searchSatList.items.length > 1) {
      const tmpItems = searchSatList.items.filter((item) => item.id !== itemId);
      tmpItems.forEach((item, index) => {
        item.id = index + 1;
      });
      setSearchSatList('items', tmpItems);
    }
  };

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      doSearch();
    }
  }

  const doSearch = async () => {
    if (selectGlobal) {
      doSearchInGlobal();
    } else {
      doSearchByAddress();
    }
  };

  const doSearchInGlobal = async () => {
    setLoading(true);
    const type = 'search_rarity_sats';
    try {
      const task = await getOrderTaskBySat();
      if (task && task.txid !== '') {
        // 任务状态 待处理:0 处理中:1 成功:2 失败: -1
        if (task.status === 0 || task.status === 1) {
          setLoading(false);
          notification.info({
            message: t('notification.search_sats_title'),
            description: 'The task for searching sats is processing.',
          });
          return;
        }
        if (task.status === 2) {
          const utxoList = JSON.parse(task.result);
          setLoading(false);
          setUtxoList(utxoList);
          return;
        }
        if (task.status === -1) {
          setLoading(false);
          notification.info({
            message: t('notification.search_sats_title'),
            description: 'The task for searching sats is processing.',
          });
          return;
        }
      }

      const utxo = await getAvialableUtxo(); // 获取可用utxo
      if (!utxo) {
        setLoading(false);
        notification.error({
          message: t('notification.search_sats_title'),
          description:
            'Search sats in global failed: There is not enough sats to pay.',
        });
        return;
      }

      const inTotal = utxo?.value;
      const outTotal = serviceFee;

      const utxos = [
        {
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
        },
      ];

      const fee = await calculateFee(utxo);

      if (inTotal - outTotal - fee < 0) {
        setLoading(false);
        notification.error({
          message: t('notification.transaction_title'),
          description: 'There is no enough sats',
        });
        return;
      }

      const psbt = await buildTransaction({
        utxos,
        outputs: [
          {
            address: tipAddress || '',
            value: serviceFee,
          },
        ],
        feeRate: feeRate.value,
        network,
        address: currentAccount,
        publicKey,
      });

      // const txid = await signAndPushPsbt(psbt);
      const txid =
        'a2f42b3860bf09f4ef59d550d682a0c3cac2f74adcf90c04ff8da6777c519d42';

      const parameters = JSON.stringify({
        sat_no: searchSatList.items[0].sat,
      });

      const resp = await addOrderTask({
        address: currentAccount,
        fees: serviceFee,
        parameters,
        txid,
        type,
      }); // 提交任务
      setLoading(false);
      if (resp.code === 200) {
        notification.success({
          message: t('notification.search_sats_title'),
          description: 'Split & Send success',
        });
      } else {
        notification.error({
          message: t('notification.search_sats_title'),
          description: resp.msg || 'Search sats in global failed',
        });
      }
    } catch (error: any) {
      console.log('error(search sats) = ', error);
      setLoading(false);
      notification.error({
        message: t('notification.search_sats_title'),
        description: error.message || 'Search sats in global failed',
      });
    }
  };

  const getOrderTaskBySat = async () => {
    let task;
    const parameters = JSON.stringify({
      sat_no: searchSatList.items[0].sat,
    });

    const resp = await getLastOrderTaskByParameters({
      address: currentAccount,
      parameters,
      type: 'search_rarity_sats',
    });
    if (resp.code === 200) {
      task = resp.data;
    }
    return task;
  };

  const doSearchByAddress = async () => {
    setLoading(true);
    setUtxoList([]);
    const res = await getSatsByAddress({
      address: address,
      sats: searchSatList.items.map((item) => Number(item.sat)),
      network,
    });

    if (res.code !== 0) {
      setLoading(false);
      notification.error({
        message: t('notification.search_sats_title'),
        description: res.msg,
      });
      return;
    }
    if (res.data === null) {
      setLoading(false);
      notification.error({
        message: t('notification.search_sats_title'),
        description: 'No data',
      });
      return;
    }
    setLoading(false);
    setUtxoList(res.data);
  };

  const getAvialableUtxo = async () => {
    let utxo;
    let data = await getUtxoByValue({
      address: currentAccount,
      value: 0,
      network,
    });
    if (data.code === 0) {
      const utxos = data.data.sort((a, b) => a.value - b.value); // 排序：小->大

      for (let i = 0; i < utxos.length; i++) {
        const item = utxos[i];
        if (item.value > serviceFee) {
          const fee = await calculateFee(item);
          if (fee > 0) {
            utxo = item;
            break;
          }
        }
      }
    }
    return utxo;
  };

  const calculateFee = async (inputUtxo) => {
    let inTotal = inputUtxo.value;
    let outTotal = serviceFee;

    const utxos = [
      {
        txid: inputUtxo.txid,
        vout: inputUtxo.vout,
        value: inputUtxo.value,
      },
    ];

    let fee = await calcNetworkFee({
      utxos,
      outputs: [
        {
          address: tipAddress || '',
          value: serviceFee,
        },
      ],
      feeRate: feeRate.value,
      network,
      address: currentAccount,
      publicKey,
    });
    if (inTotal - outTotal - fee < 0) {
      fee = -1;
    }
    return fee;
  };

  const handleSwitch = (flag) => {
    setSelectGlobal(flag);
    if (searchSatList.items.length > 0) {
      setSearchSatList('items', [searchSatList.items[0]]);
    }

    setAddress('');
  };

  useEffect(() => {
    if (txid) {
      setSearchSatList('items', [
        {
          id: 1,
          sat: '1234567890',
        },
      ]);
      setSelectGlobal(true);
    } else {
      setSearchSatList('items', [
        {
          id: 1,
          sat: '',
        },
      ]);
    }
  }, [currentAccount, txid]);

  return (
    <div className="flex flex-col max-w-7xl mx-auto pt-8">
      <Card>
        <CardBody>
          {searchSatList.items.map((item, i) => (
            <div className="flex w-full gap-2 pb-2" key={i}>
              <Input
                className="w-[90%]"
                value={item.sat}
                startContent={
                  <div className="pointer-events-none flex items-center w-[19%] bg-gray-500 justify-center h-full">
                    <span className="text-small txt-default-500">Sat</span>
                  </div>
                }
                onChange={(e) => setSat(item.id, e.target.value)}
              />
              <div className="flex gap-2">
                <Button radius="full" onClick={addSat}>
                  <Image
                    radius="full"
                    src="../icon/add.svg"
                    alt="logo"
                    className="w-10 h-10 p-1 rounded-full "
                  />
                </Button>
                <Button radius="full" onClick={() => removeSat(item.id)}>
                  <Image
                    radius="full"
                    src="../icon/del.svg"
                    alt="logo"
                    className="w-10 h-10 p-1 rounded-full "
                  />
                </Button>
              </div>
            </div>
          ))}
          <Divider className="mt-4 mb-4" />
          <div className="flex w-full">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              isDisabled={selectGlobal}
              startContent={
                <div className="pointer-events-none flex items-center w-[16%] bg-gray-500 justify-center h-full">
                  <span className="text-small txt-default-500">
                    BTC Address
                  </span>
                </div>
              }
            />
          </div>
          <Divider className="mt-4 mb-4" />
          <div className="flex gap-2 pb-2 justify-end">
            <Switch
              defaultSelected={selectGlobal}
              onValueChange={() => handleSwitch(!selectGlobal)}
            >
              <p className="text-gray-400 font-thin">
                Search In Global(Fee: 100,000 Sats)
              </p>
            </Switch>
            <Button
              size="md"
              color="primary"
              onKeyDown={handleKeyDown}
              isLoading={loading}
              onClick={doSearch}
            >
              Search
            </Button>
          </div>
        </CardBody>
      </Card>
      <Divider className="mt-4 mb-4" />
      <Card>
        <CardHeader>
          <h1>{t('pages.tools.search_sat.table_title')}</h1>
        </CardHeader>
        <Divider />
        <CardBody>
          <Table
            isHeaderSticky
            isStriped
            color="primary"
            selectionMode="single"
          >
            <TableHeader>
              <TableColumn className="text-sm md:text-base font-thin">
                {t('pages.tools.search_sat.table_col1')}
              </TableColumn>
              <TableColumn className="text-sm md:text-base font-thin">
                {t('pages.tools.search_sat.table_col2')}
              </TableColumn>
              <TableColumn className="text-sm md:text-base font-thin">
                {t('pages.tools.search_sat.table_col3')}
              </TableColumn>
              <TableColumn className="text-sm md:text-base font-thin">
                {t('pages.tools.search_sat.table_col4')}
              </TableColumn>
            </TableHeader>
            <TableBody emptyContent={'No datas.'}>
              {utxoList.map((item, i) => (
                <TableColumn key={i} className="text-sm md:text-base">
                  {item.sat}
                </TableColumn>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
