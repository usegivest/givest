import type { ReactNode } from "react";

export default function FormCard({
  step,
  title,
  children,
  delay = 0,
}: {
  step?: number;
  title: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="popup-card-animate rounded-2xl border border-gray-200/60 bg-white/80 p-5 shadow-lg backdrop-blur-sm sm:p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-4 flex items-center gap-3">
        {step !== undefined && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
            {step}
          </span>
        )}
        <h2 className="text-sm font-semibold tracking-tight text-gray-900 sm:text-base">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}
