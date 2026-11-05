import type { Stock } from "./config";

export type TokenInfo = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
};

/** Arbitrary mints are not listed. Send only uses the xStock list. */
export async function fetchTokenInfo(_address: string): Promise<TokenInfo | null> {
  return null;
}

export function tokenInfoToStock(info: TokenInfo): Stock {
  return {
    symbol: info.symbol,
    name: info.name,
    address: info.address,
    feed: info.address,
    decimals: info.decimals,
    tokenSymbol: info.symbol,
  };
}
