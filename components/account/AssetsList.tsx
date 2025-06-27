'use client';

import { useMemo, useState } from 'react';
import SellOrderModal from './SellOrderModal'; // 引入挂单弹窗组件
import { AssetItem } from '@/store/asset';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@nextui-org/react';


interface AssetListProps {
  assets: AssetItem[];
  // onListClick?: (assetId: string) => void;
}

export const AssetsList = ({ assets }: AssetListProps) => {
  const { t, ready } = useTranslation();

  const [isModalOpen, setIsModalOpen] = useState(false); // 控制弹窗显示状态
  const [selectedAsset, setSelectedAsset] = useState<any>(null); // 当前选中的资产
  const [tickerInfo, setTickerInfo] = useState<any>(null); // 当前选中的资产
  const columns = [
    { key: 'name', label: t('common.assets_name') },
    { key: 'balance', label: t('common.balance') },
    { key: 'price', label: t('common.price') },
  ];



  // 打开挂单弹窗
  const handleSellClick = (asset: any) => {
    const selected = {
      assetName: asset.key,
    };
    const tickerInfo = {
      displayname: asset.label,
    }
    setTickerInfo(tickerInfo);
    //console.log("tickerInfo", tickerInfo);

    // console.log("Selected Asset:", selected); // 调试日志
    setSelectedAsset(selected);
    setIsModalOpen(true);
  };

  return (

    <div className='bg-zinc-950/50 text-zinc-200 rounded-xl shadow-lg py-2'>
      <Table aria-label="Assets List Table" cellPadding={0} cellSpacing={0} className="w-full  bg-zinc-950/50 rounded-lg shadow-md border-collapse">
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.key}
              align={column.key === 'action' || column.key === 'price' ? 'end' : 'start'}
              className={column.key === 'action' || column.key === 'price' ? 'h-12 px-11 text-right bg-zinc-900' : 'text-left pl-6 bg-zinc-900'}
            >
              {column.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody items={assets} emptyContent={'No assets found.'}>
          {(asset) => (
            <TableRow
              key={asset.id}
              className="hover:bg-accent/50 cursor-pointer border-b-1 border-zinc-800"
            >
              <TableCell>
                <div className="flex items-center text-sm md:text-base">
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarFallback className="text-xl text-gray-300 font-medium bg-zinc-800">
                      {typeof asset.label === 'string' ? asset.label.slice(0, 1).toUpperCase() : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-zinc-300 ml-1">{asset.label}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-zinc-300">{asset.amount}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-sm text-gray-400">-</span>
              </TableCell>
              {/* <TableCell className="text-right">
                <Button
                  size="sm"
                  color="secondary"
                  variant="outline"
                  className="text-sm w-20 mx-2 px-4"
                  // onPress={() => onListClick?.(asset.key)}
                  onClick={() => handleSellClick(asset)} // 打开挂单弹窗
                >
                  {t('common.list')}
                </Button>
              </TableCell> */}
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* 挂单弹窗 */}
      {/* {isModalOpen && selectedAsset && (
        <SellOrderModal
          assetInfo={selectedAsset}
          open={isModalOpen}
          tickerInfo={tickerInfo}
          onOpenChange={setIsModalOpen}
        />
      )} */}
    </div>
  );
};
