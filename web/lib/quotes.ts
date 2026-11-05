import { jupiterQuote } from "./solana";
import { scaledShares } from "./prices";

export type StockQuote = {
  amountOut: bigint;
  uiAmount: number;
  valueUsd: number | null;
  routeLabel: string;
};

/** Refuse a send when the quote is more than this far under the dollar amount. */
export const MAX_PRICE_IMPACT_PCT = 5;

export async function quoteBestStockSwap(
  lamports: bigint,
  mint: string,
  stockUsd?: number | null,
  giftUsd?: number | null,
): Promise<StockQuote> {
  if (lamports <= 0n) throw new Error("Amount must be greater than 0");
  const quote = await jupiterQuote(lamports, mint);
  const amountOut = BigInt(quote.outAmount);
  if (amountOut <= 0n) throw new Error("Quote returned zero");
  const uiAmount = await scaledShares(mint, amountOut);
  const valueUsd = stockUsd && stockUsd > 0 ? uiAmount * stockUsd : null;
  if (valueUsd !== null && giftUsd && giftUsd > 0) {
    const impact = ((giftUsd - valueUsd) / giftUsd) * 100;
    if (impact > MAX_PRICE_IMPACT_PCT) {
      throw new Error(
        `Not enough liquidity for this size (impact −${impact.toFixed(1)}%). Try a smaller amount.`,
      );
    }
  }
  return {
    amountOut,
    uiAmount,
    valueUsd,
    routeLabel: "Jupiter",
  };
}

export function formatShares(amount: number, digits = 4): string {
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}
