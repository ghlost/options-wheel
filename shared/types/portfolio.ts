export interface Trade {
  id: number;
  contract_symbol: string;
  underlying_ticker: string;
  contract_type: 'call' | 'put';
  strike_price: number;
  expiration_date: string;
  quantity: number;
  open_price: number;
  underlying_price_at_open: number;
  opened_at: string;
  notes: string | null;
  status: 'open' | 'closed';
  close_price: number | null;
  closed_at: string | null;
}

export interface PriceSnapshot {
  id: number;
  trade_id: number;
  snapshot_date: string;
  bid: number;
  ask: number;
  underlying_price: number;
  open_interest: number | null;
}

export interface TradeWithSnapshots extends Trade {
  snapshots: PriceSnapshot[];
  latest_bid: number | null;
  latest_ask: number | null;
  latest_underlying_price: number | null;
  latest_open_interest: number | null;
  dte_remaining: number;
  days_held: number;
  premium_received: number;
  cash_reserved: number;
  unrealized_pnl: number | null;
  unrealized_pnl_pct: number | null;
  annualized_return: number | null;
}

export interface AddTradeRequest {
  contract_symbol: string;
  underlying_ticker: string;
  contract_type: 'call' | 'put';
  strike_price: number;
  expiration_date: string;
  quantity: number;
  open_price: number;
  underlying_price_at_open: number;
  notes?: string;
}

export interface CloseTradeRequest {
  close_price: number;
}

export interface SnapshotInput {
  trade_id: number;
  bid: number;
  ask: number;
  underlying_price: number;
  open_interest?: number | null;
}

export interface ContractPriceResponse {
  bid: number;
  ask: number;
  underlying_price: number;
  expired: boolean;
}
