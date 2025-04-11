'use client';
import { Select, SelectItem } from '@nextui-org/react';
import { WalletConnectBus } from '@/components/wallet/WalletConnectBus';
import {
  buildTransaction,
  calcNetworkFee,
  hideStr,
  signAndPushPsbt,
  getTickLabel,
} from '@/lib';
import { useCommonStore } from '@/store';
import {
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
  Input,
  Tooltip,
  Image,
} from '@nextui-org/react';
import { notification } from 'antd';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useList, useMap } from 'react-use';
import { Select as AntSelect } from 'antd';
interface InputItem {
  utxo: string;
  value: number;
  ticker: string;
}

interface OutputItem {
  address: string;
  value: number;
}
export default function TransactionInput() {
  const [
    inputList,
    { push: pushInput, updateAt: updateAtInput, reset: restInputs },
  ] = useList<InputItem>([]);
  const [
    outputList,
    { push: pushOutput, updateAt: updateAtOutput, reset: restOutputs },
  ] = useList<OutputItem>([]);
  return (
    <div>
      {/* <div>
        <div>
          <h6>{t('pages.tools.transaction.input')} UTXO</h6>
        </div>
        <div className="pt-2">
          {inputList.map((item, i) => (
            <div
              className="pb-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4"
              key={i}
            >
              <div className="col-span-2">
                {i + 1}. &nbsp;
                <AntSelect
                  placeholder="Select Ticker"
                  className="h-10 w-36 md:w-64"
                  value={item.value?.ticker ? item.value?.ticker : undefined}
                  options={
                    tickerList?.map((utxo) => ({
                      label: (
                        <div className="w-full p-0 m-0">
                          {getTickLabel(utxo.ticker)}
                        </div>
                      ),
                      value: utxo.ticker,
                    })) || []
                  }
                  onChange={(e) => handleTickerSelectChange(item.id, e)}
                />
                <AntSelect
                  placeholder="Select UTXO"
                  className="h-10 w-36 md:w-80 pl-1 md:pl-2"
                  value={
                    inputList.items[i]?.value?.utxo
                      ? inputList.items[i]?.value?.utxo
                      : undefined
                  }
                  options={
                    inputList.items[i]?.options?.utxos.map((utxo) => ({
                      label: (
                        <div className="w-full p-0 m-0">
                          {utxo.assetamount && utxo.assetamount + ' Asset/'}
                          {utxo.value +
                            ' sats - ' +
                            hideStr(utxo.txid + ':' + utxo.vout)}
                        </div>
                      ),
                      value: utxo.txid + ':' + utxo.vout,
                    })) || []
                  }
                  onChange={(e) => handleUtxoSelectChange(item.id, e)}
                />
              </div>
              <div className="w-36 md:w-48">
                <Input
                  key={'input-sat-' + item.id}
                  placeholder="0"
                  value={
                    item.value.unit === 'sats'
                      ? item.value.sats
                      : item.value.sats / 100000000
                  }
                  endContent={
                    <div className="flex items-center">
                      <select
                        title="select1"
                        className="outline-none border-0 bg-transparent text-default-400 text-small"
                        value={item.value.unit}
                        onChange={(e) =>
                          handleInputUnitSelectChange(item.id, e)
                        }
                      >
                        <option>sats</option>
                        <option>btc</option>
                      </select>
                    </div>
                  }
                />
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Button
                  radius="full"
                  className="text-green-500 md:w-20"
                  onClick={addInputItem}
                >
                  Add<span className="text-xl font-bold">+</span>
                </Button>
                <Button
                  radius="full"
                  className="text-green-500 md:w-20"
                  onClick={() => removeInputItem(item.id)}
                >
                  Del<span className="text-xl font-bold">-</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Divider className="my-4" />
      <div>
        <div>
          <h6>{t('pages.tools.transaction.output')} UTXO</h6>
        </div>
        <div className="pt-2">
          {outputList.items.map((item, i) => (
            <div
              className="pb-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              key={i}
            >
              <div className="flex col-span-2 justify-center items-center">
                {' '}
                {i + 1}.
                <Input
                  placeholder="BTC Address"
                  value={item.value.address}
                  onChange={(e) => setBtcAddress(item.id, e.target.value)}
                  className="w-64 md:w-full"
                />
                <Tooltip content="Fill the BTC address of the current account">
                  <Button
                    onClick={() => setBtcAddress(item.id, address)}
                    className="w-12"
                  >
                    <Image
                      radius="full"
                      src="../icon/copy.svg"
                      alt="logo"
                      className="w-10 h-10 p-1 rounded-full"
                    />
                  </Button>
                </Tooltip>
              </div>
              <div className="w-36 md:w-48 md:px-2 justify-center items-center">
                <Input
                  key={'output-sat-' + item.id}
                  style={{ height: '48px' }}
                  placeholder="0"
                  value={
                    item.value.unit === 'sats'
                      ? item.value.sats
                      : item.value.sats / 100000000
                  }
                  onChange={(e) => {
                    setOutputSats(item.id, e.target.value);
                    console.log('onBlur is skipped');
                  }}
                  onBlur={(e) => {
                    outputSatsOnBlur(e);
                  }}
                  endContent={
                    <div className="flex items-center">
                      <select
                        title="select2"
                        className="outline-none border-0 bg-transparent text-default-400 text-small"
                        value={item.value.unit}
                        onChange={(e) =>
                          handleOutputUnitSelectChange(item.id, e)
                        }
                      >
                        <option>sats</option>
                        <option>btc</option>
                      </select>
                    </div>
                  }
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Button
                  radius="full"
                  className="text-green-500"
                  onClick={addOuputItem}
                >
                  Add<span className="text-xl font-bold">+</span>
                </Button>
                <Button
                  radius="full"
                  className="text-green-500"
                  onClick={() => removeOutputItem(item.id)}
                >
                  Del<span className="text-xl font-bold">-</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Divider className="my-4" />
      <div className="gap-2 pb-2">
        <div className="flex gap-2 pb-2">
          <h6>{t('pages.tools.transaction.balance')}</h6>
          <br />
          <span className="text-gray-400 text-sm font-light pt-1">
            ({t('pages.tools.transaction.balance_des')})
          </span>
        </div>
        <div>
          <div className="flex gap-2 pb-2">
            <div className="w-44 md:w-[50%]">
              <Input
                // width={'60%'}
                value={address}
                placeholder="Current Address"
                className="w-44 md:w-full"
              />
            </div>
            <div className="pl-1 w-36 md:w-48">
              <Input
                key={'balance-sat'}
                className={'w-36'}
                style={{ height: '48px' }}
                placeholder="0"
                value={
                  balance.unit === 'sats'
                    ? balance.sats
                    : balance.sats / 100000000
                }
                endContent={
                  <div className="flex items-center">
                    <select
                      title="select3"
                      className="outline-none border-0 bg-transparent text-default-400 text-small"
                      value={balance.unit}
                      onChange={(e) => handleBalanceUnitSelectChange(e)}
                    >
                      <option>sats</option>
                      <option>btc</option>
                    </select>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div> */}
    </div>
  );
}
