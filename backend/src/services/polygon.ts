import { cacheGet, cacheSet } from '../cache/memoryCache.js';
import type { StockQuote } from '../../../shared/types/quote.js';
import type { OptionsChain, OptionContract } from '../../../shared/types/options.js';
import { impliedVolatility } from '../../../shared/utils/blackScholes.js';

const NASDAQ_BASE = 'https://api.nasdaq.com/api';
const QUOTE_TTL = 15 * 60;
const OPTIONS_TTL = 4 * 60 * 60;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://www.nasdaq.com/',
};

// Cache asset class per ticker to avoid re-probing
const assetClassMap = new Map<string, 'stocks' | 'etf'>();
const inFlight = new Map<string, Promise<unknown>>();

function parseNum(val: string | null | undefined): number {
  if (!val || val === '--' || val === 'N/A') return 0;
  return parseFloat(val.replace(/[$,%+\s]/g, '')) || 0;
}

function parseVol(val: string | null | undefined): number {
  if (!val || val === '--' || val === 'N/A') return 0;
  return parseInt(val.replace(/,/g, ''), 10) || 0;
}

async function nasdaqFetch<T>(path: string): Promise<T> {
  const url = `${NASDAQ_BASE}${path}`;
  const existing = inFlight.get(url);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    console.log(`[nasdaq] Fetching: ${url}`);
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Nasdaq ${res.status}: ${text}`);
    }
    const json = await res.json() as { data: T | null; status: { rCode: number; bCodeMessage?: Array<{ errorMessage: string }> } };
    if (!json.data) {
      const msg = json.status.bCodeMessage?.[0]?.errorMessage ?? 'No data';
      throw new Error(`Nasdaq API error: ${msg}`);
    }
    return json.data;
  })().finally(() => inFlight.delete(url));

  inFlight.set(url, promise);
  return promise;
}

async function getAssetClass(ticker: string): Promise<'stocks' | 'etf'> {
  if (assetClassMap.has(ticker)) return assetClassMap.get(ticker)!;
  try {
    await nasdaqFetch(`/quote/${ticker}/info?assetclass=stocks`);
    assetClassMap.set(ticker, 'stocks');
    return 'stocks';
  } catch {
    assetClassMap.set(ticker, 'etf');
    return 'etf';
  }
}

export async function fetchStockQuote(ticker: string): Promise<StockQuote> {
  const key = `quote:${ticker.toUpperCase()}`;
  const cached = cacheGet<StockQuote>(key);
  if (cached) {
    console.log(`[cache] L1 hit: ${key}`);
    return cached;
  }

  const assetClass = await getAssetClass(ticker.toUpperCase());

  interface NasdaqQuoteData {
    primaryData: {
      lastSalePrice: string;
      netChange: string;
      percentageChange: string;
      volume: string;
    };
  }

  const data = await nasdaqFetch<NasdaqQuoteData>(
    `/quote/${ticker.toUpperCase()}/info?assetclass=${assetClass}`
  );

  const price = parseNum(data.primaryData.lastSalePrice);
  const netChange = parseNum(data.primaryData.netChange);
  const prevClose = price - netChange;

  const quote: StockQuote = {
    ticker: ticker.toUpperCase(),
    price,
    volume: parseVol(data.primaryData.volume),
    prevClose,
    changePercent: parseNum(data.primaryData.percentageChange),
    lastUpdated: new Date().toISOString(),
  };

  cacheSet(key, quote, QUOTE_TTL);
  return quote;
}

function calcDTE(expirationDate: string): number {
  const exp = new Date(expirationDate).getTime();
  return Math.max(0, Math.round((exp - Date.now()) / (1000 * 60 * 60 * 24)));
}

function calcPremiumYield(bid: number, strike: number, currentPrice: number, contractType: 'call' | 'put'): number {
  if (contractType === 'put') return strike > 0 ? (bid / strike) * 100 : 0;
  return currentPrice > 0 ? (bid / currentPrice) * 100 : 0;
}

interface NasdaqRow {
  expirygroup: string;
  expiryDate: string | null;
  strike: string | null;
  c_Bid: string | null;
  c_Ask: string | null;
  c_Volume: string | null;
  c_Openinterest: string | null;
  p_Bid: string | null;
  p_Ask: string | null;
  p_Volume: string | null;
  p_Openinterest: string | null;
}

interface NasdaqOptionsData {
  totalRecord: number;
  table: { rows: NasdaqRow[] };
}

export async function fetchOptionsChainForDates(
  ticker: string,
  currentPrice: number,
  from: string,
  to: string,
): Promise<OptionsChain> {
  const key = `options:${ticker.toUpperCase()}:${from}:${to}`;
  const cached = cacheGet<OptionsChain>(key);
  if (cached) {
    console.log(`[cache] L1 hit: ${key}`);
    return cached;
  }

  const assetClass = await getAssetClass(ticker.toUpperCase());
  const data = await nasdaqFetch<NasdaqOptionsData>(
    `/quote/${ticker.toUpperCase()}/option-chain?assetclass=${assetClass}&limit=1000&fromdate=${from}&todate=${to}&type=all`
  );

  const calls: OptionContract[] = [];
  const puts: OptionContract[] = [];
  let currentExpiry = '';

  for (const row of data.table.rows) {
    if (row.expirygroup) {
      const parsed = new Date(row.expirygroup);
      if (!isNaN(parsed.getTime())) currentExpiry = parsed.toISOString().slice(0, 10);
      continue;
    }
    if (!row.strike || !currentExpiry) continue;

    const strike = parseNum(row.strike);
    const dte = calcDTE(currentExpiry);
    const baseKey = `${ticker.toUpperCase()}-${currentExpiry}-${strike}`;

    const callAsk = parseNum(row.c_Ask);
    const callBid = (parseNum(row.c_Bid) + callAsk) / 2;
    const callIV = impliedVolatility(callBid, currentPrice, strike, dte, 'call');
    calls.push({
      ticker: `${baseKey}-C`,
      strikePrice: strike,
      expirationDate: currentExpiry,
      contractType: 'call',
      bid: callBid,
      ask: callAsk,
      volume: parseVol(row.c_Volume),
      openInterest: parseVol(row.c_Openinterest),
      impliedVolatility: callIV,
      delta: null,
      theta: null,
      premiumYield: calcPremiumYield(callBid, strike, currentPrice, 'call'),
      volumeToOI: parseVol(row.c_Openinterest) > 0 ? parseVol(row.c_Volume) / parseVol(row.c_Openinterest) : 0,
      daysToExpiration: dte,
    });

    const putAsk = parseNum(row.p_Ask);
    const putBid = (parseNum(row.p_Bid) + putAsk) / 2;
    const putIV = impliedVolatility(putBid, currentPrice, strike, dte, 'put');
    puts.push({
      ticker: `${baseKey}-P`,
      strikePrice: strike,
      expirationDate: currentExpiry,
      contractType: 'put',
      bid: putBid,
      ask: putAsk,
      volume: parseVol(row.p_Volume),
      openInterest: parseVol(row.p_Openinterest),
      impliedVolatility: putIV,
      delta: null,
      theta: null,
      premiumYield: calcPremiumYield(putBid, strike, currentPrice, 'put'),
      volumeToOI: parseVol(row.p_Openinterest) > 0 ? parseVol(row.p_Volume) / parseVol(row.p_Openinterest) : 0,
      daysToExpiration: dte,
    });
  }

  const chain: OptionsChain = {
    ticker: ticker.toUpperCase(),
    underlyingPrice: currentPrice,
    calls,
    puts,
    fetchedAt: new Date().toISOString(),
  };

  cacheSet(key, chain, OPTIONS_TTL);
  return chain;
}

export async function fetchOptionsChain(ticker: string, currentPrice: number): Promise<OptionsChain> {
  const now = Date.now();
  const from = new Date(now + 28 * 86400 * 1000).toISOString().slice(0, 10);
  const to = new Date(now + 60 * 86400 * 1000).toISOString().slice(0, 10);
  return fetchOptionsChainForDates(ticker, currentPrice, from, to);
}
