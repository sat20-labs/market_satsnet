'use client';

import { Select, SelectItem, SelectedItems } from '@nextui-org/react';
import { useEffect, useMemo, useState } from 'react';

interface NameCategoryListProps {
  onChange?: (ticker: string) => void;
  isLoading?: boolean;
  list: { label: string; value: string; count?: number }[];
  selected?: string;
  placeholder?: string;
}

export const CategorySelect = ({
  isLoading,
  onChange,
  selected: s,
  list = [],
  placeholder,
}: NameCategoryListProps) => {
  const onSelectionChange = (keys: any) => {
    const _v = Array.from(keys.values())[0] as string;
    onChange?.(_v);
  };

  const selectKeys = useMemo(() => {
    return s !== undefined ? [s] : undefined;
  }, [s]);

  return (
    <Select
      items={list}
      size="sm"
      showScrollIndicators={false}
      isLoading={isLoading}
      className="w-60 max-w-full"
      label={placeholder}
      // placeholder={placeholder}
      selectionMode="single"
      selectedKeys={selectKeys}
      onSelectionChange={onSelectionChange}
      renderValue={(items: SelectedItems<any>) => {
        return items.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <span>{item.data?.label}</span>
            {!!item.data?.count && (
              <span className="">({item.data?.count})</span>
            )}
          </div>
        ));
      }}
    >
      {(item) => (
        <SelectItem key={item.value}>
          {item.label}
          {!!item?.count && (
            <span className="text-xs text-gray-500">({item?.count})</span>
          )}
        </SelectItem>
      )}
    </Select>
  );
};
