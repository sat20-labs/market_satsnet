import { Icon } from '@iconify/react';
import { BtcPrice } from '../BtcPrice';

export const OrderAssetInfo = ({ item, asset, assets_type }) => (
  <>
    <div
      className={`flex-1 flex items-center justify-between gap-4 font-bold mb-1 sm:md-2 ${assets_type === 'ns' ? 'mb-4' : ''}`}
    >
      <div className="flex">
        {item.currency === 'BTC' && (
          <Icon icon="cryptocurrency-color:btc" className="mr-1 mt-0.5" />
        )}
        <span className="text-sm text-gray-400">{item?.price}</span>
      </div>
      <div className="flex">
        <span className="text-sm text-gray-500">
          $<BtcPrice btc={item?.price} />
        </span>
      </div>
    </div>
    {assets_type !== 'ns' && (
      <div className="flex-1 flex items-center justify-between gap-4 md:mb-2 text-[10px] md:text-xs mb-1">
        <div className="flex items-center">
          {item.currency === 'BTC' && (
            <Icon icon="cryptocurrency-color:btc" className="mr-1 mt-0.5" />
          )}
          <span className="font-bold text-amber-400">
            {(asset?.unit_price / asset?.unit_amount).toFixed(2)}
          </span>
          <span className="font-mono text-gray-100">
            &nbsp;sats/{asset?.assets_name}
          </span>
        </div>
      </div>
    )}
  </>
);
