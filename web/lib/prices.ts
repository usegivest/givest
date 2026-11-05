import { SOL_MINT } from "./config";

const PRICE_URL = "https://lite-api.jup.ag/price/v3";

type PriceRow = {
  usdPrice?: number;
  decimals?: number;
  scaledUiConfig?: {
    multiplier?: number;
    newMultiplier?: number;
    newMultiplierEffectiveAt?: string;
  };
};

const cache = new Map<string, { at: number; row: PriceRow }>();

async function loadPrices(ids: string[]): Promise<Record<string, PriceRow>> {
  const fresh = ids.filter((id) => {
    const hit = cache.get(id);
    return !hit || Date.now() - hit.at > 15_000;
  });
  if (fresh.length) {
    const res = await fetch(`${PRICE_URL}?ids=${fresh.join(",")}`);
    if (res.ok) {
      const body = (await res.json()) as Record<string, PriceRow>;
      for (const id of fresh) {
        if (body[id]) cache.set(id, { at: Date.now(), row: body[id] });
      }
    }
  }
  const out: Record<string, PriceRow> = {};
  for (const id of ids) {
    const hit = cache.get(id);
    if (hit) out[id] = hit.row;
  }
  return out;
}

export async function readUsdPrice(mint: string): Promise<number | null> {
  try {
    const row = (await loadPrices([mint]))[mint];
    if (!row?.usdPrice || row.usdPrice <= 0) return null;
    return row.usdPrice;
  } catch {
    return null;
  }
}

export const readSolUsd = () => readUsdPrice(SOL_MINT);

export function lamportsForUsd(usd: number, solUsd: number): bigint {
  if (!(usd > 0) || !(solUsd > 0)) return 0n;
  return BigInt(Math.round((usd / solUsd) * 1_000_000_000));
}

export async function scaledShares(mint: string, raw: bigint): Promise<number> {
  const row = (await loadPrices([mint]))[mint];
  const decimals = row?.decimals ?? 8;
  const cfg = row?.scaledUiConfig;
  let multiplier = cfg?.multiplier ?? 1;
  if (cfg?.newMultiplier && cfg.newMultiplierEffectiveAt) {
    const at = Date.parse(cfg.newMultiplierEffectiveAt);
    if (Number.isFinite(at) && Date.now() >= at) multiplier = cfg.newMultiplier;
  }
  return (Number(raw) / 10 ** decimals) * multiplier;
}
