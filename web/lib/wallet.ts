"use client";

import { useCallback, useEffect, useState } from "react";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";

type Phantom = {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toBase58(): string } }>;
  signAndSendTransaction: (
    tx: VersionedTransaction,
  ) => Promise<{ signature: string }>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    solana?: Phantom;
  }
}

function phantom(): Phantom | null {
  const provider = window.solana;
  if (!provider?.isPhantom) return null;
  return provider;
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState(false);

  useEffect(() => {
    setHasProvider(Boolean(window.solana?.isPhantom));
  }, []);

  const connect = useCallback(async () => {
    const provider = phantom();
    if (!provider) throw new Error("Install Phantom to continue.");
    const res = await provider.connect();
    const next = res.publicKey.toBase58();
    setAddress(next);
    provider.on?.("accountChanged", (key) => {
      const pk = key as { toBase58?: () => string } | null;
      setAddress(pk?.toBase58?.() ?? null);
    });
    return { address: next };
  }, []);

  const signAndSendTransaction = useCallback(async (tx: VersionedTransaction) => {
    const provider = phantom();
    if (!provider) throw new Error("Install Phantom to continue.");
    const { signature } = await provider.signAndSendTransaction(tx);
    return signature;
  }, []);

  const signTransaction = useCallback(async (tx: Transaction) => {
    const provider = phantom();
    if (!provider) throw new Error("Install Phantom to continue.");
    return provider.signTransaction(tx);
  }, []);

  return {
    address,
    connect,
    hasProvider,
    signAndSendTransaction,
    signTransaction,
  };
}
