'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const selectedItem = useMemo(() => {
    return list.find(item => item.value === s);
  }, [s, list]);

  return (
    <Select
      value={s}
      onValueChange={onChange}
      disabled={isLoading}
    >
      <SelectTrigger className="w-60 max-w-full">
        <SelectValue placeholder={placeholder}>
          {selectedItem ? (
            <div className="flex items-center gap-1">
              <span>{selectedItem.label}</span>
              {!!selectedItem.count && (
                <span className="text-xs text-gray-500">({selectedItem.count})</span>
              )}
            </div>
          ) : (
            placeholder
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {list.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            <div className="flex items-center justify-between w-full">
              <span>{item.label}</span>
              {!!item?.count && (
                <span className="text-xs text-gray-500 ml-2">({item?.count})</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
