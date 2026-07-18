import type { ReactNode } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";

export default function EditorialPageShell({
  eyebrow,
  title,
  accent,
  subtitle,
  media,
  video,
  mediaAlt,
  mediaLabel,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  subtitle: string;
  media: string;
  video?: string;
  mediaAlt: string;
  mediaLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-[1] bg-white/55 backdrop-blur-[3px]" />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-24 pb-12 sm:px-6 sm:pt-28">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gray-400 uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-[2rem] leading-none font-medium tracking-tighter text-gray-900 sm:text-[3rem]">
            {title} <span className="text-zinc-400">{accent}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-500 sm:mt-5 sm:text-base">
            {subtitle}
          </p>
        </header>

        <div className="mt-8 grid items-stretch gap-5 sm:mt-10 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="popup-card-animate relative order-2 min-h-[220px] overflow-hidden rounded-3xl shadow-xl sm:min-h-[320px] lg:order-1 lg:min-h-0">
            {video ? (
              <video
                className="absolute inset-0 h-full w-full object-cover"
                src={video}
                poster={media}
                autoPlay
                loop
                muted
                playsInline
                aria-label={mediaAlt}
              />
            ) : (
              <Image
                src={media}
                alt={mediaAlt}
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute right-5 bottom-5 left-5 flex items-end justify-between gap-4 text-white">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-white/70 uppercase">
                  {mediaLabel}
                </p>
                <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-white/90">
                  Real stock tokens. One private link. No gas for the recipient.
                </p>
              </div>
              <span className="hidden shrink-0 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[10px] font-medium backdrop-blur-md sm:block">
                Robinhood Chain
              </span>
            </div>
          </section>

          <section
            className="popup-card-animate order-1 min-w-0 lg:order-2"
            style={{ animationDelay: "150ms" }}
          >
            {children}
          </section>
        </div>

        {footer && (
          <footer className="mx-auto mt-8 max-w-2xl text-center text-[10px] leading-4 text-gray-400">
            {footer}
          </footer>
        )}
      </main>
    </div>
  );
}
