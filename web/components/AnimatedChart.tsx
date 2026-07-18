"use client";

import { useEffect, useRef } from "react";

const DATA = [
  { day: "Mon", value: 18000 },
  { day: "Tue", value: 22000 },
  { day: "Wed", value: 19000 },
  { day: "Thu", value: 25000 },
  { day: "Fri", value: 21000 },
  { day: "Sat", value: 32000 },
  { day: "Sun", value: 28000 },
];

const MAX_VAL = 40000;
const PAD_TOP = 10;
const PAD_BOTTOM = 30;
const WIDTH = 400;
const HEIGHT = 180;

function smooth(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export default function AnimatedChart() {
  const lineRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const tooltipRef = useRef<SVGGElement>(null);
  const dropRef = useRef<SVGLineElement>(null);

  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const points = DATA.map((d, i) => ({
    x: (i / (DATA.length - 1)) * WIDTH,
    y: PAD_TOP + plotH - (d.value / MAX_VAL) * plotH,
  }));
  const linePath = smooth(points);
  const areaPath = `${linePath} L ${WIDTH} ${HEIGHT - PAD_BOTTOM} L 0 ${HEIGHT - PAD_BOTTOM} Z`;
  const hi = 5;
  const hx = points[hi].x;
  const hy = points[hi].y;

  useEffect(() => {
    const line = lineRef.current;
    if (line) {
      const len = line.getTotalLength();
      line.style.strokeDasharray = `${len}`;
      line.style.strokeDashoffset = `${len}`;
      requestAnimationFrame(() => {
        line.style.transition = "stroke-dashoffset 1.8s ease-out";
        line.style.strokeDashoffset = "0";
      });
    }
    const area = areaRef.current;
    if (area) {
      area.style.opacity = "0";
      setTimeout(() => {
        area.style.transition = "opacity 1s ease-out";
        area.style.opacity = "1";
      }, 800);
    }
    const dot = dotRef.current;
    if (dot) {
      dot.style.transform = "scale(0)";
      setTimeout(() => {
        dot.style.transition = "transform 0.4s ease-out";
        dot.style.transform = "scale(1)";
      }, 1600);
    }
    const tip = tooltipRef.current;
    if (tip) {
      tip.style.opacity = "0";
      tip.style.transform = "translateY(4px)";
      setTimeout(() => {
        tip.style.transition = "opacity 0.4s ease-out, transform 0.4s ease-out";
        tip.style.opacity = "1";
        tip.style.transform = "translateY(0)";
      }, 1800);
    }
  }, []);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1F2937" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#1F2937" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 10000, 20000, 30000, 40000].map((v) => {
        const y = PAD_TOP + plotH - (v / MAX_VAL) * plotH;
        return (
          <g key={v}>
            <line
              x1={0}
              y1={y}
              x2={WIDTH}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth={0.5}
              strokeDasharray="4 3"
            />
            <text
              x={WIDTH - 4}
              y={y + 3}
              textAnchor="end"
              fill="#9CA3AF"
              fontSize={9}
              fontFamily="Inter, sans-serif"
            >
              {v === 0 ? "0" : `${v / 1000}k`}
            </text>
          </g>
        );
      })}

      <path ref={areaRef} d={areaPath} fill="url(#chartGrad)" />
      <path
        ref={lineRef}
        d={linePath}
        fill="none"
        stroke="#1F2937"
        strokeWidth={2}
        strokeLinecap="round"
      />

      {DATA.map((d, i) => (
        <text
          key={d.day}
          x={points[i].x}
          y={HEIGHT - 8}
          textAnchor="middle"
          fill={i === hi ? "#111827" : "#9CA3AF"}
          fontSize={9}
          fontWeight={i === hi ? 600 : 400}
          fontFamily="Inter, sans-serif"
        >
          {d.day}
        </text>
      ))}

      <line
        ref={dropRef}
        x1={hx}
        y1={hy}
        x2={hx}
        y2={HEIGHT - PAD_BOTTOM}
        stroke="#1F2937"
        strokeWidth={1}
        strokeDasharray="3 2"
      />

      <circle
        ref={dotRef}
        cx={hx}
        cy={hy}
        r={5}
        fill="white"
        stroke="#1F2937"
        strokeWidth={2}
        style={{ transformOrigin: `${hx}px ${hy}px` }}
      />

      <g ref={tooltipRef}>
        <rect x={hx - 48} y={hy - 32} width={96} height={22} rx={6} fill="#1F2937" />
        <text x={hx - 38} y={hy - 18} fill="white" fontSize={9} fontFamily="Inter, sans-serif">
          $32,104
        </text>
        <text x={hx + 8} y={hy - 18} fill="#34D399" fontSize={9} fontFamily="Inter, sans-serif">
          +6,488
        </text>
      </g>
    </svg>
  );
}
