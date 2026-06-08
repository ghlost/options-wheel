export interface StockQuote {
  ticker: string;
  price: number;
  volume: number;
  prevClose: number;
  changePercent: number;
  lastUpdated: string;
}
