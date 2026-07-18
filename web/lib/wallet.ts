"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createWalletClient,
  custom,
  type Address,
  type WalletClient,
} from "viem";
import { robinhoodChain } from "./config";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

const CHAIN_HEX = `0x${robinhoodChain.id.toString(16)}`;

async function ensureChain(provider: Eip1193) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_HEX }],
    });
  } catch {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: CHAIN_HEX,
          chainName: robinhoodChain.name,
          nativeCurrency: robinhoodChain.nativeCurrency,
          rpcUrls: [robinhoodChain.rpcUrls.default.http[0]],
          blockExplorerUrls: [robinhoodChain.blockExplorers.default.url],
        },
      ],
    });
  }
}

export function useWallet() {
  const [address, setAddress] = useState<Address | null>(null);
  const [client, setClient] = useState<WalletClient | null>(null);
  const [hasProvider, setHasProvider] = useState(false);

  useEffect(() => {
    setHasProvider(Boolean(window.ethereum));
  }, []);

  const connect = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) throw new Error("Ingen wallet fundet. Installér f.eks. MetaMask.");
    const accounts = (await provider.request({
      method: "eth_requestAccounts",
    })) as Address[];
    await ensureChain(provider);
    const walletClient = createWalletClient({
      account: accounts[0],
      chain: robinhoodChain,
      transport: custom(provider),
    });
    setAddress(accounts[0]);
    setClient(walletClient);
    provider.on?.("accountsChanged", (accs) => {
      const list = accs as Address[];
      setAddress(list[0] ?? null);
    });
    return { address: accounts[0], client: walletClient };
  }, []);

  return { address, client, connect, hasProvider };
}
