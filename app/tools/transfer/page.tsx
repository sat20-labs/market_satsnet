'use client';

import {
  Button,
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
  Textarea,
  Snippet,
  Checkbox,
} from '@nextui-org/react';
import { notification } from 'antd';
import { ordx } from '@/api';
import { useCommonStore, useSellStore } from '@/store';
import { useMemo, useState } from 'react';
import { isTaprootAddress } from '@/lib/wallet';
import { generateTransferPsbt, hideStr } from '@/lib/utils';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useTranslation } from 'react-i18next';
import { useUtxoStore } from '@/store';
import { tryit } from 'radash';

export default function Transfer() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { list, remove } = useSellStore();
  const { feeRate, chain } = useCommonStore();
  const { getUnspendUtxos } = useUtxoStore();
  const [selectedTab, setSelectedTab] = useState('single');
  const { network, btcWallet, address } = useReactWalletStore((state) => state);
  const [singleAddress, setSingleAddress] = useState('');
  const [errText, setErrText] = useState('');
  const [selected, setSelected] = useState(false);
  const [tx, setTx] = useState<any>();
  const [gasFee, setGasFee] = useState(0);
  const [multipleAddresses, setMultipleAddresses] = useState('');
  console.log('app.account.sell.page: list: ', list);

  const checkToAddressIsTaproot = (address: string[]) => {
    for (const addr of address) {
      if (!isTaprootAddress(addr, network)) {
        setErrText(t('pages.inscribe.step_three.error_3'));
        return false;
      }
    }
    return true;
  };
  // const gasFee = useMemo(() => {
  //   return tx?.calNetworkFee?.() || 0;
  // }, [tx]);
  const toAddressList = useMemo<any[]>(() => {
    if (selectedTab === 'single') {
      return Array.from({ length: list.length })
        .fill(singleAddress.trim())
        .filter((v) => !!v);
    } else {
      return multipleAddresses
        .split('\n')
        .map((address) => address.trim())
        .filter((address) => address !== '');
    }
  }, [multipleAddresses, singleAddress, selectedTab, list]);

  const transferHandler = async () => {
    setLoading(true);
    setTx(undefined);
    const [err, res] = await tryit(ordx.getAllUtxos)({ address, network });
    if (err) {
      console.error('Get utxo failed', err);
      notification.error({
        message: t('notification.system_error'),
      });
      setLoading(false);
      return;
    }
    const nftUtxos = res.otherutxos.map((val) => {
      return {
        ...val,
        utxo: `${val.txid}:${val.vout}`,
      };
    });
    const plainutxos = res.plainutxos;
    console.log(singleAddress);
    const toAddressList = [singleAddress];
    if (toAddressList.length === 0) {
      setErrText(t('pages.transfer.error_1'));
      setLoading(false);
      return;
    }
    // if (toAddressList.length !== list.length) {
    //   setErrText(t('pages.transfer.error_2'));
    //   return;
    // }
    const checkStatus = checkToAddressIsTaproot(toAddressList);
    if (!checkStatus) {
      return;
    }
    try {
      const tx = await generateTransferPsbt({
        inscriptionUtxos: nftUtxos,
        addresses: toAddressList,
        network,
        oneOutput: selected,
        utxos: plainutxos,
        feeRate: feeRate.value,
      });
      console.log(tx);
      const _fee = await tx.calNetworkFee();
      setGasFee(_fee);
      setTx(tx);
    } catch (error: any) {
      console.error('List failed', error);
      notification.error({
        message: t('notification.transfer_error_title'),
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };
  const confirmHandler = async () => {
    setLoading(true);
    try {
      if (!tx) {
        throw new Error('No transaction');
      }
      if (!btcWallet) {
        throw new Error('No wallet connected');
      }
      const signedPsbts = await btcWallet.signPsbt(tx.toPsbt().toHex(), { chain });
      if (signedPsbts) {
        await btcWallet.pushPsbt(signedPsbts);
      }
      notification.success({
        message: t('notification.transfer_success_title'),
      });
    } catch (error: any) {
      console.error('Confirm failed', error);
      notification.error({
        message: t('notification.transfer_error_title'),
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };
  const cycleFill = () => {
    const addresses = multipleAddresses;
    const addressList = addresses
      .split('\n')
      .map((address) => address.trim())
      .filter((a) => a !== '');
    const len = list.length || 10;
    const newAddressList: string[] = [];
    if (addressList.length < len) {
      for (let i = 0; i < len; i++) {
        newAddressList.push(addressList[i % addressList.length]);
      }
      setMultipleAddresses(newAddressList.join('\n'));
    }
  };
  return (
    <div className="py-2 max-w-4xl mx-auto">
      <div className="flex flex-col justify-between gap-4 mb-4">
        <div className="flex-1 mb-2 md:mb-0">
          {/* <Table aria-label="Example static collection table">
            <TableHeader>
              <TableColumn className="text-sm md:text-base">
                {t('common.item')}({list.length})
              </TableColumn>
              <TableColumn className="text-sm md:text-base">Action</TableColumn>
            </TableHeader>
            <TableBody>
              {list.map((item, i) => (
                <TableRow key={item.utxo}>
                  <TableCell>
                    <div className="mb-2 flex flex-wrap items-center gap-4">
                      {item.assets_list?.map((v) => (
                        <div key={v.assets_name}>
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
                            <span className="text-gray-400 ml-4 ">Sats:</span>
                            {item.value}
                          </div>
                        </div>
                      ))}
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
                    <Button
                      onClick={() => {
                        remove(item.utxo);
                      }}
                    >
                      {t('common.delete')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table> */}
        </div>
        <div className="max-w-full">
          <Tabs
            aria-label="address tabs"
            className="w-full"
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as string)}
          >
            <Tab key="single" title={t('pages.inscribe.step_three.to_single')}>
              <div className="mb-4">
                <div>
                  <Input
                    placeholder="Basic usage"
                    value={singleAddress}
                    onChange={(e) => setSingleAddress(e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <Checkbox
                    isSelected={selected}
                    onValueChange={(value) => setSelected(value)}
                  >
                    合并到一个utxo
                  </Checkbox>
                </div>
              </div>
            </Tab>
            {/* <Tab
              key="multiple"
              title={t('pages.inscribe.step_three.to_multiple')}
            >
              <div className="mb-4">
                <div className="mb-2">
                  Multiple Adddress ({toAddressList.length}):
                </div>
                <Textarea
                  disableAnimation
                  disableAutosize
                  classNames={{
                    input: 'resize-y min-h-[140px]',
                  }}
                  className="w-full"
                  placeholder="Enter multiple addresses, one per line"
                  value={multipleAddresses}
                  onChange={(e) => setMultipleAddresses(e.target.value)}
                />
                <div className="flex mt-2">
                  <Button
                    color={'primary'}
                    onClick={cycleFill}
                    className="w-full"
                  >
                    {t('pages.inscribe.step_three.cycle_fill', {
                      len: list.length,
                    })}
                  </Button>
                </div>
              </div>
            </Tab> */}
          </Tabs>
        </div>
      </div>
      {!!errText && (
        <div className="text-red-500 text-center mb-4">{errText}</div>
      )}

      {tx ? (
        <Button
          color="primary"
          isLoading={loading}
          className="mx-auto max-w-full w-56 block"
          onClick={confirmHandler}
        >
          确认（gas费用：{gasFee} sat）
        </Button>
      ) : (
        <Button
          color="primary"
          isLoading={loading}
          className="mx-auto max-w-full w-56 block"
          onClick={transferHandler}
        >
          转移所有资产
        </Button>
      )}
    </div>
  );
}
