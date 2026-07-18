import {
  formatEther,
  parseEther,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import {
  QUOTER_V3,
  QUOTER_V4,
  USDG,
  WETH,
  quoterV3Abi,
  quoterV4Abi,
} from "./config";
import {
  listStockSwapRoutes,
  publicClient,
  type StockSwapRoute,
} from "./chain";

export type StockQuote = {
  amountOut: bigint;
  route: StockSwapRoute;
  /** Human-readable route label for the UI. */
  routeLabel: string;
};

function routeLabel(route: StockSwapRoute): string {
  if (route.kind === "v3") {
    // Multi-hop paths are longer than address+fee+address.
    // direct = 0x + 43 bytes; hop = 0x + 66 bytes
    return route.path.length > 100 ? "Uniswap V3 · via USDG" : "Uniswap V3";
  }
  if (route.kind === "v4") return "Uniswap V4";
  return "V3 → USDG → V4";
}

function sortCurrencies(a: Address, b: Address): [Address, Address] {
  return BigInt(a) < BigInt(b) ? [a, b] : [b, a];
}

function toUint128(amount: bigint): bigint {
  const max = (1n << 128n) - 1n;
  if (amount > max) throw new Error("Amount too large for V4 quote");
  return amount;
}

async function quoteV3ExactInput(path: Hex, amountIn: bigint): Promise<bigint> {
  const { result } = await publicClient.simulateContract({
    address: QUOTER_V3,
    abi: quoterV3Abi,
    functionName: "quoteExactInput",
    args: [path, amountIn],
  });
  return result[0];
}

async function quoteV4ExactInputSingle(params: {
  currencyIn: Address;
  currencyOut: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
  amountIn: bigint;
}): Promise<bigint> {
  const [currency0, currency1] = sortCurrencies(
    params.currencyIn,
    params.currencyOut,
  );
  const zeroForOne =
    params.currencyIn.toLowerCase() === currency0.toLowerCase();

  const { result } = await publicClient.simulateContract({
    address: QUOTER_V4,
    abi: quoterV4Abi,
    functionName: "quoteExactInputSingle",
    args: [
      {
        poolKey: {
          currency0,
          currency1,
          fee: params.fee,
          tickSpacing: params.tickSpacing,
          hooks: params.hooks,
        },
        zeroForOne,
        exactAmount: toUint128(params.amountIn),
        hookData: "0x",
      },
    ],
  });
  return result[0];
}

/**
 * Quote how many stock tokens you get for `amountInEth` wei of ETH
 * along an already-resolved swap route.
 *
 * For hybrid `v3+v4` routes, if the V4 leg cannot be quoted (some
 * USDG/stock pools revert in the Quoter), we fall back to an oracle
 * estimate when `oracleStockUsd` is provided and `allowOracleFallback`
 * is true. USDG is treated as $1 with 6 decimals.
 */
export async function quoteStockSwap(
  route: StockSwapRoute,
  amountInEth: bigint,
  stock: Address,
  oracleStockUsd?: number | null,
  allowOracleFallback = true,
): Promise<StockQuote> {
  if (amountInEth <= 0n) throw new Error("Amount must be greater than 0");

  let amountOut: bigint;
  let usedOracleFallback = false;

  if (route.kind === "v3") {
    amountOut = await quoteV3ExactInput(route.path, amountInEth);
  } else if (route.kind === "v4") {
    amountOut = await quoteV4ExactInputSingle({
      currencyIn: zeroAddress,
      currencyOut: stock,
      fee: route.fee,
      tickSpacing: route.tickSpacing,
      hooks: route.hooks,
      amountIn: amountInEth,
    });
  } else {
    const usdgOut = await quoteV3ExactInput(route.ethToUsdgPath, amountInEth);
    if (usdgOut <= 0n) throw new Error("USDG quote returned zero");
    try {
      amountOut = await quoteV4ExactInputSingle({
        currencyIn: USDG,
        currencyOut: stock,
        fee: route.fee,
        tickSpacing: route.tickSpacing,
        hooks: route.hooks,
        amountIn: usdgOut,
      });
    } catch {
      if (!allowOracleFallback || !oracleStockUsd || oracleStockUsd <= 0) {
        throw new Error("Could not quote the USDG → stock leg");
      }
      // USDG has 6 decimals and tracks $1.
      const usdgUsd = Number(usdgOut) / 1e6;
      const shares = usdgUsd / oracleStockUsd;
      amountOut = parseEther(shares.toFixed(18));
      usedOracleFallback = true;
    }
  }

  if (amountOut <= 0n) throw new Error("Quote returned zero");

  return {
    amountOut,
    route,
    routeLabel: usedOracleFallback
      ? `${routeLabel(route)} · oracle est.`
      : routeLabel(route),
  };
}

/** Max allowed oracle vs Uniswap gap. Above this we refuse to send. */
export const MAX_PRICE_IMPACT_PCT = 5;

/**
 * Quote every deep route for this size and return the best amountOut.
 * Thin direct V3 pools are never considered. High impact = hard error.
 */
export async function quoteBestStockSwap(
  amountInEth: bigint,
  stock: Address,
  oracleStockUsd?: number | null,
  giftUsd?: number | null,
): Promise<StockQuote> {
  const routes = await listStockSwapRoutes(stock);
  if (routes.length === 0) {
    throw new Error(
      "No deep liquidity route for this stock. Try another ticker.",
    );
  }

  let best: StockQuote | null = null;
  const errors: string[] = [];

  for (const route of routes) {
    try {
      const quote = await quoteStockSwap(
        route,
        amountInEth,
        stock,
        oracleStockUsd,
        false,
      );
      if (!best || quote.amountOut > best.amountOut) best = quote;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "quote failed");
    }
  }

  if (!best) {
    throw new Error(
      errors[0] ??
        "Not enough deep liquidity to quote this size. Try a smaller amount.",
    );
  }

  if (oracleStockUsd && oracleStockUsd > 0 && giftUsd && giftUsd > 0) {
    const outUsd = Number(formatEther(best.amountOut)) * oracleStockUsd;
    const impact = ((giftUsd - outUsd) / giftUsd) * 100;
    if (impact > MAX_PRICE_IMPACT_PCT) {
      throw new Error(
        `Not enough liquidity for this size (impact −${impact.toFixed(1)}%). Try a smaller amount.`,
      );
    }
  }

  return best;
}

export function formatShares(amountOut: bigint, digits = 4): string {
  const n = Number(formatEther(amountOut));
  if (!Number.isFinite(n)) return formatEther(amountOut);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

/** Keep WETH export available for callers that need the path token. */
export { WETH };
