"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import LogoMark from "@/components/LogoMark";

const PRIMARY = [
  { label: "Home", href: "/" },
  { label: "Send", href: "/send" },
  { label: "Claim", href: "/claim" },
  { label: "Pool", href: "/pool" },
];

const MORE = [
  { label: "Token", href: "/token", desc: "$GIVEST utility and fee tiers" },
  { label: "Volume", href: "/volume", desc: "Live protocol stats" },
  { label: "Roadmap", href: "/roadmap", desc: "What ships next" },
  { label: "Docs", href: "/docs", desc: "How Givest works" },
];

function XIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.03 11.03 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

const GITHUB_URL = "https://github.com/usegivest/givest";

export default function Navbar({ variant = "floating" }: { variant?: "floating" | "page" }) {
  const pathname = usePathname();
  const isPage = variant === "page";
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!moreOpen) return;
    function onClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [moreOpen]);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : href.startsWith("/") && !href.includes("#")
        ? pathname === href
        : false;

  const moreActive = MORE.some((l) => isActive(l.href));

  return (
    <nav
      className={
        isPage
          ? "sticky top-0 z-50 flex justify-center bg-[#f4f3ef]/95 px-4 py-4 backdrop-blur-md sm:px-6"
          : "fixed top-0 right-0 left-0 z-50 flex justify-center px-4 pt-5 sm:px-6 sm:pt-6"
      }
    >
      <div className="flex w-full max-w-fit items-center gap-3 rounded-full border border-gray-200/80 bg-white/70 py-2.5 pr-2.5 pl-4 shadow-sm backdrop-blur-sm md:gap-7 md:pr-2.5 md:pl-5">
        <Link href="/" className="text-gray-900" aria-label="Givest home">
          <LogoMark size={28} />
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {PRIMARY.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={`text-sm font-medium transition-colors duration-150 ${
                isActive(href) ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {label}
            </Link>
          ))}

          <div ref={moreRef} className="relative">
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
              className={`flex items-center gap-1 text-sm font-medium transition-colors duration-150 ${
                moreActive || moreOpen ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              More
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-150 ${moreOpen ? "rotate-180" : ""}`}
              />
            </button>

            {moreOpen && (
              <div className="pop-in absolute top-full left-1/2 z-50 mt-4 w-60 -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-md">
                {MORE.map(({ label, href, desc }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`block rounded-xl px-3.5 py-2.5 transition ${
                      isActive(href) ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="block text-sm font-medium text-gray-900">{label}</span>
                    <span className="mt-0.5 block text-xs text-gray-400">{desc}</span>
                  </Link>
                ))}
                <div className="mt-1 flex items-center gap-4 border-t border-gray-100 px-3.5 py-2.5">
                  <a
                    href="https://x.com/usegivest"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Follow us on X"
                    className="text-gray-500 transition-colors hover:text-gray-900"
                  >
                    <XIcon />
                  </a>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View the source on GitHub"
                    className="text-gray-500 transition-colors hover:text-gray-900"
                  >
                    <GitHubIcon />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        <Link
          href="/send"
          className="gradient-border-btn rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap text-gray-900 shadow-sm hover:bg-gray-50 sm:px-5"
        >
          Get started
        </Link>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-[2px]" />
          <div
            className="pop-in absolute top-20 right-4 left-4 overflow-hidden rounded-3xl border border-gray-200/80 bg-white/95 shadow-2xl backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col p-2">
              {PRIMARY.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`rounded-2xl px-4 py-3.5 text-base font-medium transition ${
                    isActive(href)
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </Link>
              ))}
              <p className="mt-2 px-4 pb-1 text-[10px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
                More
              </p>
              {MORE.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive(href)
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <div className="flex items-center gap-5">
                <a
                  href="https://x.com/usegivest"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on X"
                  className="flex items-center gap-2 text-sm font-medium text-gray-600"
                >
                  <XIcon />
                </a>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View the source on GitHub"
                  className="flex items-center gap-2 text-sm font-medium text-gray-600"
                >
                  <GitHubIcon />
                </a>
              </div>
              <Link
                href="/send"
                onClick={() => setOpen(false)}
                className="gradient-border-btn rounded-full px-5 py-2 text-sm font-semibold text-gray-900 shadow-sm"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
