# options-wheel — Options Wheel Screener

A local stock screener for the options wheel strategy (covered calls + cash-secured puts). Pulls EOD data from Polygon.io, calculates premium yield % and Volume/OI ratios, and stores your watchlist in a local SQLite database.

## Setup

### 1. Get a free Polygon.io API key

Sign up at https://polygon.io — the free tier includes options chain data (end-of-day).

### 2. Configure the backend

```bash
cp .env.example backend/.env
```

Edit `backend/.env` and add your key:

```
POLYGON_API_KEY=your_key_here
PORT=3001
```

### 3. Install and run

```bash
nvm use 24   # requires Node 24+
npm install
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3001

## How it works

- Add tickers in the sidebar — each card shows the EOD quote and options chain
- The **Puts** tab shows cash-secured put candidates; **Calls** shows covered call candidates
- **Yield%** = `bid / strike` for puts, `bid / current price` for calls — sorted highest first by default
- **V/OI** = volume / open interest — higher means more active trading relative to outstanding contracts
- All data is cached for 24 hours (EOD only on free tier). Click the **↺ refresh** button on a card to force a fresh fetch after market close.

## Data notes

- Polygon free tier = end-of-day data, delayed 15 min during market hours
- Options window: 28–60 days to expiration
- Rate limit: 5 API calls/minute — the backend queues requests automatically
