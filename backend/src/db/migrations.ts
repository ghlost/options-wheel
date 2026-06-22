import db from './client.js';

export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS watched_stocks (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker   TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      notes    TEXT,
      added_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_cache (
      cache_key   TEXT    PRIMARY KEY,
      data        TEXT    NOT NULL,
      cached_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      ttl_seconds INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_watched_stocks_ticker ON watched_stocks(ticker);
    CREATE INDEX IF NOT EXISTS idx_api_cache_cached_at ON api_cache(cached_at);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id                       INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_symbol          TEXT    NOT NULL,
      underlying_ticker        TEXT    NOT NULL COLLATE NOCASE,
      contract_type            TEXT    NOT NULL CHECK(contract_type IN ('call','put')),
      strike_price             REAL    NOT NULL,
      expiration_date          TEXT    NOT NULL,
      quantity                 INTEGER NOT NULL DEFAULT 1,
      open_price               REAL    NOT NULL,
      underlying_price_at_open REAL    NOT NULL,
      opened_at                TEXT    NOT NULL DEFAULT (datetime('now')),
      notes                    TEXT,
      status                   TEXT    NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
      close_price              REAL,
      closed_at                TEXT
    );

    CREATE TABLE IF NOT EXISTS price_snapshots (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id         INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
      snapshot_date    TEXT    NOT NULL DEFAULT (date('now')),
      bid              REAL    NOT NULL,
      ask              REAL    NOT NULL,
      underlying_price REAL    NOT NULL,
      UNIQUE(trade_id, snapshot_date)
    );

    CREATE INDEX IF NOT EXISTS idx_trades_status     ON trades(status);
    CREATE INDEX IF NOT EXISTS idx_trades_underlying ON trades(underlying_ticker);
    CREATE INDEX IF NOT EXISTS idx_snapshots_trade   ON price_snapshots(trade_id);
  `);

  // Additive column migrations (safe to re-run)
  try { db.exec(`ALTER TABLE price_snapshots ADD COLUMN open_interest INTEGER`); } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE watched_stocks ADD COLUMN shares_owned INTEGER NOT NULL DEFAULT 0`); } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE watched_stocks ADD COLUMN avg_cost REAL`); } catch { /* already exists */ }

  console.log('[db] Migrations complete');
}
