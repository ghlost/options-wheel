import type { OptionContract } from './options.js';

export interface Recommendation {
  ticker: string;
  underlyingPrice: number;
  contract: OptionContract;
  probabilityOfProfit: number;
  score: number;
}
