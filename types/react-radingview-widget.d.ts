declare module 'react-tradingview-widget' {
    import React from 'react';
  
    interface TradingViewWidgetProps {
      symbol?: string;
      theme?: 'light' | 'dark';
      locale?: string;
      autosize?: boolean;
      width?: string | number;
      height?: string | number;
      interval?: string;
      timezone?: string;
      style?: string;
      toolbar_bg?: string;
      enable_publishing?: boolean;
      allow_symbol_change?: boolean;
      hide_side_toolbar?: boolean;
      withdateranges?: boolean;
      hide_top_toolbar?: boolean;
      save_image?: boolean;
      studies?: string[];
    }
  
    const TradingViewWidget: React.FC<TradingViewWidgetProps>;
    export default TradingViewWidget;
  }