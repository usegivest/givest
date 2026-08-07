import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Roadmap | Givest",
  description:
    "What shipped, what we're building next, and where Givest is headed. Without the vaporware.",
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
    title: "The product is real.",
    blurb:
      "Web, Android, and the full gift stack. Send a stock. Share one link. They claim. You pay the gas.",
    items: [
      {
        title: "Private claim links",
        body: "Escrow on Robinhood Chain. The claim key lives in the URL, not on our servers.",
      },
      {
        title: "Android app",
        body: "Direct APK with an embedded wallet. Create, send, and claim from your phone. Open source.",
      },
      {
        title: "Scheduled unlocks",
        body: "Seal a gift until a birthday or a date you pick. The unlock is enforced onchain.",
      },
      {
        title: "Giveaways + split winners",
        body: "Random unlock windows and N equal shares. One link, many wallets, one claim each.",
      },
      {
        title: "Gift pools",
        body: "Crowd-fund a drop together, then finalize it into one stock gift.",
      },
      {
        title: "Custom tokens + recipient lock",
        body: "Any ERC-20 on Robinhood Chain by contract address. Lock a gift to a specific X handle.",
      },
      {
        title: "Gasless claims + fee tiers",
        body: "We cover network fees on claim. Holders of $GIVEST pay less to send.",
      },
    ],
  },
  {
    status: "now",
    label: "Building now",
    title: "Get the app into every pocket.",
    blurb:
      "The quiet stretch was for this. Ship the mobile surface end to end.",
    items: [
      {
        title: "iOS App Store",
        body: "Submitted. Waiting on Apple review. Same embedded wallet, same claim flow.",
      },
      {
        title: "Fiat onramp",
        body: "Fund the wallet with USD and local currency via Robinhood Connect and Apple Pay.",
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
    title: "Make ownership a habit.",
    blurb:
      "Still concrete. Still shippable. The gifts that keep showing up.",
    items: [
      {
        title: "Recurring gifts",
        body: "Drip $25 of SPY every month. Same claim link model. Ownership on a schedule.",
      },
      {
        title: "Google Play",
        body: "Same Android app, from the store. Side-load stays as the open-source path.",
      },
      {
        title: "Share cards & embeds",
        body: "Pretty OG images and a tiny embed so drops look intentional outside the app.",
      },
      {
        title: "Deeper liquidity coverage",
        body: "More tickers as Robinhood Chain markets deepen. Thin pools stay blocked until they are real.",
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
