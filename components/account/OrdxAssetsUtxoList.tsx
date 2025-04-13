'use client';

import React, { useState } from 'react';
import { AssetsNameSelect } from '@/components/account/AssetsNameSelect';
import { OrdxProtocolTab } from './OrdxProtocolTab';
import { AssetsList } from './AssetsList';
import { RuneAssets } from './RuneAssets';
import { NameCategoryList } from './NameCategoryList';
// import { OrdxUtxoList } from './OrdxUtxoList';

export const OrdxAssetsUtxoList = () => {
  const [assertName, setAssertName] = useState<string>('');
  const [assertCategory, setAssertCategory] = useState<string | undefined>();

  const onAssertChange = (data: string) => {
    console.log('onAssertChange', data);
    setAssertName(data);
    setAssertCategory('');
  };

  const onCategoryChange = (t: string) => {
    console.log('onCategoryChange', t);
    if (t !== assertName) {
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

  return (
    <div className="py-4">
      <div className="mb-4">
        <OrdxProtocolTab onChange={onCategoryChange} />
      </div>
        <div>
          <AssetsNameSelect onChange={onAssertChange} assets_name={assertName} />
        </div>
        {/* <NameCategoryList
          name={assertCategory}
          onChange={onAssertCategoryChange}
        /> */}
      {/* {assertType === 'rune' && <RuneAssets />} */}

      {!!assertName && (
        <AssetsList
          assets_name={assertName}
          assets_category={assertCategory}
        />
      )}
    </div>
  );
};
