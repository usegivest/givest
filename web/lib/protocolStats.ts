import { formatEther, type Address } from "viem";
import { ESCROW_ADDRESSES, STOCKS, stockByAddress } from "@/lib/config";
import { readEthUsd, readUsdPrice } from "@/lib/prices";

const EXPLORER = "https://robinhoodchain.blockscout.com";

/** DropCreated topic0 hashes across contract versions. */
const DROP_CREATED_TOPICS = new Set([
  "0xa2a53c81e062881c7ba3d9296436d3042e66f4c2a2a721a714e42415a2bd6718",
  "0xcb54899c00dd633981d408fc7d967edd5447f66cec4a623465e92e6548a60f3f",
  "0xb2d083359c28e01231c2b574a882fb62468cdd0d9aff0525edc5d6da513e5d7b",
]);

/**
 * Extra price feeds for historical drops whose tickers are no longer
 * on the send list (deep-liquidity filter). Used only for stats.
 */
const HISTORICAL_FEEDS: Record<string, Address> = {
  "0x894e1ec2d74ffe5aef8dc8a9e84686accb964f2a":
    "0x820ABedFF239034956B7A9d2F0a331f9F075eB4c", // PLTR
  "0x6330d8c3178a418788df01a47479c0ce7ccf450b":
    "0xA3a468A452940B7D6b69991207B508c609a98Ef2", // COIN
  "0x86923f96303d656e4aa86d9d42d1e57ad2023fdc":
    "0x943A29E7ae51A4798823ca9eEd2ed533B2A22C72", // AMD
  "0xb0992820e760d836549ba69bc7598b4af75dee03":
    "0x0e6a64a2B58A6693a531E6c555f3A5d042eEA844", // ORCL
  "0x5f10a1c971b69e47e059e1dc91901b59b3fb49c3":
    "0xe1b3aABCAFAd1c94708dc1367dcfF8Aa4407487C", // CRWV
  "0xc72b96e0e48ecd4dc75e1e45396e26300bc39681":
    "0x3f390C5C24628Ac7C489515402235FeAD71D1913", // INTC
  "0xb90a19ff0af67f7779aff50a882a9cff42446400":
    "0xfb133Fa4B7b385802B693a293606682Df47109A3", // SNDK
};

function isDropCreated(topic0: string | undefined): boolean {
  if (!topic0) return false;
  const t = topic0.toLowerCase();
  if (DROP_CREATED_TOPICS.has(t)) return true;
  return (
    t.startsWith("0xa2a53c81") ||
    t.startsWith("0xcb54899c") ||
    t.startsWith("0xb2d08335")
  );
}

type ExplorerLog = {
  topics?: string[];
  data?: string;
};

async function fetchAddressLogs(address: Address): Promise<ExplorerLog[]> {
  const items: ExplorerLog[] = [];
  let params: Record<string, string | number> | null = null;

  for (let page = 0; page < 25; page++) {
    const url = new URL(`${EXPLORER}/api/v2/addresses/${address}/logs`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v));
      }
    }
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Givest/1.0" },
      cache: "no-store",
    });
    if (!res.ok) break;
    const data = (await res.json()) as {
      items?: ExplorerLog[];
      next_page_params?: Record<string, string | number> | null;
    };
    const batch = data.items ?? [];
    items.push(...batch);
    params = data.next_page_params ?? null;
    if (!params || batch.length === 0) break;
  }

  return items;
}

/** Sum native ETH successfully sent into an escrow contract. */
async function fetchEthIn(address: Address): Promise<number> {
  const url = `${EXPLORER}/api?module=account&action=txlist&address=${address}&sort=asc`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Givest/1.0" },
    cache: "no-store",
  });
  if (!res.ok) return 0;
  const data = (await res.json()) as {
    result?: Array<{ value?: string; isError?: string }>;
  };
  let eth = 0;
  for (const t of data.result ?? []) {
    if (t.isError === "1") continue;
    const v = Number(t.value || "0") / 1e18;
    if (Number.isFinite(v) && v > 0) eth += v;
  }
  return eth;
}

export type ProtocolStats = {
  /** Primary: USD of ETH that entered the protocol (true create volume). */
  volumeUsd: number;
  /** Secondary: USD of stock tokens locked in escrow (post-swap). */
  stockVolumeUsd: number;
  dropCount: number;
  pricedDropCount: number;
};

export async function getProtocolStats(): Promise<ProtocolStats> {
  const priceCache = new Map<string, number | null>();

  async function priceFor(token: Address): Promise<number | null> {
    const key = token.toLowerCase();
    if (priceCache.has(key)) return priceCache.get(key)!;
    const stock = stockByAddress(token);
    const feed =
      stock?.feed ??
      HISTORICAL_FEEDS[key] ??
      null;
    if (!feed) {
      priceCache.set(key, null);
      return null;
    }
    const p = await readUsdPrice(feed);
    priceCache.set(key, p);
    return p;
  }

  await Promise.all(
    STOCKS.filter((s) => s.feed).map((s) => priceFor(s.address)),
  );

  const [ethUsd, ethIns, logSets] = await Promise.all([
    readEthUsd(),
    Promise.all(ESCROW_ADDRESSES.map((a) => fetchEthIn(a).catch(() => 0))),
    Promise.all(
      ESCROW_ADDRESSES.map((a) =>
        fetchAddressLogs(a).catch(() => [] as ExplorerLog[]),
      ),
    ),
  ]);

  const ethInTotal = ethIns.reduce((s, n) => s + n, 0);
  const volumeUsd =
    ethUsd && ethUsd > 0 ? ethInTotal * ethUsd : 0;

  let stockVolumeUsd = 0;
  let dropCount = 0;
  let pricedDropCount = 0;

  for (const logs of logSets) {
    for (const lg of logs) {
      const topics = lg.topics ?? [];
      if (!isDropCreated(topics[0])) continue;
      dropCount += 1;
      if (topics.length < 4) continue;
      const token = (`0x${topics[3].slice(-40)}`) as Address;
      const data = (lg.data ?? "0x").slice(2);
      if (data.length < 64) continue;
      const amount = BigInt(`0x${data.slice(0, 64)}`);
      const shares = Number(formatEther(amount));
      if (!Number.isFinite(shares) || shares <= 0) continue;
      const price = await priceFor(token);
      if (price === null) continue;
      stockVolumeUsd += shares * price;
      pricedDropCount += 1;
    }
  }

  return {
    volumeUsd,
    stockVolumeUsd,
    dropCount,
    pricedDropCount,
  };
}

export function formatVolumeUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 100) return `$${Math.round(n)}`;
  return `$${n.toFixed(0)}`;
}
