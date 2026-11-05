import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import TokenCa from "@/components/TokenCa";
import TokenTierCheck from "@/components/TokenTierCheck";
import { EXPLORER, GIVEST_MINT } from "@/lib/config";

export const metadata: Metadata = {
  title: "$GIVEST — Givest",
  description:
    "What holding $GIVEST gets you: lower protocol fees, free sends at VIP tier, and a share of everything the protocol earns going back into the community.",
};

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
            $GIVEST is live on Solana. The send fee is 1% in SOL.
          </p>
          <TokenCa />
          <p className="mt-3">
            <a
              href={`${EXPLORER}/token/${GIVEST_MINT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
            >
              View on Solscan
            </a>
          </p>
        </header>

        <div className="mt-12 space-y-6">
          <Card title="Your holder tier">
            <p>
              Every send pays 1% in SOL. That fee covers claims, so the person
              who opens the link does not pay it.
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
                recipients never need SOL.
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
              $GIVEST is the project token on Solana. The stocks you send are the
              xStocks on the send page.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/send"
                className="btn-primary inline-flex items-center justify-center px-5 py-2.5 text-sm"
              >
                Send a stock
              </Link>
            </div>
          </Card>

          <Card title="The fine print" delay={270}>
            <p>
              The send fee is 1% in SOL. Holder discounts are not live on this
              chain yet. No lockups and no vesting on the token itself.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
