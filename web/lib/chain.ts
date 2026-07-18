import {
  createPublicClient,
  encodeAbiParameters,
  encodePacked,
  http,
  keccak256,
  parseAbiParameters,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import {
  robinhoodChain,
  UNISWAP_FACTORY,
  POOL_MANAGER,
  WETH,
  USDG,
  factoryAbi,
  poolAbi,
} from "./config";

export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(),
});

export function newClaimKey(): { privateKey: Hex; address: Address } {
  const privateKey = generatePrivateKey();
  return { privateKey, address: privateKeyToAccount(privateKey).address };
}

/** Sign the claim digest with the link's claim key. */
export async function signClaim(
  claimKeyPriv: Hex,
  contract: Address,
  recipient: Address,
): Promise<Hex> {
  const account = privateKeyToAccount(claimKeyPriv);
  const inner = keccak256(
    encodePacked(
      ["uint256", "address", "address", "address"],
      [BigInt(robinhoodChain.id), contract, account.address, recipient],
    ),
  );
  // viem's signMessage with raw bytes applies the EIP-191 prefix, matching
  // the contract's claimDigest.
  return account.signMessage({ message: { raw: inner } });
}

const FEE_TIERS = [100, 500, 3000, 10000] as const;

/** Known V4 fee / tickSpacing pairs used by stock pools on Robinhood Chain. */
const V4_COMBOS: { fee: number; tickSpacing: number }[] = [
  { fee: 50000, tickSpacing: 1000 },
  { fee: 30000, tickSpacing: 600 },
  { fee: 10000, tickSpacing: 200 },
  { fee: 3000, tickSpacing: 60 },
  { fee: 500, tickSpacing: 10 },
  { fee: 100, tickSpacing: 1 },
  { fee: 460, tickSpacing: 9 },
];

type V3PoolPick = { fee: number; liquidity: bigint; pool: Address };

async function bestV3Pool(a: Address, b: Address): Promise<V3PoolPick | null> {
  let best: V3PoolPick | null = null;
  for (const fee of FEE_TIERS) {
    const pool = await publicClient.readContract({
      address: UNISWAP_FACTORY,
      abi: factoryAbi,
      functionName: "getPool",
      args: [a, b, fee],
    });
    if (pool === "0x0000000000000000000000000000000000000000") continue;
    const liquidity = await publicClient.readContract({
      address: pool,
      abi: poolAbi,
      functionName: "liquidity",
    });
    if (liquidity > 0n && (!best || liquidity > best.liquidity)) {
      best = { fee, liquidity, pool };
    }
  }
  return best;
}

async function bestPoolFee(a: Address, b: Address): Promise<number | null> {
  return (await bestV3Pool(a, b))?.fee ?? null;
}

function v4PoolId(
  currency0: Address,
  currency1: Address,
  fee: number,
  tickSpacing: number,
  hooks: Address = zeroAddress,
): Hex {
  let a = currency0.toLowerCase() as Address;
  let b = currency1.toLowerCase() as Address;
  if (BigInt(a) > BigInt(b)) [a, b] = [b, a];
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("address, address, uint24, int24, address"),
      [a, b, fee, tickSpacing, hooks],
    ),
  );
}

async function v4Liquidity(id: Hex): Promise<bigint> {
  const stateSlot = keccak256(
    encodeAbiParameters(parseAbiParameters("bytes32, uint256"), [id, 6n]),
  );
  const slot = BigInt(stateSlot) + 3n;
  const raw = await publicClient.readContract({
    address: POOL_MANAGER,
    abi: [
      {
        type: "function",
        name: "extsload",
        stateMutability: "view",
        inputs: [{ type: "bytes32" }],
        outputs: [{ type: "bytes32" }],
      },
    ] as const,
    functionName: "extsload",
    args: [`0x${slot.toString(16).padStart(64, "0")}` as Hex],
  });
  const liq = BigInt(raw);
  return liq > 0n && liq < 1n << 128n ? liq : 0n;
}

async function bestV4Pool(
  tokenA: Address,
  tokenB: Address,
): Promise<{ fee: number; tickSpacing: number; liquidity: bigint } | null> {
  let best: { fee: number; tickSpacing: number; liquidity: bigint } | null =
    null;
  for (const { fee, tickSpacing } of V4_COMBOS) {
    const id = v4PoolId(tokenA, tokenB, fee, tickSpacing);
    const liquidity = await v4Liquidity(id);
    if (liquidity > 0n && (!best || liquidity > best.liquidity)) {
      best = { fee, tickSpacing, liquidity };
    }
  }
  return best;
}

/**
 * Build the Uniswap V3 path from WETH to a stock token.
 * Prefers WETH -> USDG -> stock when both legs have liquidity.
 * Falls back to a direct WETH pool if one exists.
 */
export async function buildEthToStockPath(stock: Address): Promise<Hex | null> {
  const routes = await listStockSwapRoutes(stock);
  const v3 = routes.find((r) => r.kind === "v3");
  return v3?.kind === "v3" ? v3.path : null;
}

export type StockSwapRoute =
  | { kind: "v3"; path: Hex; score: bigint }
  | {
      kind: "v4";
      fee: number;
      tickSpacing: number;
      hooks: Address;
      score: bigint;
    }
  | {
      kind: "v3+v4";
      ethToUsdgPath: Hex;
      fee: number;
      tickSpacing: number;
      hooks: Address;
      score: bigint;
    };

/**
 * Enumerate deep ETH→stock routes only.
 * Thin direct WETH→stock V3 pools are intentionally excluded - those
 * can quote and still destroy size on low-liquidity ticks.
 */
export async function listStockSwapRoutes(
  stock: Address,
): Promise<StockSwapRoute[]> {
  const routes: StockSwapRoute[] = [];

  const wethUsdg = await bestV3Pool(WETH, USDG);
  const usdgStockV3 = await bestV3Pool(USDG, stock);

  // Deep multi-hop V3 via USDG (only when both legs have real liquidity).
  if (wethUsdg && usdgStockV3) {
    const score =
      wethUsdg.liquidity < usdgStockV3.liquidity
        ? wethUsdg.liquidity
        : usdgStockV3.liquidity;
    routes.push({
      kind: "v3",
      path: encodePacked(
        ["address", "uint24", "address", "uint24", "address"],
        [WETH, wethUsdg.fee, USDG, usdgStockV3.fee, stock],
      ),
      score,
    });
  }

  const ethStock = await bestV4Pool(zeroAddress, stock);
  if (ethStock) {
    routes.push({
      kind: "v4",
      fee: ethStock.fee,
      tickSpacing: ethStock.tickSpacing,
      hooks: zeroAddress,
      score: ethStock.liquidity,
    });
  }

  const usdgStockV4 = await bestV4Pool(USDG, stock);
  if (wethUsdg && usdgStockV4) {
    const score =
      wethUsdg.liquidity < usdgStockV4.liquidity
        ? wethUsdg.liquidity
        : usdgStockV4.liquidity;
    routes.push({
      kind: "v3+v4",
      ethToUsdgPath: encodePacked(
        ["address", "uint24", "address"],
        [WETH, wethUsdg.fee, USDG],
      ),
      fee: usdgStockV4.fee,
      tickSpacing: usdgStockV4.tickSpacing,
      hooks: zeroAddress,
      score,
    });
  }

  routes.sort((a, b) => (a.score === b.score ? 0 : a.score > b.score ? -1 : 1));
  return routes;
}

/**
 * Resolve a swap route. Prefer callers that quote all candidates via
 * `quoteBestStockSwap` - this helper only returns the deepest-scored route.
 */
export async function resolveStockSwapRoute(
  stock: Address,
): Promise<StockSwapRoute | null> {
  const routes = await listStockSwapRoutes(stock);
  return routes[0] ?? null;
}
