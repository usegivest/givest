import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Your gifts | Givest",
  description:
    "Every gift this wallet sent, with live onchain status. Refund from the status page.",
};

export default function GiftsLayout({ children }: { children: ReactNode }) {
  return children;
}
