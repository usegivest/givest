"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import LogoMark from "@/components/LogoMark";

const GITHUB_URL = "https://github.com/usegivest/givest";

const BOARD = [
  {
    label: "Move",
    items: [
      { href: "/pool", title: "Pool", fact: "Several wallets fund one gift." },
      { href: "/x", title: "From X", fact: "Paste a post. We read who, what, and how much." },
      { href: "/gifts", title: "Your gifts", fact: "What this wallet has sent." },
      { href: "/status", title: "One gift", fact: "Paste a link. The chain answers." },
    ],
  },
  {
    label: "Record",
    items: [
      { href: "/updates", title: "Updates", fact: "What shipped, with a date." },
      { href: "/docs", title: "How it works", fact: "Jupiter, the claim link, Solana." },
      { href: "/token", title: "Token", fact: "The fee is 1%, paid in SOL." },
      { href: "/android", title: "Android", fact: "The APK is live. iPhone is not." },
    ],
  },
] as const;

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

export default function Navbar({ variant = "floating" }: { variant?: "floating" | "page" }) {
  const pathname = usePathname();
  const isPage = variant === "page";
  const [open, setOpen] = useState(false);
  const [board, setBoard] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setBoard(false);
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
    if (!board) return;
    function onPointer(e: MouseEvent) {
      if (boardRef.current && !boardRef.current.contains(e.target as Node)) setBoard(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setBoard(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [board]);

  const claimOn = pathname === "/claim";
  const sendOn = pathname === "/send";

  return (
    <nav
      className={
        isPage
          ? "sticky top-0 z-50 bg-[#f4f3ef]/90 px-4 py-3 backdrop-blur-md sm:px-6"
          : "fixed top-0 right-0 left-0 z-50 px-4 pt-4 sm:px-6 sm:pt-5"
      }
    >
      <div ref={boardRef} className="relative mx-auto w-full max-w-5xl">
      <div className="flex w-full items-center gap-3 rounded-full border border-gray-200/80 bg-white/80 py-2 pr-2 pl-3 shadow-sm backdrop-blur-md sm:gap-4 sm:pl-4">
        <Link href="/" className="flex items-center gap-2 text-gray-900" aria-label="Givest home">
          <LogoMark size={26} />
          <span className="text-[15px] font-medium tracking-tight">Givest</span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <Link
            href="/send"
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              sendOn ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            Send
          </Link>
          <Link
            href="/claim"
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              claimOn ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            Claim
          </Link>
          <button
            type="button"
            aria-expanded={board}
            onClick={() => {
              if (window.matchMedia("(max-width: 767px)").matches) setOpen(true);
              else setBoard((v) => !v);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              board ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            Board
          </button>
        </div>

        <a
          href="https://x.com/usegivest"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Givest on X"
          className="ml-auto hidden text-gray-500 hover:text-gray-900 sm:block"
        >
          <XIcon />
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Source on GitHub"
          className="mr-1 hidden text-gray-500 hover:text-gray-900 sm:block"
        >
          <GitHubIcon />
        </a>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {board && (
        <div className="absolute top-full right-0 left-0 z-50 mt-3 hidden md:block">
          <BoardPanel onNavigate={() => setBoard(false)} />
        </div>
      )}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-gray-900/25 backdrop-blur-[2px]" />
          <div
            className="pop-in absolute top-[4.5rem] right-4 left-4 max-h-[80vh] overflow-auto rounded-[28px] border border-gray-200/80 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-end justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-400 uppercase">Solana</p>
                <p className="mt-1 text-2xl font-medium tracking-tight text-gray-900">xStocks</p>
              </div>
              <div className="flex items-center gap-4">
                <a href="https://x.com/usegivest" target="_blank" rel="noopener noreferrer" aria-label="Givest on X" className="text-gray-500">
                  <XIcon />
                </a>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="Source on GitHub" className="text-gray-500">
                  <GitHubIcon />
                </a>
              </div>
            </div>
            <div className="grid gap-1 p-3">
              <Link href="/send" onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50">
                Send
              </Link>
              <Link href="/claim" onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50">
                Claim
              </Link>
              {BOARD.map((group) => (
                <div key={group.label} className="px-2">
                  <p className="px-2 text-[10px] font-semibold tracking-[0.16em] text-gray-400 uppercase">{group.label}</p>
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-2 py-2.5 hover:bg-gray-50"
                    >
                      <span className="block text-sm font-medium text-gray-900">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">{item.fact}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function BoardPanel({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-gray-200/80 bg-white shadow-2xl">
      <div className="grid grid-cols-[210px_1fr]">
        <Link href="/send" onClick={onNavigate} className="flex flex-col justify-between bg-[#17191f] px-5 py-5 text-white">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-white/50 uppercase">Solana</p>
            <p className="mt-3 text-3xl font-medium tracking-tight">Send a stock</p>
            <p className="mt-2 text-xs leading-relaxed text-white/60">
              SOL in. An xStock out. One private link.
            </p>
          </div>
          <p className="mt-8 text-xs font-medium text-white/80">Open send</p>
        </Link>
        <div className="grid grid-cols-2 gap-x-2 p-3">
          {BOARD.map((group) => (
            <div key={group.label}>
              <p className="px-2.5 pt-1 pb-1 text-[10px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
                {group.label}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className="block rounded-xl px-2.5 py-2 hover:bg-gray-50"
                >
                  <span className="block text-sm font-medium text-gray-900">{item.title}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">{item.fact}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
