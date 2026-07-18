import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Roadmap · Givest",
  description:
    "What shipped, what we’re building next, and where Givest is headed - without the vaporware.",
};

type Status = "live" | "now" | "next";

type Item = {
  title: string;
  body: string;
};

type Phase = {
  status: Status;
  label: string;
  title: string;
  blurb: string;
  items: Item[];
};

const PHASES: Phase[] = [
  {
    status: "live",
    label: "Shipped",
    title: "The core product works.",
    blurb:
      "Send a stock token. Share one private link. They claim - you pay the gas.",
    items: [
      {
        title: "Private claim links",
        body: "Escrow on Robinhood Chain. The claim key lives in the URL, not on our servers.",
      },
      {
        title: "Deep-liquidity stocks only",
        body: "NVDA, TSLA, AAPL, and other thick pools. Thin tickers stay off the list until liquidity is real.",
      },
      {
        title: "Best-pool routing",
        body: "We quote every deep route and pick the best. Thin V3 junk pools are blocked. High impact refuses the send.",
      },
      {
        title: "Gasless claims",
        body: "Recipients connect a wallet and claim. We relay and cover gas.",
      },
      {
        title: "Gift notes",
        body: "Add a short message on the claim page - birthday, bonus, thank you.",
      },
      {
        title: "Live quote preview",
        body: "See expected shares and price impact before you confirm - Uniswap V3 + V4 quotes on send.",
      },
      {
        title: "Giveaway mode",
        body: "Random onchain unlock inside a window you set - share the link now, claim opens later.",
      },
      {
        title: "Split winners",
        body: "One link, N equal shares. Each wallet claims once - perfect for $10 → 10×$1 drops.",
      },
      {
        title: "Protocol fees + holder pass",
        body: "1% on create (0.75% at 10k $GIVEST, free at 100k). Fees fund gasless claims and giveaways.",
      },
    ],
  },
  {
    status: "now",
    label: "Building now",
    title: "Make sending feel obvious.",
    blurb:
      "Small upgrades that remove friction before every send - and make the gift feel like a gift.",
    items: [
      {
        title: "Sender history",
        body: "A clean list of what you sent, what’s claimed, and what you can refund.",
      },
      {
        title: "Buyback + giveaway split",
        body: "Route protocol fees into relayer gas, $GIVEST buybacks, and funded public drops.",
      },
    ],
  },
  {
    status: "next",
    label: "Next",
    title: "Gifts that keep showing up.",
    blurb:
      "Still concrete. Still shippable. Just a little further out.",
    items: [
      {
        title: "Scheduled & recurring gifts",
        body: "Send NVDA on Friday. Or drip $25 of SPY every month. Same claim link model.",
      },
      {
        title: "Public giveaway polish",
        body: "Claim-once-per-wallet caps and nicer share cards for Discord and X.",
      },
      {
        title: "Share cards & embeds",
        body: "Pretty OG images and a tiny embed so drops look intentional outside the app.",
      },
      {
        title: "Better liquidity coverage",
        body: "RFQ routes for thin names as Robinhood’s markets deepen - so more tickers stay sendable.",
      },
    ],
  },
];

const STATUS_STYLES: Record<
  Status,
  { dot: string; badge: string; line: string }
> = {
  live: {
    dot: "bg-emerald-500 ring-emerald-500/20",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
    line: "from-emerald-400/50 to-amber-400/40",
  },
  now: {
    dot: "bg-amber-500 ring-amber-500/25",
    badge: "bg-amber-50 text-amber-900 ring-amber-600/15",
    line: "from-amber-400/40 to-sky-400/40",
  },
  next: {
    dot: "bg-sky-500 ring-sky-500/20",
    badge: "bg-sky-50 text-sky-900 ring-sky-600/15",
    line: "from-sky-400/30 to-transparent",
  },
};

export default function RoadmapPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-[1] bg-white/55 backdrop-blur-[3px]" />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-28 pb-20">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Roadmap
          </p>
          <h1 className="mt-4 text-[2.35rem] leading-none font-medium tracking-tighter text-gray-900 sm:text-[3rem]">
            What’s next. <span className="text-zinc-400">No vaporware.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            A short list of things we can actually ship. Built in public on
            Robinhood Chain.
          </p>
        </header>

        <ol className="relative mt-14 space-y-8">
          {PHASES.map((phase, index) => {
            const style = STATUS_STYLES[phase.status];
            const isLast = index === PHASES.length - 1;
            return (
              <li
                key={phase.label}
                className="roadmap-phase relative pl-10 sm:pl-12"
                style={{ animationDelay: `${120 + index * 90}ms` }}
              >
                {!isLast && (
                  <span
                    aria-hidden
                    className={`absolute top-8 bottom-[-2rem] left-[11px] w-px bg-gradient-to-b sm:left-[15px] ${style.line}`}
                  />
                )}
                <span
                  aria-hidden
                  className={`absolute top-2 left-1.5 h-3.5 w-3.5 rounded-full ring-4 sm:left-2.5 ${style.dot}`}
                />

                <div className="popup-card-animate rounded-2xl border border-gray-200/60 bg-white/95 p-6 shadow-lg backdrop-blur-md sm:p-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ring-1 ring-inset ${style.badge}`}
                    >
                      {phase.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {phase.status === "live"
                        ? "Mainnet"
                        : phase.status === "now"
                          ? "This quarter"
                          : "After that"}
                    </span>
                  </div>

                  <h2 className="mt-4 text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
                    {phase.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    {phase.blurb}
                  </p>

                  <ul className="mt-6 divide-y divide-gray-100">
                    {phase.items.map((item) => (
                      <li key={item.title} className="py-4 first:pt-0 last:pb-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-gray-500">
                          {item.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>

        <section className="popup-card-animate mt-10 rounded-2xl border border-gray-200/60 bg-white/95 p-6 text-center shadow-lg backdrop-blur-md sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Principles
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-600">
            Non-custodial escrow. Real stock tokens. Gasless for the person who
            receives. We don’t invent features we can’t ship onchain.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/send"
              className="btn-primary inline-flex items-center justify-center px-5 py-2.5 text-sm"
            >
              Send a drop
            </Link>
            <Link
              href="/docs"
              className="btn-secondary inline-flex items-center justify-center px-5 py-2.5 text-sm"
            >
              Read the docs
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
