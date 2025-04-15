'use client';

import { memo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

import { AssetItem } from '@/store/asset';

interface Props {
  assets: AssetItem[];
  onListClick?: (assetId: string) => void;
}

export const AssetsList = memo(function AssetsList({ assets, onListClick }: Props) {
  return (
    <Table>
      <TableHeader>
        {/* Define TableHead directly */}
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      {/* Map assets directly in TableBody */}
      <TableBody>
        {assets && assets.length > 0 ? (
          assets.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{asset.label}</span>
                </div>
              </TableCell>
              <TableCell>{asset.amount}</TableCell>
              <TableCell className="text-right">
                <span className="text-sm text-gray-400">-</span>
              </TableCell>
              <TableCell className="text-right">
                {/* Use Shadcn Button and onClick */}
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onListClick?.(asset.key)}
                >
                  List
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          // Handle empty state within TableBody
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
              No assets found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
});
