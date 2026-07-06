import type { Symbol } from "@/types";

/**
 * Bundled instrument universe for the MVP symbol search.
 * Covers all asset classes from the requirements: crypto, stocks, forex,
 * commodities, indices, futures. `basePrice` seeds the deterministic mock feed.
 */
export const SYMBOLS: Symbol[] = [
  // Crypto
  { id: "BINANCE:BTCUSDT", ticker: "BTCUSDT", name: "Bitcoin / TetherUS", exchange: "BINANCE", assetClass: "crypto", basePrice: 62000 },
  { id: "BINANCE:ETHUSDT", ticker: "ETHUSDT", name: "Ethereum / TetherUS", exchange: "BINANCE", assetClass: "crypto", basePrice: 3400 },
  { id: "BINANCE:SOLUSDT", ticker: "SOLUSDT", name: "Solana / TetherUS", exchange: "BINANCE", assetClass: "crypto", basePrice: 145 },
  { id: "BINANCE:BNBUSDT", ticker: "BNBUSDT", name: "BNB / TetherUS", exchange: "BINANCE", assetClass: "crypto", basePrice: 580 },
  { id: "BINANCE:XRPUSDT", ticker: "XRPUSDT", name: "XRP / TetherUS", exchange: "BINANCE", assetClass: "crypto", basePrice: 0.52 },

  // Stocks
  { id: "NASDAQ:AAPL", ticker: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", assetClass: "stock", basePrice: 213 },
  { id: "NASDAQ:MSFT", ticker: "MSFT", name: "Microsoft Corp.", exchange: "NASDAQ", assetClass: "stock", basePrice: 448 },
  { id: "NASDAQ:NVDA", ticker: "NVDA", name: "NVIDIA Corp.", exchange: "NASDAQ", assetClass: "stock", basePrice: 124 },
  { id: "NASDAQ:TSLA", ticker: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", assetClass: "stock", basePrice: 248 },
  { id: "NASDAQ:AMZN", ticker: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", assetClass: "stock", basePrice: 185 },

  // Forex
  { id: "FX:EURUSD", ticker: "EURUSD", name: "Euro / US Dollar", exchange: "FX", assetClass: "forex", basePrice: 1.083 },
  { id: "FX:GBPUSD", ticker: "GBPUSD", name: "British Pound / US Dollar", exchange: "FX", assetClass: "forex", basePrice: 1.271 },
  { id: "FX:USDJPY", ticker: "USDJPY", name: "US Dollar / Japanese Yen", exchange: "FX", assetClass: "forex", basePrice: 161.2 },

  // Commodities
  { id: "COMEX:GOLD", ticker: "GOLD", name: "Gold Spot", exchange: "COMEX", assetClass: "commodity", basePrice: 2330 },
  { id: "NYMEX:WTI", ticker: "WTI", name: "Crude Oil WTI", exchange: "NYMEX", assetClass: "commodity", basePrice: 83.4 },

  // Indices
  { id: "SP:SPX", ticker: "SPX", name: "S&P 500 Index", exchange: "SP", assetClass: "index", basePrice: 5460 },
  { id: "NASDAQ:NDX", ticker: "NDX", name: "Nasdaq 100 Index", exchange: "NASDAQ", assetClass: "index", basePrice: 19700 },

  // Futures
  { id: "CME:ES1!", ticker: "ES1!", name: "E-mini S&P 500 Futures", exchange: "CME", assetClass: "future", basePrice: 5475 },
  { id: "CME:NQ1!", ticker: "NQ1!", name: "E-mini Nasdaq 100 Futures", exchange: "CME", assetClass: "future", basePrice: 19750 },
];

const BY_ID = new Map(SYMBOLS.map((s) => [s.id, s]));

export function getSymbol(id: string): Symbol | undefined {
  return BY_ID.get(id);
}

export function searchSymbols(query: string, limit = 20): Symbol[] {
  const q = query.trim().toLowerCase();
  if (!q) return SYMBOLS.slice(0, limit);
  return SYMBOLS.filter(
    (s) =>
      s.ticker.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.assetClass.includes(q)
  ).slice(0, limit);
}
