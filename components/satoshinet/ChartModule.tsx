import { OrderAnalyze } from './OrderAnalyze';
import React, { useMemo } from 'react';

interface ChartModuleProps {
  contractURL: string;
  tickerInfo?: any;
}


export const ChartModule = ({ contractURL, tickerInfo }: ChartModuleProps) => {


  return (
    <div className="w-full h-full bg-zinc-900/50 border-1 border-zinc-700/50 rounded-lg">
      <h2 className="text-lg font-bold text-zinc-400 ml-4 py-4">Chart for {tickerInfo?.displayname}</h2>
      <OrderAnalyze contractURL={contractURL} />
      {/* <TradingViewWidget
        symbol="BTCUSD"
        theme="dark"
        locale="en"
        autosize
      /> */}
      {/* <div className="h-full flex items-center justify-center text-gray-400">
        <p>Chart data for {ticker} will be displayed here.</p>
      </div> */}
    </div>
  );
};


