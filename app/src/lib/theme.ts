/** Givest brand palette - light, clean, soft pink accents like the X banner. */
export const colors = {
  bg: "#faf7f8",
  bgWash: "#f3e8ee",
  card: "#ffffff",
  text: "#17191f",
  secondary: "#6b6370",
  faint: "#9a9098",
  border: "#ebe3e7",
  hairline: "#f4eef1",
  /** Soft blush pink - the banner accent. */
  accent: "#e4a0b5",
  accentSoft: "#f8e9ef",
  accentDeep: "#c97b94",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  success: "#059669",
  successBg: "#ecfdf5",
  pillBg: "#17191f",
  pillText: "#ffffff",
} as const;

export const radius = {
  card: 22,
  pill: 999,
  input: 14,
} as const;

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatUsd(value: number, digits = 2): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}
