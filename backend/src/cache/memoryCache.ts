import db from '../db/client.js';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memory = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  // L1: memory
  const mem = memory.get(key);
  if (mem && Date.now() < mem.expiresAt) {
    return mem.data as T;
  }

  // L2: SQLite
  const row = db.prepare(
    `SELECT data, cached_at, ttl_seconds FROM api_cache WHERE cache_key = ?`
  ).get(key) as unknown as { data: string; cached_at: string; ttl_seconds: number } | undefined;

  if (row) {
    const cachedMs = new Date(row.cached_at).getTime();
    const expiresAt = cachedMs + row.ttl_seconds * 1000;
    if (Date.now() < expiresAt) {
      const parsed = JSON.parse(row.data) as T;
      memory.set(key, { data: parsed, expiresAt });
      console.log(`[cache] L2 hit: ${key}`);
      return parsed;
    }
  }

  return null;
}

export function cacheSet<T>(key: string, data: T, ttlSeconds: number): void {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  memory.set(key, { data, expiresAt });

  db.prepare(
    `INSERT OR REPLACE INTO api_cache (cache_key, data, cached_at, ttl_seconds)
     VALUES (?, ?, datetime('now'), ?)`
  ).run(key, JSON.stringify(data), ttlSeconds);
}

export function cacheDelete(pattern: string): void {
  // Delete all keys matching prefix
  for (const key of memory.keys()) {
    if (key.startsWith(pattern)) memory.delete(key);
  }
  db.prepare(`DELETE FROM api_cache WHERE cache_key LIKE ?`).run(`${pattern}%`);
}

// Sliding-window rate limit queue: max 5 calls per 60 seconds
interface QueueTask {
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

const queue: QueueTask[] = [];
const callTimestamps: number[] = [];
let draining = false;

export async function enqueuePolygonCall<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({ fn: fn as () => Promise<unknown>, resolve: resolve as (v: unknown) => void, reject });
    if (!draining) drain();
  });
}

async function drain(): Promise<void> {
  draining = true;
  while (queue.length > 0) {
    const now = Date.now();
    const windowStart = now - 60_000;
    // Remove timestamps outside the rolling 60s window
    while (callTimestamps.length > 0 && callTimestamps[0] < windowStart) {
      callTimestamps.shift();
    }
    if (callTimestamps.length >= 5) {
      const waitMs = callTimestamps[0] - windowStart + 100;
      console.log(`[rate-limit] Quota reached, waiting ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }
    const task = queue.shift()!;
    callTimestamps.push(Date.now());
    try {
      task.resolve(await task.fn());
    } catch (e) {
      task.reject(e);
    }
  }
  draining = false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
