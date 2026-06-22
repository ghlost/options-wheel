export interface WatchedStock {
  id: number;
  ticker: string;
  notes: string | null;
  added_at: string;
  shares_owned: number;
  avg_cost: number | null;
}

export interface AddStockRequest {
  ticker: string;
  notes?: string;
}
