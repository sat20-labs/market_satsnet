'use client';

import React, { useState } from 'react';
import { AssetsTypeList } from '@/components/account/AssetsTypeList';
import { OrdxCategoryTab } from './OrdxCategoryTab';
import { AssetsList } from './AssetsList';
import { RuneAssets } from './RuneAssets';
import { NameCategoryList } from './NameCategoryList';
// import { OrdxUtxoList } from './OrdxUtxoList';

export const OrdxAssetsUtxoList = () => {
  const [assertType, setAssertType] = useState<string>('ticker');
  const [assertName, setAssertName] = useState<string>('');
  const [assertCategory, setAssertCategory] = useState<string | undefined>();

  const onAssertChange = (data: string) => {
    console.log('onAssertChange', data);
    setAssertName(data);
    setAssertCategory('');
  };

  const onCategoryChange = (t: string) => {
    console.log('onCategoryChange', t);
    if (t !== assertType) {
      setAssertType(t);
      setAssertCategory('');
      if (t === 'rune') {
        setAssertName('');
      }
    }
  };

  const onAssertCategoryChange = (t?: string) => {
    console.log('onAssertCategoryChange', t);
    setAssertCategory(t);
  };

  console.log('assertType', assertType);
  console.log('assertName', assertName);
  console.log('assertCategory', assertCategory);

  return (
    <div className="py-4">
      <div className="mb-4">
        <OrdxCategoryTab onChange={onCategoryChange} />
      </div>
      {assertType !== 'rune' && (
        <div>
          <AssetsTypeList onChange={onAssertChange} assets_type={assertType} />
        </div>
      )}
      {assertType === 'ns' && (
        <NameCategoryList
          name={assertCategory}
          onChange={onAssertCategoryChange}
        />
      )}
      {assertType === 'rune' && <RuneAssets />}

      {!!assertType && !!assertName && (
        <AssetsList
          assets_name={assertName}
          assets_type={assertType}
          assets_category={assertCategory}
        />
      )}
    </div>
  );
};
