'use client';

import { memo } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
} from '@nextui-org/react';

import { AssetItem } from '@/store/asset';

interface Props {
  assets: AssetItem[];
  onListClick?: (assetId: string) => void;
}

export const AssetsList = memo(function AssetsList({ assets, onListClick }: Props) {


  console.log('assets', assets);
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'balance', label: 'Balance' },
    { key: 'price', label: 'Price' },
    { key: 'action', label: 'Action' },
  ];

  return (
    <Table aria-label="Assets List Table">
      <TableHeader columns={columns}>
        {(column) => (
          <TableColumn
            key={column.key}
            align={column.key === 'action' || column.key === 'price' ? 'end' : 'start'}
            className={column.key === 'action' || column.key === 'price' ? 'text-right' : ''}
          >
            {column.label}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody items={assets} emptyContent={'No assets found.'}>
        {(asset) => (
          <TableRow key={asset.id}>
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
                onPress={() => onListClick?.(asset.key)}
              >
                List
              </Button>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
});
