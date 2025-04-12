'use client';

import { useQuery } from '@tanstack/react-query';
import { Select, SelectItem } from '@nextui-org/react';
import { getLabelForAssets } from '@/lib/utils';
import { marketApi } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useEffect, useMemo, useState } from 'react';
import { useCommonStore } from '@/store';

interface AssetsTypeListProps {
  onChange?: (ticker: string) => void;
  assets_type: string;
}
export const AssetsTypeList = ({
  onChange,
  assets_type,
}: AssetsTypeListProps) => {
  const { address } = useReactWalletStore((state) => state);
  const { chain, network } = useCommonStore();
  const [selectKey, setSelectKey] = useState('');

  const queryKey = useMemo(() => ['addressAssetsList', address, chain, network, assets_type], [address, chain, network, assets_type]);

  const { data, isLoading } = useQuery({
    queryKey: queryKey,
    queryFn: () => marketApi.getAddressAssetsList(address, assets_type),
    enabled: !!address,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const list = useMemo(() => {
    if (!data?.data) {
      return [];
    }
    return data.data.map((item: any) => ({
      name: getLabelForAssets(item.assets_name),
      ...item,
    }));
  }, [data]);

  useEffect(() => {
    if (list.length > 0) {
      const currentSelectionExists = list.some(item => item.assets_name === selectKey);
      if (!selectKey || !currentSelectionExists) {
        const newSelectKey = list[0].name;
        setSelectKey(newSelectKey);
        onChange?.(newSelectKey);
      }
    } else {
      if(selectKey !== '') {
        setSelectKey('');
        onChange?.('');
      }
    }
  }, [list, onChange, selectKey]);

  const onSelectionChange = (keys: any) => {
    const _v = Array.from(keys as Set<string>)[0];
    if (_v !== undefined) {
      setSelectKey(_v);
      onChange?.(_v);
    }
  };
  return (
    <>
      {assets_type !== 'nft' && (
        <div className="mb-4">
          <Select
            showScrollIndicators={false}
            isLoading={isLoading}
            className="w-full max-w-sm"
            selectionMode="single"
            selectedKeys={selectKey ? [selectKey] : []}
            onSelectionChange={onSelectionChange}
          >
            {list.map((item) => (
              <SelectItem key={item.name} value={item.name}>
                {`${item.name}${!!item.balance ? ` (${item.balance})` : ''}`}
              </SelectItem>
            ))}
          </Select>
        </div>
      )}
    </>
  );
};
