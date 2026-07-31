import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createWalletClient, http, type Address, type Hex, type WalletClient } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { robinhoodChain } from "./config";

const WALLET_KEY = "givest_wallet_private_key";
const WALLET_KEY_FALLBACK = "givest_wallet_private_key_fallback";

function generateKey(): Hex {
  const bytes = Crypto.getRandomBytes(32);
  let hex = "0x";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex as Hex;
}

async function readKey(): Promise<Hex | null> {
  try {
    const secure = await SecureStore.getItemAsync(WALLET_KEY);
    if (secure && /^0x[0-9a-fA-F]{64}$/.test(secure)) return secure as Hex;
  } catch {
    /* Expo Go / simulator can reject SecureStore in edge cases */
  }
  try {
    const fallback = await AsyncStorage.getItem(WALLET_KEY_FALLBACK);
    if (fallback && /^0x[0-9a-fA-F]{64}$/.test(fallback)) return fallback as Hex;
  } catch {
    /* ignore */
  }
  return null;
}

async function writeKey(key: Hex): Promise<void> {
  try {
    await SecureStore.setItemAsync(WALLET_KEY, key);
    return;
  } catch {
    /* fall through */
  }
  try {
    await SecureStore.setItemAsync(WALLET_KEY, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
    return;
  } catch {
    /* fall through to AsyncStorage so Expo Go still works */
  }
  await AsyncStorage.setItem(WALLET_KEY_FALLBACK, key);
}

export async function loadStoredKey(): Promise<Hex | null> {
  return readKey();
}

type WalletState =
  | { status: "loading"; address: null; account: null }
  | { status: "none"; address: null; account: null }
  | { status: "ready"; address: Address; account: PrivateKeyAccount };

type WalletContextValue = WalletState & {
  /** Generate a new key, store it in the Keychain, and activate it. */
  createWallet: () => Promise<Address>;
  /** Reveal the raw private key for backup. Caller must gate behind a confirm. */
  revealPrivateKey: () => Promise<Hex | null>;
  /** Wallet client bound to the embedded account for onchain sends. */
  getWalletClient: () => WalletClient;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({
    status: "loading",
    address: null,
    account: null,
  });

  useEffect(() => {
    let cancelled = false;
    readKey()
      .then((key) => {
        if (cancelled) return;
        if (key) {
          const account = privateKeyToAccount(key);
          setState({ status: "ready", address: account.address, account });
        } else {
          setState({ status: "none", address: null, account: null });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "none", address: null, account: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const createWallet = useCallback(async (): Promise<Address> => {
    const existing = await readKey();
    const key = existing ?? generateKey();
    if (!existing) {
      await writeKey(key);
    }
    const account = privateKeyToAccount(key);
    setState({ status: "ready", address: account.address, account });
    return account.address;
  }, []);

  const revealPrivateKey = useCallback(() => readKey(), []);

  const getWalletClient = useCallback((): WalletClient => {
    if (state.status !== "ready") {
      throw new Error("Wallet is not ready yet.");
    }
    return createWalletClient({
      account: state.account,
      chain: robinhoodChain,
      transport: http(),
    });
  }, [state]);

  const value = useMemo<WalletContextValue>(
    () => ({ ...state, createWallet, revealPrivateKey, getWalletClient }),
    [state, createWallet, revealPrivateKey, getWalletClient],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
