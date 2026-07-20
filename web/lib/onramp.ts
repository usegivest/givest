import crypto from "crypto";

/**
 * Fiat onramp via MoonPay. Users pay with card, Apple Pay, or Google Pay
 * and receive ETH on Robinhood Chain directly in their own wallet.
 * MoonPay is the merchant of record, so Givest never touches fiat.
 */
const MOONPAY_BASE = "https://buy.moonpay.com";

/** MoonPay currency code for native ETH on Robinhood Chain. */
const CURRENCY_CODE = "eth_robinhood";

export function onrampEnabled(): boolean {
  return Boolean(process.env.MOONPAY_PUBLISHABLE_KEY);
}

export function buildOnrampUrl(opts: {
  walletAddress: string;
  usdAmount?: number;
}): string {
  const params = new URLSearchParams({
    apiKey: process.env.MOONPAY_PUBLISHABLE_KEY!,
    currencyCode: CURRENCY_CODE,
    walletAddress: opts.walletAddress,
    baseCurrencyCode: "usd",
  });
  if (opts.usdAmount && Number.isFinite(opts.usdAmount) && opts.usdAmount > 0) {
    params.set("baseCurrencyAmount", String(Math.ceil(opts.usdAmount)));
  }

  let url = `${MOONPAY_BASE}?${params.toString()}`;

  // MoonPay requires signed URLs when a wallet address is prefilled.
  const secret = process.env.MOONPAY_SECRET_KEY;
  if (secret) {
    const signature = crypto
      .createHmac("sha256", secret)
      .update(new URL(url).search)
      .digest("base64");
    url += `&signature=${encodeURIComponent(signature)}`;
  }
  return url;
}
