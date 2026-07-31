import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Address } from "viem";

const SENT_KEY = "givest_sent_drops";
const RECEIVED_KEY = "givest_received_claims";

export type SentDrop = {
  claimKey: Address;
  link: string;
  symbol: string;
  tokenAddress: Address;
  usd: number;
  splits: number;
  claimableAt: number;
  txHash: string;
  createdAt: number;
};

export type ReceivedClaim = {
  claimKey: Address;
  symbol: string;
  shares: number;
  txHash: string;
  claimedAt: number;
};

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export const loadSentDrops = () => readList<SentDrop>(SENT_KEY);
export const loadReceivedClaims = () => readList<ReceivedClaim>(RECEIVED_KEY);

export async function saveSentDrop(drop: SentDrop): Promise<SentDrop[]> {
  const next = [drop, ...(await loadSentDrops())];
  await AsyncStorage.setItem(SENT_KEY, JSON.stringify(next));
  return next;
}

export async function saveReceivedClaim(
  claim: ReceivedClaim,
): Promise<ReceivedClaim[]> {
  const next = [claim, ...(await loadReceivedClaims())];
  await AsyncStorage.setItem(RECEIVED_KEY, JSON.stringify(next));
  return next;
}
