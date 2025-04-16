'use client';

// import useSWR from 'swr';
import { useMemo, useState } from 'react';
import SellOrderModal from './SellOrderModal'; // 引入挂单弹窗组件
import { AssetItem } from '@/store/asset';
import { Button } from "@/components/ui/button";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@nextui-org/react';


interface NewAssetListProps {
  // assets_type: string; // 资产类型
  assets: AssetItem[];
  // onListClick?: (assetId: string) => void;
}

export const NewAssetsList = ({ assets }: NewAssetListProps) => {

  const [isModalOpen, setIsModalOpen] = useState(false); // 控制弹窗显示状态
  const [selectedAsset, setSelectedAsset] = useState<any>(null); // 当前选中的资产

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'balance', label: 'Balance' },
    { key: 'price', label: 'Price' },
    { key: 'action', label: 'Action' },
  ];



  // 打开挂单弹窗
  const handleSellClick = (asset: any) => {
    const selected = {
      assetName: asset.label,
      assetBalance: asset.amount,
    };
    console.log("Selected Asset:", selected); // 调试日志
    setSelectedAsset(selected);
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
    // mutate(); // 刷新资产列表
  };

  return (

    <div>
    <Table aria-label="Assets List Table" className="w-full bg-zinc-900 rounded-xl  shadow-md">
      <TableHeader columns={columns} >
        {(column) => (
          <TableColumn
            key={column.key}
            align={column.key === 'action' || column.key === 'price' ? 'end' : 'start'}
            className={column.key === 'action' || column.key === 'price' ? 'text-right bg-accent' : 'text-left bg-accent'}
          >
            {column.label}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody items={assets} emptyContent={'No assets found.'}>
        {(asset) => (
          
          <TableRow key={asset.id} className="hover:bg-zinc-700/50 text-gray-300">
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium text-white">{asset.label}</span>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-white">{asset.amount}</span>
            </TableCell>
            <TableCell className="text-right">
              <span className="text-sm text-gray-400">-</span>
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                color="primary"      
                variant="ghost"
                className="text-sm text-gray-400 btn-gradient rounded-xl"
                // onPress={() => onListClick?.(asset.key)}
                onClick={() => handleSellClick(asset)} // 打开挂单弹窗
              >
                List
              </Button>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>   
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
