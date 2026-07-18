import { FileText } from "lucide-react";
import AnimatedChart from "@/components/AnimatedChart";

function ProgressRing({
  percent,
  color,
  positive,
}: {
  percent: number;
  color: string;
  positive: boolean;
}) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <svg width={40} height={40} viewBox="0 0 40 40" className="hidden sm:block">
      <circle
        cx={20}
        cy={20}
        r={r}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth={3}
      />
      <circle
        cx={20}
        cy={20}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 20 20)"
        className="progress-ring-fill"
        style={{ strokeDashoffset: positive ? offset : circ * 0.7 }}
      />
    </svg>
  );
}

const CHANNELS = [
  { symbol: "NVDA", name: "NVIDIA", value: "12,461", change: "+4.20%", positive: true, color: "#F59E0B", pct: 70 },
  { symbol: "TSLA", name: "Tesla", value: "8,932", change: "-1.05%", positive: false, color: "#3B82F6", pct: 30 },
  { symbol: "SPCX", name: "SpaceX", value: "5,718", change: "+2.87%", positive: true, color: "#10B981", pct: 70 },
];

export default function Dashboard() {
  return (
    <div className="dashboard-animate flex w-full max-w-xl flex-col gap-4 rounded-tl-2xl border border-gray-100 bg-white p-4 shadow-xl sm:gap-6 sm:p-6 md:p-8">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 sm:h-12 sm:w-12">
            <FileText className="h-5 w-5 text-gray-600 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 sm:text-sm">Total Sent</p>
            <p className="text-xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              $498,098
              <span className="ml-1 text-xs font-normal text-gray-400 sm:text-sm">USD</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 text-xs text-gray-500 sm:flex">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-gray-900" /> Claimed
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-gray-300" /> Pending
            </span>
          </div>
          <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            Monthly
          </span>
        </div>
      </div>

      <AnimatedChart />

      <div>
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Top Stocks</h3>
        <div className="space-y-3">
          {CHANNELS.map((ch) => (
            <div key={ch.symbol} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white sm:h-10 sm:w-10 sm:text-sm"
                  style={{ backgroundColor: ch.color }}
                >
                  {ch.symbol[0]}
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-900">{ch.symbol}</span>
                  <span className="ml-2 hidden text-sm text-gray-400 sm:inline">
                    {ch.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">${ch.value}</p>
                  <p
                    className={`text-xs font-medium ${
                      ch.positive ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {ch.change}
                  </p>
                </div>
                <ProgressRing
                  percent={ch.pct}
                  color={ch.color}
                  positive={ch.positive}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
