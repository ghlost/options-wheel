export interface WatchedStock {
  id: number;
  ticker: string;
  notes: string | null;
  added_at: string;
}

export interface AddStockRequest {
  ticker: string;
  notes?: string;
}
