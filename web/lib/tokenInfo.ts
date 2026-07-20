import type { Address } from "viem";
import type { Stock } from "./config";

const EXPLORER_API = "https://robinhoodchain.blockscout.com/api/v2";

export type TokenInfo = {
  address: Address;
  symbol: string;
  name: string;
  decimals: number | null;
  icon: string | null;
};

/** Look up any ERC-20 on Robinhood Chain via Blockscout. */
export async function fetchTokenInfo(
  address: string,
): Promise<TokenInfo | null> {
  try {
    const res = await fetch(`${EXPLORER_API}/tokens/${address}`);
    if (!res.ok) return null;
    const d = await res.json();
    if (!d?.symbol) return null;
    return {
      address: (d.address_hash ?? d.address ?? address) as Address,
      symbol: String(d.symbol),
      name: String(d.name ?? d.symbol),
      decimals: d.decimals != null ? Number(d.decimals) : null,
      icon: d.icon_url ?? null,
    };
  } catch {
    return null;
  }
}

export function tokenInfoToStock(info: TokenInfo): Stock {
  return {
    symbol: info.symbol,
    name: info.name,
    address: info.address,
    feed: null,
    icon: info.icon,
  };
}