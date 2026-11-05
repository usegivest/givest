import StockLogo from "@/components/StockLogo";
import { FEATURED_STOCKS } from "@/lib/config";

export default function Dashboard() {
  return (
    <div className="dashboard-animate flex w-full max-w-xl flex-col gap-4 rounded-tl-2xl border border-gray-100 bg-white p-4 shadow-xl sm:gap-5 sm:p-6 md:p-8">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
          On Solana
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-gray-900">
          xStocks you can send
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {FEATURED_STOCKS.map((stock) => (
          <a
            key={stock.symbol}
            href={`/send?s=${stock.symbol}`}
            className="flex items-center justify-between rounded-xl px-1 py-1.5 transition hover:bg-gray-50"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-50">
                <StockLogo symbol={stock.symbol} size={26} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-900">{stock.symbol}</span>
                <span className="block text-xs text-gray-400">{stock.name}</span>
              </span>
            </span>
            <span className="text-[11px] font-medium text-gray-400">{stock.tokenSymbol}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
