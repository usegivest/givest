import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { THIS_WEEK, UPDATES, type UpdateTag } from "@/lib/updates";

export const metadata: Metadata = {
  title: "Updates | Givest",
  description:
    "What shipped, with dates. The public log we should have been writing the whole time.",
};

const TAG: Record<UpdateTag, string> = {
  shipped: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
  honest: "bg-amber-50 text-amber-900 ring-amber-600/15",
  fix: "bg-sky-50 text-sky-900 ring-sky-600/15",
};

const TAG_LABEL: Record<UpdateTag, string> = {
  shipped: "Shipped",
  honest: "Honest",
  fix: "Fix",
};

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UpdatesPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-[1] bg-white/55 backdrop-blur-[3px]" />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-28 pb-20">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Updates
          </p>
          <h1 className="mt-4 text-[2.35rem] leading-none font-medium tracking-tighter text-gray-900 sm:text-[3rem]">
            What shipped. <span className="text-zinc-400">With dates.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            We went quiet. That was not fair. This is the log. If it is not
            here, it did not ship.
          </p>
        </header>

        <ol className="mt-14 space-y-4">
          {UPDATES.map((item) => (
            <li
              key={`${item.date}-${item.title}`}
              className="popup-card-animate rounded-2xl border border-gray-200/60 bg-white/95 p-6 shadow-lg backdrop-blur-md sm:p-7"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ring-1 ring-inset ${TAG[item.tag]}`}
                >
                  {TAG_LABEL[item.tag]}
                </span>
                <time
                  dateTime={item.date}
                  className="text-xs font-medium text-gray-400"
                >
                  {formatDate(item.date)}
                </time>
              </div>
              <h2 className="mt-3 text-lg font-semibold tracking-tight text-gray-900">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {item.body}
              </p>
              {item.href && (
                <Link
                  href={item.href.url}
                  className="mt-4 inline-flex text-sm font-semibold text-gray-900 underline decoration-gray-300 underline-offset-4 hover:decoration-gray-900"
                >
                  {item.href.label}
                </Link>
              )}
            </li>
          ))}
        </ol>

        <section className="popup-card-animate mt-10 rounded-2xl border border-gray-200/60 bg-white/95 p-6 shadow-lg backdrop-blur-md sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
            This week
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-gray-900">
            What we will try to ship next.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Promises, not vapor. If one of these slips, it stays here until it
            is done or we take it off in public.
          </p>
          <ul className="mt-6 divide-y divide-gray-100">
            {THIS_WEEK.map((item) => (
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
        </section>
      </main>
    </div>
  );
}
