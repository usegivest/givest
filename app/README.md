# Givest

The easiest way to send and receive real stock gifts from your phone.

Givest is a React Native (Expo) app for [usegivest.app](https://usegivest.app). A sender swaps ETH into a tokenized stock via Uniswap V3/V4 on Robinhood Chain, the tokens sit in an open-source escrow contract, and a private claim link lets the recipient claim gaslessly - Givest pays the network fee through a relayer.

## Architecture

- **Chain:** Robinhood Chain (id 4663), RPC `https://rpc.mainnet.chain.robinhood.com`, explorer [Blockscout](https://robinhoodchain.blockscout.com).
- **Escrow contract:** `0xA318294016823c058E9c4d4f7FA4F5aef41775cC` (hardcoded in `src/lib/config.ts`).
- **Embedded wallet:** on first launch the app generates a private key with viem and stores it in the iOS Keychain / Android Keystore via `expo-secure-store`. No seed phrase, no external wallet. Users fund it by sending ETH on Robinhood Chain to their address. The Profile tab has a "Back up wallet" flow that reveals the key after a confirmation.
- **Sends:** happen onchain directly from the embedded wallet (`createDropWithEth` / `createDropWithEthV4` / `createDropWithEthViaUsdgV4`), quoting the best Uniswap route live, with a 10% slippage floor, protocol fee on top (`fee.grossFromGift`), and `expiresAt = unlockAt + 30 days`.
- **Claims:** gasless. The claim link carries a private key in the URL hash; the app signs the claim digest with it and POSTs `{ claimKey, recipient, signature }` to the relayer at `https://usegivest.app/api/claim`.
- **History:** local-first in AsyncStorage (sent drops + received claims). Statuses refresh by reading `drops()` onchain.
- **Supabase (optional):** `src/lib/supabase.ts` exports `null` unless env vars are set; every usage is guarded. The schema lives in `supabase/migrations/0001_init.sql`.

Chain logic in `src/lib` mirrors the web codebase file-for-file: `config.ts`, `chain.ts`, `quotes.ts`, `prices.ts`, `fees.ts`, `tokenInfo.ts`.

### Screens

| Route | Purpose |
| --- | --- |
| `onboarding` | Walletless onboarding, "Create my wallet" |
| `(tabs)/index` | Home: portfolio value, ETH + stock balances, fund flow, claim button |
| `(tabs)/send` | Stock picker, USD amount, live quote, Normal/Giveaway/Scheduled, splits, message, done screen with link + QR + share |
| `(tabs)/activity` | Sent (live onchain status) and Received history |
| `(tabs)/profile` | Address + QR, backup, optional sign-in, links, fee tier, version |
| `claim` (modal) | Paste/deep-link a claim link, preview the gift, claim gaslessly |

## Run it

```bash
npm install
npx expo start
```

Press `i` for the iOS simulator or scan the QR with Expo Go. Note: `expo-secure-store` works in Expo Go; for production behavior use a development build (`npx expo run:ios`).

### Env vars (all optional)

| Var | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL - enables the sign-in section |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

Without them the app runs fully local-first.

### Supabase setup (optional)

1. Create a project at supabase.com.
2. Apply `supabase/migrations/0001_init.sql` (via `supabase db push` or the SQL editor).
3. Set the two env vars above (e.g. in a `.env` file) and restart the dev server.

## Build for TestFlight / App Store

```bash
npm install -g eas-cli   # once
eas login
eas build:configure      # once, creates eas.json
npx eas build --platform ios
eas submit --platform ios
```

### App Store checklist

- [x] Apple Developer account linked
- [x] Bundle id `app.usegivest.givest`
- [x] Privacy policy URL: `https://usegivest.app`
- [x] Encryption exemption set (`ITSAppUsesNonExemptEncryption=false`)
- [x] Embedded wallet, send, claim, activity and profile flows verified end-to-end
- [x] Submitted to Apple App Store Review

Positioning: the easiest way to gift real stocks. Review note: tokens are stock *tokens* on Robinhood Chain (economic exposure, not shares); the app holds a self-custodied wallet.

## Icons

`assets/images/*` are generated from the brand mark by `scripts/generate-icon.js` (requires the `sharp` npm package).

## Disclaimers

Stock tokens are not shares - they provide economic exposure, not shareholder rights. The private key never leaves the device; losing the device without a backup means losing the funds.
