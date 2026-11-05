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
 * xStocks issued on Solana. Mints are the Xs-prefixed tokens Jupiter
 * lists under these names, not lookalike pump tokens.
 */
export const STOCKS: Stock[] = [
  { symbol: "NVDA", name: "NVIDIA", tokenSymbol: "NVDAx", decimals: 8, address: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh", feed: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh" },
  { symbol: "AAPL", name: "Apple", tokenSymbol: "AAPLx", decimals: 8, address: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp", feed: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp" },
  { symbol: "TSLA", name: "Tesla", tokenSymbol: "TSLAx", decimals: 8, address: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB", feed: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB" },
  { symbol: "MSFT", name: "Microsoft", tokenSymbol: "MSFTx", decimals: 8, address: "XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX", feed: "XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX" },
  { symbol: "META", name: "Meta", tokenSymbol: "METAx", decimals: 8, address: "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu", feed: "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu" },
  { symbol: "GOOGL", name: "Alphabet", tokenSymbol: "GOOGLx", decimals: 8, address: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN", feed: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN" },
  { symbol: "AMZN", name: "Amazon", tokenSymbol: "AMZNx", decimals: 8, address: "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg", feed: "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg" },
  { symbol: "SPCX", name: "SpaceX", tokenSymbol: "SPCXx", decimals: 8, address: "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8", feed: "Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8" },
  { symbol: "MU", name: "Micron", tokenSymbol: "MUx", decimals: 8, address: "XsQLZycSZ7QnBBdBXQaTbQdiUcbRqjNJgyBGAMzhHav", feed: "XsQLZycSZ7QnBBdBXQaTbQdiUcbRqjNJgyBGAMzhHav" },
];

export const stockBySymbol = (symbol: string) =>
  STOCKS.find((s) => s.symbol.toLowerCase() === symbol.toLowerCase()) ?? null;

export const stockByAddress = (address: string) =>
  STOCKS.find((s) => s.address === address) ?? null;

export function isListedMint(mint: string): boolean {
  return STOCKS.some((s) => s.address === mint);
}
