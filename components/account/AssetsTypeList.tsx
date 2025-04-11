'use client';

import useSWR from 'swr';
import { Select, SelectItem, Tabs, Tab } from '@nextui-org/react';
import { getLabelForAssets } from '@/lib/utils';
import { getAddressAssetsList } from '@/api';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { useEffect, useMemo, useState } from 'react';
import { useCommonStore } from '@/store';

import { useRouter } from 'next/navigation';

interface AssetsTypeListProps {
  onChange?: (ticker: string) => void;
  assets_type: string;
}
export const AssetsTypeList = ({
  onChange,
  assets_type,
}: AssetsTypeListProps) => {
  const { address, network } = useReactWalletStore((state) => state);
  const { chain } = useCommonStore();
  const [selectKey, setSelectKey] = useState('');

  const swrKey = useMemo(() => {
    return `/ordx/getAddressAssetsList-${address}-${chain}-${network}-${assets_type}`;
  }, [address, network, assets_type]);

  const { data, isLoading, mutate } = useSWR(
    swrKey,
    () => getAddressAssetsList(address, assets_type),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const list = useMemo(() => {
    if (!data?.data) {
      return [];
    }
    let ret = data?.data;
    return ret;
  }, [data]);
  useEffect(() => {
    if (list.length > 0) {
      setSelectKey(list[0].assets_name);
      onChange?.(list[0].assets_name);
    }
  }, [list]);

  const onSelectionChange = (keys: any) => {
    const _v = Array.from(keys.values())[0] as string;
    setSelectKey(_v);
    onChange?.(_v);
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
            selectedKeys={[selectKey]}
            onSelectionChange={onSelectionChange}
          >
            {list.map((item) => (
              <SelectItem key={item.assets_name} value={item.assets_name}>
                {`${getLabelForAssets(item.assets_name, assets_type)}${!!item.balance ? `(${item.balance})` : ''}`}
              </SelectItem>
            ))}
          </Select>
        </div>
      )}
    </>
  );
};
