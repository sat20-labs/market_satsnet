'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getAddressAssetsList } from '@/api'; // 引入拆分和挂单的 API
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';

import { useCommonStore } from '@/store';
import SellOrderModal from './SellOrderModal'; // 引入挂单弹窗组件


interface NewAssetListProps {
  assets_type: string; // 资产类型
}

export const NewAssetsList = ({ assets_type }: NewAssetListProps) => {
  const { address, network, btcWallet } = useReactWalletStore((state) => state);
  const { chain } = useCommonStore();

  const [isModalOpen, setIsModalOpen] = useState(false); // 控制弹窗显示状态
  const [selectedAsset, setSelectedAsset] = useState<any>(null); // 当前选中的资产

  // SWR Key 用于缓存和请求
  const swrKey = useMemo(() => {
    return `/ordx/getAddressAssetsList-${address}-${chain}-${network}-${assets_type}`;
  }, [address, network, assets_type]);

  // 使用 SWR 获取资产列表
  const { data, isLoading, mutate } = useSWR(
    swrKey,
    () => getAddressAssetsList(address, assets_type),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  // 处理资产列表数据
  const list = useMemo(() => {
    if (!data?.data) {
      return [];
    }
    return data.data;
  }, [data]);

   // 挂单处理逻辑
   const sellHandler = async (item: any, quantity: number, price: number) => {
    try {
      // 检查是否需要拆分 UTXO
      if (item.balance < quantity) {
        console.error('Insufficient balance for the requested quantity.');
        return;
      }

      // if (item.balance > quantity) {
      //   console.log('Splitting UTXO...');
      //   const splitResponse = await splitUtxo({
      //     utxo: item.utxo,
      //     quantity,
      //     address,
      //     chain,
      //     network,
      //   });

      //   if (!splitResponse.success) {
      //     console.error('Failed to split UTXO:', splitResponse.message);
      //     return;
      //   }

      //   // 用户签名拆分交易
      //   const signedSplitTx = await btcWallet?.signPsbt(splitResponse.psbt, { chain });
      //   if (!signedSplitTx) {
      //     console.error('Failed to sign split transaction');
      //     return;
      //   }

      //   console.log('Split transaction signed:', signedSplitTx);
      // }

      // 提交挂单
      console.log('Submitting sell order...');
      // const sellResponse = await submitSellOrder({
      //   utxo: item.utxo,
      //   unit_price: price.toString(),
      //   address,
      //   chain,
      //   network,
      // });

      // if (!sellResponse.success) {
      //   console.error('Failed to submit sell order:', sellResponse.message);
      //   return;
      // }

      // // 用户签名挂单交易
      // const signedSellTx = await btcWallet?.signPsbt(sellResponse.psbt, { chain });
      // if (!signedSellTx) {
      //   console.error('Failed to sign sell transaction');
      //   return;
      // }

      // console.log('Sell transaction signed:', signedSellTx);

      // // 刷新列表
      // mutate();
    } catch (error) {
      console.error('Error during sell process:', error);
    }
  };

  // 打开挂单弹窗
  const handleSellClick = (asset: any) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  // 关闭挂单弹窗
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedAsset(null);
  };

  // 挂单提交逻辑
  const handleSellSubmit = async (quantity: number, price: number) => {
    console.log('Sell Order Submitted:', { quantity, price });
    // 在这里调用挂单逻辑
    setIsModalOpen(false);
    mutate(); // 刷新资产列表
  };

  return (
    <div className="py-4 rounded-xl bg-zinc-800/50 shadow-md">
      <div className="px-4">
        {/* 表头 */}
        <div className="grid grid-cols-4 text-base font-medium bg-zinc-700/50 text-zinc-400 border-b border-zinc-800 px-4 py-3 rounded-lg shadow-md">
          <div>Name</div>
          <div>Balance</div>
          <div>Price</div>
          <div className="text-center">Action</div>
        </div>

        {/* 资产列表 */}
        {isLoading ? (
          <div className="text-center text-zinc-400 py-4">Loading...</div>
        ) : list.length === 0 ? (
          <div className="text-center text-zinc-400 py-4">No assets found</div>
        ) : (
          list.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-4 items-center text-sm text-zinc-200 border-b border-zinc-800 px-4 py-3 hover:bg-zinc-800"
            >
              {/* 资产名称 */}
              <div>
                <div className="font-medium">{item.assets_name}</div>
              </div>

              {/* 资产数量 */}
              <div>{item.balance?.toLocaleString() || 0}</div>
                
                {/* 资产价格 */}
              <div>
                {item.price?.toLocaleString() || 0} BTC
              </div>

              {/* 挂单按钮 */}
              <div className="text-center">
                <Button
                  className="btn-gradient"
                  size="sm"
                  onClick={() => handleSellClick(item)}
                >
                  List
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 挂单弹窗 */}
      {isModalOpen && selectedAsset && (
        <SellOrderModal
          assetInfo={selectedAsset}
          onClose={handleModalClose}
          onSubmit={handleSellSubmit}
        />
      )}
    </div>
  );
};