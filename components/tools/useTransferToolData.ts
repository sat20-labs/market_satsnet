'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMap, useList } from 'react-use';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useCommonStore } from '@/store';
import {
  getOrdxAddressHolders,
  getSats,
  getUtxoByValue,
  ordx,
} from '@/api';
import {
  calcNetworkFee,
  buildTransaction,
  signAndPushPsbt,
  hideStr,
  getTickLabel,
} from '@/lib';
import { notification } from 'antd';
import { useTranslation } from 'react-i18next';
import { debounce } from 'lodash';

// Constants
const LIMITS = {
  ORDX_UTXO: 100,
  PLAIN_UTXO: 100,
} as const;

// Types
interface InputItem {
  id: number;
  value: {
    ticker: string;
    utxo: string;
    sats: number;
    unit: string;
    description?: string;
  };
  options: {
    tickers: Array<any>;
    utxos: Array<any>;
  };
}

interface OutputItem {
  id: number;
  num: number;
  value: {
    sats: number;
    unit: string;
    address: string;
  };
}

interface Balance {
  sats: number;
  unit: string;
}

interface TickerItem {
  ticker: string;
  type?: string;
  total?: number;
  utxos: Array<{
    txid: string;
    vout: number;
    value: number;
    assetamount?: number;
  }>;
}

// Error handling utility
const createErrorHandler = (t: any) => (error: Error, customMessage?: string) => {
  console.error('Transfer tool error:', error);

  notification.error({
    message: t('notification.transaction_title'),
    description: customMessage || error.message || t('notification.transaction_spilt_fail'),
  });
};

export function useTransferToolData() {
  const { t } = useTranslation();
  const handleError = useMemo(() => createErrorHandler(t), [t]);
  
  // 合并基础状态
  const [transferState, setTransferState] = useState({
    fee: 0,
    loading: false,
    ordxUtxoLimit: LIMITS.ORDX_UTXO,
    plainUtxoLimit: LIMITS.PLAIN_UTXO,
    refresh: 0
  });

  const { feeRate } = useCommonStore((state) => state);
  const { address, network, publicKey } = useReactWalletStore((state) => state);

  const [inputList, { set: setInputList }] = useMap<any>({
    items: [
      {
        id: 1,
        value: {
          ticker: '',
          utxo: '',
          sats: 0,
          unit: 'sats',
          description: '',
        },
        options: {
          tickers: [],
          utxos: [],
        },
      },
    ],
  });

  const [outputList, { set: setOutputList }] = useMap<any>({
    items: [
      {
        id: 1,
        num: 1,
        value: {
          sats: 0,
          unit: 'sats',
          address: '',
        },
      },
    ],
  });

  const [balance, { set: setBalance }] = useMap<any>({
    sats: 0,
    unit: 'sats',
  });

  const [tickerList, { set: setTickerList }] = useList<any>([]);

  // 使用 useMemo 优化计算密集型函数
  const calculateBalance = useMemo(() => {
    return debounce(async () => {
      try {
        let inTotal = 0;
        let outTotal = 0;
        
        // 计算输入总额
        inputList.items.forEach((v) => {
          inTotal += v.value.sats;
        });
        if (inTotal === 0) return;

        // 计算输出总额
        const outputs: any[] = [];
        outputList.items.forEach((v) => {
          for (let i = 0; i < v.num; i++) {
            outputs.push({
              address: v.value.address,
              value: v.value.sats,
            });
          }
        });
        outputs.forEach((v) => {
          outTotal += v.value;
        });
        if (outTotal === 0) return;

        // 准备 UTXO 数据
        const utxos = inputList.items.map((v) => ({
          txid: v.value.utxo.split(':')[0],
          vout: Number(v.value.utxo.split(':')[1]),
          value: v.value.sats,
        }));

        // 计算网络费用
        const fee = await calcNetworkFee({
          utxos,
          outputs,
          feeRate: feeRate.value,
          network,
          address: address,
          publicKey,
        });

        setTransferState(prev => ({ ...prev, fee }));
        setBalance('sats', inTotal - outTotal - fee);
      } catch (error) {
        handleError(error as Error);
      }
    }, 300);
  }, [inputList.items, outputList.items, feeRate.value, network, address, publicKey, handleError]);

  const handleTickerSelectChange = useCallback(
    (itemId, ticker) => {
      const updatedItems = [...inputList.items];
      updatedItems[itemId - 1].value = {
        ...updatedItems[itemId - 1].value,
        ticker,
        sats: 0,
        unit: 'sats',
        utxo: '',
        utxos: [],
      };

      const selectTicker =
        tickerList?.find((item) => item.ticker === ticker) || [];
      let utxos = selectTicker.utxos;
      if (inputList.items.length > 1) {
        inputList.items.forEach((inItem, index) => {
          if (index !== itemId - 1) {
            utxos = utxos.filter(
              (utxo) => utxo.txid + ':' + utxo.vout !== inItem.value.utxo,
            );
            utxos = [...new Set(utxos)];
          }
        });
      }

      updatedItems[itemId - 1].options.utxos = utxos;
      setInputList('items', updatedItems);
    },
    [inputList.items, tickerList],
  );

  const handleUtxoSelectChange = useCallback(
    (itemId, utxo) => {
      const txid = utxo.split(':')[0];
      const vout = Number(utxo.split(':')[1]);

      const utxoObj = inputList.items[itemId - 1].options.utxos.find(
        (item) => item.txid === txid && item.vout === vout,
      );

      const updatedItems = [...inputList.items];
      updatedItems[itemId - 1].value = {
        ...updatedItems[itemId - 1].value,
        sats: utxoObj?.value || 0,
        utxo,
        description: utxoObj?.assetamount
          ? `${utxoObj.assetamount} Asset/ ${utxoObj.value} sats`
          : `${utxoObj.value} sats`,
      };

      setInputList('items', updatedItems);
      calculateBalance();
    },
    [inputList.items],
  );

  const getTickers = useCallback(async () => {
    try {
      const tickers: any[] = [];
      const res = await ordx.getOrdxSummary({
        address: address,
        network,
      });

      if (res.code !== 0) {
        handleError(new Error(res.msg));
        return [];
      }

      const detail = res.data.detail;
      await Promise.all(
        detail.map(async (item) => {
          if (item.type === 'e' || item.type === 'o') {
            return;
          }

          let tickerOrAssetsType = item.type;
          if (item.type === 'f') {
            tickerOrAssetsType = item.ticker;
          }
          let ticker = item.ticker;
          if (item.type === 'n' && !item.ticker) {
            ticker = 'PureName';
          }
          let res;
          if (item.type === 'n') {
            res = await ordx.getOrdxNsUxtos({
              start: 0,
              limit: transferState.ordxUtxoLimit,
              address: address,
              sub: ticker,
              network: network,
            })
            console.log('res = ', res);
            
            return;
          } else if (!!item.type) {
            res = await getOrdxAddressHolders({
              start: 0,
              limit: transferState.ordxUtxoLimit,
              address: address,
              tickerOrAssetsType: tickerOrAssetsType,
              network: network,
            })
          }

          if (res && res.code === 0) {
            const details = (item.type === 'n' ? res.data.names : res.data.detail) || [];
            const total = res.data.total;
            
            const utxosOfTicker = details.map((detail) => ({
              txid: detail.utxo.split(':')[0],
              vout: Number(detail.utxo.split(':')[1]),
              value: detail.amount || detail.value,
              assetamount: detail.assetamount || detail.value,
            }));

            tickers.push({
              ticker: ticker,
              type: item.type,
              total: total,
              utxos: utxosOfTicker,
            });
          }
        }),
      );
      console.log('123tickers = ', tickers);
      
      return tickers;
    } catch (error) {

      handleError(error as Error);
      return [];
    }
  }, [address, network, transferState.ordxUtxoLimit, handleError]);

  const getAvialableTicker = useCallback(async () => {
    try {
      const res = await getUtxoByValue({
        address: address,
        value: 0,
        network,
      });

      if (res.code !== 0) {
        handleError(new Error(res.msg));
        return null;
      }

      return {
        ticker: t('pages.tools.transaction.available_utxo'),
        utxos: res.data,
      };
    } catch (error) {
      handleError(error as Error);
      return null;
    }
  }, [address, network, t, handleError]);

  const getRareSatTicker = useCallback(async () => {
    try {
      const data = await getSats({
        address: address,
        network,
      });

      if (data.code !== 0) {
        return [];
      }

      return data.data.reduce((tickers: any[], item) => {
        const hasRareStats = item.sats?.some(sat => sat.satributes?.length > 0);
        
        if (hasRareStats) {
          const utxo = {
            txid: item.utxo.split(':')[0],
            vout: Number(item.utxo.split(':')[1]),
            value: item.value,
          };

          const tickerName = t('pages.tools.transaction.rare_sats') + '-' + item.sats[0].satributes[0];
          const existingTicker = tickers.find(t => t.ticker === tickerName);

          if (existingTicker) {
            existingTicker.utxos.push(utxo);
          } else {
            tickers.push({
              ticker: tickerName,
              utxos: [utxo],
            });
          }
        }

        return tickers;
      }, []);
    } catch (error) {
      handleError(error as Error);
      return [];
    }
  }, [address, network, t, handleError]);

  const getAllTickers = useCallback(async () => {
    try {
      const [tickers, availableTicker, rareSatTickers] = await Promise.all([
        getTickers(),
        getAvialableTicker(),
        getRareSatTicker(),
      ]);
      console.log('tickers = ', tickers);
      console.log('availableTicker = ', availableTicker);
      console.log('rareSatTickers = ', rareSatTickers);

      const combinedTickers = [
        ...(tickers || []),
        ...(availableTicker ? [availableTicker] : []),
        ...(rareSatTickers || []),
      ];

      setTickerList(combinedTickers);
    } catch (error) {
      handleError(error as Error);
      setTickerList([]);
    }
  }, [getTickers, getAvialableTicker, getRareSatTicker, handleError]);

  const splitHandler = useCallback(async () => {
    if (!address) {
      return;
    }
    setTransferState(prev => ({ ...prev, loading: true }));

    try {
      const inTotal = inputList.items.reduce(
        (acc, cur) => acc + cur.value.sats,
        0,
      );

      const utxos = inputList.items.map((v) => ({
        txid: v.value.utxo.split(':')[0],
        vout: Number(v.value.utxo.split(':')[1]),
        value: v.value.sats,
      }));
      const outputs: any[] = [];
      outputList.items.forEach((v) => {
        for (let i = 0; i < v.num; i++) {
          outputs.push({
            address: v.value.address,
            value: v.value.sats,
          });
        }
      });
      const outTotal = outputs.reduce((acc, cur) => acc + cur.value, 0);
      const fee = await calcNetworkFee({
        utxos,
        outputs: outputs,
        feeRate: feeRate.value,
        network,
        address: address,
        publicKey,
      });
      if (inTotal - outTotal - fee < 0) {
        setTransferState(prev => ({ ...prev, loading: false }));
        notification.error({
          message: t('notification.transaction_title'),
          description: 'Not enough sats',
        });
        return;
      }

      const psbt = await buildTransaction({
        utxos,
        outputs,
        feeRate: feeRate.value,
        network,
        address: address,
        suitable: false,
        publicKey,
      });

      const txid = await signAndPushPsbt(psbt);
      setTransferState(prev => ({ ...prev, loading: false }));
      notification.success({
        message: t('notification.transaction_title'),
        description: t('notification.transaction_spilt_success'),
      });

      setTransferState(prev => ({ ...prev, refresh: prev.refresh + 1 }));
    } catch (error: any) {
      console.log('error(transfer sats) = ', error);
      setTransferState(prev => ({ ...prev, loading: false }));
      notification.error({
        message: t('notification.transaction_title'),
        description: error.message || t('notification.transaction_spilt_fail'),
      });
    }
  }, [
    address,
    inputList.items,
    outputList.items,
    feeRate.value,
    network,
    publicKey,
    t,
  ]);

  useEffect(() => {
    calculateBalance();
  }, [feeRate, inputList, outputList]);

  useEffect(() => {
    setTickerList([]);
    setInputList('items', [
      {
        id: 1,
        value: {
          ticker: '',
          utxo: '',
          sats: 0,
          unit: 'sats',
        },
        options: {
          tickers: [],
          utxos: [],
        },
      },
    ]);
    setBalance('sats', 0);
    setBalance('unit', 'sats');

    setTransferState(prev => ({ ...prev, fee: 0 }));
    setOutputList('items', [
      {
        id: 1,
        num: 1,
        value: {
          sats: 0,
          unit: 'sats',
          address: '',
        },
      },
    ]);
    if (address) {
      getAllTickers();
    }
  }, [address, transferState.refresh, getAllTickers]);

  return useMemo(
    () => ({
      fee: transferState.fee,
      loading: transferState.loading,
      refresh: transferState.refresh,
      address,
      inputList,
      outputList,
      balance,
      tickerList,
      handleTickerSelectChange,
      handleUtxoSelectChange,
      setInputList,
      setOutputList,
      setBalance,
      splitHandler,
      feeRate,
    }),
    [
      transferState,
      address,
      inputList,
      outputList,
      balance,
      tickerList,
      handleTickerSelectChange,
      handleUtxoSelectChange,
      splitHandler,
      feeRate,
    ],
  );
}
