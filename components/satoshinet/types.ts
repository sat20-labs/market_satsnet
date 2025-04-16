export interface AssetDetails {
  assets_name: {
    Protocol: string;
    Type: string;
    Ticker: string;
  };
  content_type: string;
  delegate: string;
  amount: string;
  unit_price: string;
  unit_amount: number;
}

export interface Order {
  order_id: number;
  address: string;
  order_type: number;
  currency: 'SAT' | 'BTC';
  price: number;
  utxo: string;
  value: number;
  assets: AssetDetails;
  order_time: number;
  result: number;
  txaddress: string;
  txid: string;
  txprice: number;
  txtime: number;
  sourcename: string;
}

export interface Activity {
  order_id: number;
  eventTypeLabel: string;
  quantity: number;
  price: number; // In sats
  totalValue: number; // In sats
  time: string;
  txid?: string;
}

export interface HistoryData {
  total: number;
  offset: number;
  order_list: Order[];
}

export interface ApiResponse {
  code: number;
  msg: string;
  data: HistoryData;
} 