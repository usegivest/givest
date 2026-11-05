import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Pool — Givest",
  description: "Send a stock on Solana. Pool funding returns with the Solana program.",
};

export default function PoolPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-[1] bg-white/55 backdrop-blur-[3px]" />
      <Navbar />
      <main className="relative z-10 mx-auto w-full max-w-xl px-6 pt-36 pb-20 text-center">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-400 uppercase">
          Pool
        </p>
        <h1 className="mt-3 text-4xl font-medium tracking-tighter text-gray-900">
          One sender for now.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-gray-500">
          Several wallets funding one gift needs a Solana program. Sending from
          one Phantom wallet works today.
        </p>
        <Link
          href="/send"
          className="mt-8 inline-flex rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white"
        >
          Send a stock
        </Link>
      </main>
    </div>
  );
}
