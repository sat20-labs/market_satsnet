import dynamic from 'next/dynamic';
import { OrderAnalyze } from './OrderAnalyze';
const TradingViewWidget = dynamic(() => import('react-tradingview-widget'), {
  ssr: false,
});

interface ChartModuleProps {
  assets_name: string;
}

export const ChartModule = ({ assets_name }: ChartModuleProps) => {
  return (
    <div className="w-full h-full bg-zinc-900 rounded-lg">
      <h2 className="text-lg font-bold text-zinc-400 ml-2 py-4">Chart for {assets_name}</h2>
      <OrderAnalyze assets_name={assets_name} />
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