"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import LogoMark from "@/components/LogoMark";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Send", href: "/send" },
  { label: "Claim", href: "/claim" },
  { label: "Volume", href: "/volume" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Docs", href: "/docs" },
];

function XIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function Navbar({ variant = "floating" }: { variant?: "floating" | "page" }) {
  const pathname = usePathname();
  const isPage = variant === "page";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : href.startsWith("/") && !href.includes("#")
        ? pathname === href
        : false;

  return (
    <nav
      className={
        isPage
          ? "sticky top-0 z-50 flex justify-center bg-[#f4f3ef]/95 px-4 py-4 backdrop-blur-md sm:px-6"
          : "fixed top-0 right-0 left-0 z-50 flex justify-center px-4 pt-5 sm:px-6 sm:pt-6"
      }
    >
      <div className="flex w-full max-w-fit items-center gap-3 rounded-full border border-gray-200/80 bg-white/70 py-2.5 pr-2.5 pl-4 shadow-sm backdrop-blur-sm md:gap-8 md:pr-2.5 md:pl-5">
        <Link href="/" className="text-gray-900" aria-label="Givest home">
          <LogoMark size={28} />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map(({ label, href }) => (
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
        </div>

        <a
          href="https://x.com/usegivest"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow us on X"
          className="hidden text-gray-600 transition-colors duration-150 hover:text-gray-900 md:block"
        >
          <XIcon />
        </a>

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
              {LINKS.map(({ label, href }) => (
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
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <a
                href="https://x.com/usegivest"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-gray-600"
              >
                <XIcon />
                Follow on X
              </a>
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
