'use client';

import React, { useState } from 'react';
import { NewAssetsList } from './NewAssetsList';

export const OrdxAssetsUtxoList = () => {
  const [assertType, setAssertType] = useState<string>('ticker');
  const [assertName, setAssertName] = useState<string>('');
  const [assertCategory, setAssertCategory] = useState<string | undefined>();


  // const onAssertChange = (data: string) => {
  //   console.log('onAssertChange', data);
  //   setAssertName(data);
  //   setAssertCategory('');
  // };

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
    <div className="py-4 rounded-lg">
      <div className="mb-4">
      </div>
      {assertType !== 'rune' && (
        // <div>
        //   <AssetsTypeList onChange={onAssertChange} assets_type={assertType} />
        // </div>
        <div>
          <NewAssetsList  assets_type={assertType} />
        </div>
      )}

      {/* {!!assertType && !!assertName && (
        <AssetsList
          assets_name={assertName}
          assets_type={assertType}
          assets_category={assertCategory}
        />
      )} */}

      {/* {!!assertType && !!assertName && (
        <AssetsList
          assets_name={assertName}
          assets_type={assertType}
          assets_category={assertCategory}
        />
      )}
    </div>
  );
}; */}

{/* {!!assertType && (
        <div className="bg-zinc-900 rounded-lg shadow-md">
          <div className="grid grid-cols-4 text-sm font-medium text-zinc-400 border-b border-zinc-800 px-4 py-2">
            <div>Name</div>
            <div className="text-right">Balance</div>
            <div className="text-right">Price</div>
            <div className="text-right">Action</div>
          </div>
          {assets.map((asset, index) => (
            <div
              key={index}
              className="grid grid-cols-4 items-center text-sm text-zinc-200 border-b border-zinc-800 px-4 py-2 hover:bg-zinc-800"
            >
              <div>
                <div className="font-medium">{asset.name} ({asset.symbol})</div>
                <div className="text-xs text-zinc-400">{asset.id}</div>
              </div>
              <div className="text-right">{asset.balance.toLocaleString()}</div>
              <div className="text-right">
                {asset.priceBTC.toFixed(6)} BTC
                <div className="text-xs text-zinc-400">${asset.priceUSD.toFixed(4)}</div>
              </div>
              <div className="text-right">
                <button className="px-3 py-1 text-xs font-medium text-blue-500 border border-blue-500 rounded hover:bg-blue-500 hover:text-white">
                  List
                </button>
              </div>
            </div>
          ))}
        </div>
      )} */}
    </div>
  );
};
