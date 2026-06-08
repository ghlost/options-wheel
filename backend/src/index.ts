import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/migrations.js';
import stocksRouter from './routes/stocks.js';
import quoteRouter from './routes/quote.js';
import optionsRouter from './routes/options.js';
import cacheRouter from './routes/cache.js';
import portfolioRouter from './routes/portfolio.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use('/api/stocks', stocksRouter);
app.use('/api/stocks/:ticker/quote', quoteRouter);
app.use('/api/stocks/:ticker/options', optionsRouter);
app.use('/api/cache', cacheRouter);
app.use('/api/portfolio', portfolioRouter);

app.use(errorHandler);

runMigrations();

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
