import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import TokenTierCheck from "@/components/TokenTierCheck";
import { GIVEST_TOKEN } from "@/lib/config";

export const metadata: Metadata = {
  title: "$GIVEST — Givest",
  description:
    "What holding $GIVEST gets you: lower protocol fees, free sends at VIP tier, and a share of everything the protocol earns going back into the community.",
};

const EXPLORER = "https://robinhoodchain.blockscout.com";

function Card({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="popup-card-animate rounded-2xl border border-gray-200/60 bg-white/95 p-6 shadow-lg backdrop-blur-md sm:p-8"
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <h2 className="text-lg font-semibold tracking-tight text-gray-900">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-600">
        {children}
      </div>
    </section>
  );
}

export default function TokenPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-[1] bg-white/55 backdrop-blur-[3px]" />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-28 pb-20">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
            The token
          </p>
          <h1 className="mt-4 text-[2.35rem] leading-none font-medium tracking-tighter text-gray-900 sm:text-[3rem]">
            Hold $GIVEST. <span className="text-zinc-400">Send for less.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            $GIVEST is not a points system. It is the fee switch for the whole
            protocol, read onchain on every send.
          </p>
          <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 font-mono text-xs text-gray-600">
            {GIVEST_TOKEN}
          </p>
        </header>

        <div className="mt-12 space-y-6">
          <Card title="Your holder tier">
            <p>
              Every send on Givest pays a protocol fee. Holding $GIVEST lowers
              it, all the way to zero. The contract checks your balance at send
              time, so there is nothing to stake, register, or claim.
            </p>
            <TokenTierCheck />
          </Card>

          <Card title="Where the fees go" delay={90}>
            <p>
              Protocol fees are recycled into the product, not parked in a
              wallet:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-gray-900">Gasless claims.</span>{" "}
                Every claim on Givest is relayed. Fees pay the gas so
                recipients never need ETH.
              </li>
              <li>
                <span className="font-medium text-gray-900">
                  Funded giveaways.
                </span>{" "}
                The public stock drops we run on X are funded by protocol
                revenue.
              </li>
              <li>
                <span className="font-medium text-gray-900">
                  $GIVEST buybacks.
                </span>{" "}
                A share of revenue is routed into buying $GIVEST on the open
                market as volume grows.
              </li>
            </ul>
          </Card>

          <Card title="Send $GIVEST as a gift" delay={180}>
            <p>
              $GIVEST is on the send list like any stock. Drop it to a friend
              as a claim link, lock it to an X handle, or split one link
              between winners in a giveaway.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/send"
                className="btn-primary inline-flex items-center justify-center px-5 py-2.5 text-sm"
              >
                Send $GIVEST
              </Link>
              <a
                href={`${EXPLORER}/token/${GIVEST_TOKEN}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center justify-center px-5 py-2.5 text-sm"
              >
                View on Blockscout
              </a>
              <a
                href={`https://dexscreener.com/robinhoodchain/${GIVEST_TOKEN}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center justify-center px-5 py-2.5 text-sm"
              >
                Chart
              </a>
            </div>
          </Card>

          <Card title="The fine print" delay={270}>
            <p>
              Tiers are read live from the escrow contract when your wallet is
              connected. Thresholds: 10,000 $GIVEST for the reduced fee,
              100,000 $GIVEST for free sends. Balances are checked at send
              time, so selling below a threshold moves you back down. No
              lockups, no vesting, no snapshots.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
