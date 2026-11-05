import catalog from "./xstocks.json";

export const SOL_MINT = "So11111111111111111111111111111111111111112";

export const EXPLORER = "https://solscan.io";

export const PROTOCOL_FEE = {
  baseBps: 100,
  tier1Bps: 100,
  tier2Bps: 100,
  tier1Threshold: 0n,
  tier2Threshold: 0n,
} as const;

export const EXPIRY_DAYS = 30;

export type Stock = {
  symbol: string;
  name: string;
  /** xStock mint on Solana. */
  address: string;
  /** Same mint. Used to load the live USD price. */
  feed: string;
  decimals: number;
  /** Onchain symbol, for example NVDAx. */
  tokenSymbol: string;
  icon?: string | null;
};

/**
 * Every Solana xStock from the issuer list (api.xstocks.fi).
 * Mints are the official Xs tokens, not lookalike pump tokens.
 * Popular names are first. The rest are alphabetical.
 */
export const STOCKS: Stock[] = catalog as Stock[];

/** The names shown on the home screen. The full list is on Send. */
export const FEATURED_SYMBOLS = [
  "NVDA",
  "AAPL",
  "TSLA",
  "MSFT",
  "GOOGL",
  "AMZN",
  "META",
  "AMD",
  "AVGO",
  "NFLX",
  "COIN",
  "SPCX",
] as const;

export const stockBySymbol = (symbol: string) =>
  STOCKS.find((s) => s.symbol.toLowerCase() === symbol.toLowerCase()) ?? null;

export const FEATURED_STOCKS = FEATURED_SYMBOLS.map((symbol) => stockBySymbol(symbol)).filter(
  (stock): stock is Stock => stock !== null,
);

export const stockByAddress = (address: string) =>
  STOCKS.find((s) => s.address === address) ?? null;

export function isListedMint(mint: string): boolean {
  return STOCKS.some((s) => s.address === mint);
}
