import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Gift status | Givest",
  description:
    "Paste a claim link and see if the gift is open, claimed, locked, or refunded. Read from the chain.",
};

export default function StatusLayout({ children }: { children: ReactNode }) {
  return children;
}
