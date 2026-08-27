import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Givest for Android | Download the APK",
  description:
    "Install the Givest app on Android. Send real stock tokens on Robinhood Chain with one link. Direct APK download, no store required.",
};

const APK_URL =
  "https://github.com/usegivest/givest/releases/latest/download/givest.apk";

const STEPS = [
  {
    title: "Download the APK",
    body: "Tap the button below on your Android phone. The file comes straight from our open-source GitHub releases.",
  },
  {
    title: "Allow the install",
    body: "Android will ask you to allow installs from your browser the first time. That prompt appears because we ship outside the Play Store. The app is the exact code you can read on GitHub.",
  },
  {
    title: "Open Givest",
    body: "Create your wallet in one tap. Your key is generated on your phone and never leaves it.",
  },
];

export default function AndroidPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-[1] bg-white/55 backdrop-blur-[3px]" />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-28 pb-20">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Android
          </p>
          <h1 className="mt-4 text-[2.35rem] leading-none font-medium tracking-tighter text-gray-900 sm:text-[3rem]">
            Givest on your phone.{" "}
            <span className="text-zinc-400">No store needed.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            The phone app that is actually out. Send and claim real stock tokens
            on Robinhood Chain. iPhone is not in the App Store yet.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={APK_URL}
              className="btn-primary inline-flex items-center justify-center px-6 py-3 text-sm"
            >
              Download APK
            </a>
            <a
              href="https://github.com/usegivest/givest/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center justify-center px-6 py-3 text-sm"
            >
              All releases
            </a>
          </div>
        </header>

        <section className="popup-card-animate mt-14 rounded-2xl border border-gray-200/60 bg-white/95 p-6 shadow-lg backdrop-blur-md sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
            Install in three steps
          </h2>
          <ul className="mt-6 divide-y divide-gray-100">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="popup-card-animate mt-8 rounded-2xl border border-gray-200/60 bg-white/95 p-6 text-center shadow-lg backdrop-blur-md sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Why you can trust it
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-600">
            Every release is built from the public repo and published on
            GitHub. Your wallet is self-custodied: the private key is created
            on your device and never touches our servers.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/usegivest/givest"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center justify-center px-5 py-2.5 text-sm"
            >
              Read the code
            </a>
            <Link
              href="/send"
              className="btn-secondary inline-flex items-center justify-center px-5 py-2.5 text-sm"
            >
              Or use the web app
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
