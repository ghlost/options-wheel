const RISK_FREE_RATE = 0.045; // approximate US 10-yr treasury yield

function normalCDF(x: number): number {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1 + sign * y);
}

function bsPrice(
  S: number, K: number, T: number, sigma: number, type: 'call' | 'put'
): number {
  if (T <= 0 || sigma <= 0) return 0;
  const r = RISK_FREE_RATE;
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  if (type === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  }
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
}

/** Bisection solver for implied volatility. Returns 0 if no solution found. */
export function impliedVolatility(
  price: number, S: number, K: number, daysToExpiration: number, type: 'call' | 'put'
): number {
  if (price <= 0 || S <= 0 || K <= 0 || daysToExpiration <= 0) return 0;
  const T = daysToExpiration / 365;
  let low = 0.001;
  let high = 10.0;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const diff = bsPrice(S, K, T, mid, type) - price;
    if (Math.abs(diff) < 0.0001) return mid;
    if (diff > 0) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}

/**
 * Probability of profit for a SHORT option position (seller perspective).
 * Short put: probability stock closes ABOVE strike = N(d2).
 * Short call: probability stock closes BELOW strike = N(-d2).
 */
export function probabilityOfProfit(
  S: number, K: number, daysToExpiration: number, iv: number, type: 'call' | 'put'
): number {
  if (iv <= 0 || daysToExpiration <= 0) return 0;
  const T = daysToExpiration / 365;
  const r = RISK_FREE_RATE;
  const d2 = (Math.log(S / K) + (r - 0.5 * iv * iv) * T) / (iv * Math.sqrt(T));
  return type === 'put' ? normalCDF(d2) : normalCDF(-d2);
}
