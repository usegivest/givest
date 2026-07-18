import type { ReactNode } from "react";
import { BarChart3, Layers, Lock } from "lucide-react";
import LogoMark from "@/components/LogoMark";

type Card = {
  icon: ReactNode;
  text: string;
  gradientFrom: string;
  gradientTo: string;
  id: string;
};

const CARDS: Card[] = [
  {
    id: "studio",
    icon: <LogoMark size={24} className="text-gray-900" />,
    text: "Send Stocks as a Link",
    gradientFrom: "#F59E0B",
    gradientTo: "#3B82F6",
  },
  {
    id: "channels",
    icon: <Layers className="h-6 w-6 flex-shrink-0 text-emerald-600" />,
    text: "18 Real Stock Tokens on Chain",
    gradientFrom: "#10B981",
    gradientTo: "#06B6D4",
  },
  {
    id: "access",
    icon: <Lock className="h-6 w-6 flex-shrink-0 text-blue-600" />,
    text: "Escrow-Backed Claim Links",
    gradientFrom: "#3B82F6",
    gradientTo: "#0EA5E9",
  },
  {
    id: "analytics",
    icon: <BarChart3 className="h-6 w-6 flex-shrink-0 text-amber-600" />,
    text: "Live Prices via Chainlink",
    gradientFrom: "#F59E0B",
    gradientTo: "#EF4444",
  },
];

function SpinRing({
  gradientFrom,
  gradientTo,
  id,
}: {
  gradientFrom: string;
  gradientTo: string;
  id: string;
}) {
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" className="spin-ring flex-shrink-0">
      <defs>
        <linearGradient id={id} x1="14" y1="3" x2="25" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor={gradientFrom} />
          <stop offset="1" stopColor={gradientTo} />
        </linearGradient>
      </defs>
      <circle cx="14" cy="14" r="11" fill="none" stroke="#E5E7EB" strokeWidth="3" />
      <circle
        cx="14"
        cy="14"
        r="11"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="69.1 69.1"
        strokeDashoffset="51.8"
        transform="rotate(-90 14 14)"
      />
    </svg>
  );
}

export default function PopupCard() {
  return (
    <div className="mt-10 flex w-full flex-col items-center gap-3 px-4 sm:mt-16 sm:px-0">
      {CARDS.map((card, i) => (
        <div
          key={card.id}
          className="popup-card-animate flex w-full max-w-[380px] items-center gap-3 rounded-2xl border border-gray-200/60 bg-white/80 px-4 py-3 shadow-lg backdrop-blur-sm sm:gap-4 sm:px-6 sm:py-4"
          style={{ animationDelay: `${i * 150}ms` }}
        >
          {card.icon}
          <span className="flex-1 text-xs font-medium whitespace-nowrap text-gray-700 sm:text-sm">
            {card.text}
          </span>
          <SpinRing
            gradientFrom={card.gradientFrom}
            gradientTo={card.gradientTo}
            id={`grad-${card.id}`}
          />
        </div>
      ))}
    </div>
  );
}
