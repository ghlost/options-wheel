export type ContractType = 'call' | 'put';

export interface OptionContract {
  ticker: string;
  strikePrice: number;
  expirationDate: string;
  contractType: ContractType;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number | null;
  theta: number | null;
  premiumYield: number;
  volumeToOI: number;
  daysToExpiration: number;
}

export interface OptionsChain {
  ticker: string;
  underlyingPrice: number;
  calls: OptionContract[];
  puts: OptionContract[];
  fetchedAt: string;
}

export interface PolygonOptionResult {
  ticker: string;
  details: {
    strike_price: number;
    expiration_date: string;
    contract_type: ContractType;
  };
  day: { volume: number } | null;
  greeks: { delta: number; theta: number } | null;
  implied_volatility: number | null;
  open_interest: number | null;
  last_quote: { bid: number; ask: number } | null;
}

export interface PolygonOptionsResponse {
  results: PolygonOptionResult[];
  status: string;
  next_url?: string;
}
