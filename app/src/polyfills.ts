/**
 * Global polyfills. Loaded from the app entry (index.js) so they run
 * before ANY route module touches viem.
 *
 * crypto.getRandomValues comes from expo-crypto, which works inside
 * Expo Go (react-native-get-random-values needs a native module that
 * Expo Go does not ship).
 */
import "react-native-url-polyfill/auto";
import { getRandomValues as expoGetRandomValues } from "expo-crypto";

type MutableCrypto = {
  getRandomValues?: <T extends ArrayBufferView | null>(array: T) => T;
};

const g = globalThis as typeof globalThis & { crypto?: MutableCrypto };

if (typeof g.crypto !== "object" || g.crypto === null) {
  (g as { crypto?: MutableCrypto }).crypto = {};
}
const cryptoObj = g.crypto as MutableCrypto;
if (typeof cryptoObj.getRandomValues !== "function") {
  cryptoObj.getRandomValues = (<T extends ArrayBufferView | null>(array: T): T =>
    // expo-crypto fills typed arrays in place, same contract as WebCrypto.
    expoGetRandomValues(array as never) as unknown as T);
}
