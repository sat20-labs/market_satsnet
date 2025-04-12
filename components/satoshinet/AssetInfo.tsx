'use client';

interface AssetInfoProps {
  assetData: {
    assetId: string;
    assetName: string;
    assetType: string;
    protocol: string;
    assetLogo: string;
    floorPrice: string;
    floorPriceUSD: string;
    volume: string;
    volumeUSD: string;
    marketCap: string;
    marketCapUSD: string;
    transactions: number;
    holders: number;
    mintProgress: string;
  };
}

export const AssetInfo = ({ assetData }: AssetInfoProps) => {
  return (
    <div className="bg-zinc-900 p-4 rounded-lg w-full h-64 sm:h-52">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:mt-4 text-left">
        {/* Volume */}
        <div>
          <span className="text-gray-400 text-sm">Volume (24H):</span>
          <p className="text-white text-lg font-bold">{assetData.volume.toLocaleString()} <span className="text-zinc-400">BTC</span></p>
          <p className="text-gray-400 text-xs">${assetData.volumeUSD.toLocaleString()}</p>
        </div>

        {/* Market Cap */}
        <div>
          <span className="text-gray-400 text-sm">Market Cap:</span>
          <p className="text-white text-lg font-bold">{assetData.marketCap.toLocaleString()} <span className="text-zinc-400">BTC</span></p>
          <p className="text-gray-400 text-xs">${assetData.marketCapUSD.toLocaleString()}</p>
        </div>

        {/* Transactions */}
        <div>
          <span className="text-gray-400 text-sm">Transactions:</span>
          <p className="text-white text-lg font-bold">{assetData.transactions.toLocaleString()}</p>
        </div>

        {/* Holders */}
        <div>
          <span className="text-gray-400 text-sm">Holders:</span>
          <p className="text-white text-lg font-bold">{assetData.holders.toLocaleString()}</p>
        </div>
      </div>

      {/* Mint Progress */}
      <div className="mt-4">
        <span className="text-gray-400 text-sm">Mint Progress</span>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
          <div
            className="bg-green-500 h-2 rounded-full"
            style={{ width: assetData.mintProgress }}
          ></div>
        </div>
        <p className="text-white text-sm mt-1 text-center">{assetData.mintProgress}</p>
      </div>
    </div>
  );
};