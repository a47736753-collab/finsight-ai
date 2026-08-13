import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/finsight";
import type { ReactNode } from "react";

export function GlassCard({
  className,
  children,
  glow,
}: {
  className?: string;
  children: ReactNode;
  glow?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm",
        className,
      )}
    >
      {glow && (
        <div
          className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full opacity-25 blur-3xl"
          style={{ backgroundColor: glow }}
        />
      )}
      {children}
    </div>
  );
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[10px] uppercase tracking-[0.3em] text-white/40", className)}>
      {children}
    </p>
  );
}

export function SectionHeader({
  kicker,
  title,
  right,
  className,
}: {
  kicker: string;
  title: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <Kicker>{kicker}</Kicker>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

export function Money({ value, className, sign }: { value: number; className?: string; sign?: boolean }) {
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {formatINR(value, { sign })}
    </span>
  );
}

export function PctPill({ value, className }: { value: number | null; className?: string }) {
  if (value === null || value === undefined) return null;
  const up = value > 0;
  const neutral = value === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium",
        neutral
          ? "border-white/10 text-white/40"
          : up
            ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
            : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        className,
      )}
    >
      {neutral ? "0%" : `${up ? "▲" : "▼"} ${Math.abs(value)}%`}
    </span>
  );
}

export function SeverityBadge({ level, className }: { level: "critical" | "warning" | "info" | "success" | "high" | "medium" | "low"; className?: string }) {
  const map: Record<string, string> = {
    critical: "border-rose-400/30 bg-rose-500/10 text-rose-300",
    high: "border-rose-400/30 bg-rose-500/10 text-rose-300",
    warning: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    medium: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    info: "border-sky-400/30 bg-sky-500/10 text-sky-300",
    success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    low: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]", map[level] ?? map.info, className)}>
      {level}
    </span>
  );
}

export function KindBadge({ kind, className }: { kind: string; className?: string }) {
  const map: Record<string, string> = {
    actual: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    inference: "border-sky-400/30 bg-sky-500/10 text-sky-300",
    prediction: "border-violet-400/30 bg-violet-500/10 text-violet-300",
    recommendation: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    "potential saving": "border-teal-400/30 bg-teal-500/10 text-teal-300",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]", map[kind] ?? map.inference, className)}>
      {kind}
    </span>
  );
}

/** SVG donut chart for category share. */
export function Donut({
  data,
  size = 160,
  thickness = 18,
  centerLabel,
  centerSub,
}: {
  data: { id: string; label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
        {data.map((d) => {
          const frac = d.value / total;
          const dash = frac * c;
          const offset = -acc * c;
          acc += frac;
          return (
            <circle
              key={d.id}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              className="transition-all duration-700"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {centerLabel && <span className="font-display text-xl font-semibold text-white">{centerLabel}</span>}
        {centerSub && <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">{centerSub}</span>}
      </div>
    </div>
  );
}

/** Tiny SVG sparkline. */
export function Sparkline({
  data,
  color = "#34d399",
  width = 120,
  height = 32,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 2 - ((v - min) / span) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const id = `spark-${color.replace(/[^a-zA-Z0-9]/g, "")}-${width}-${height}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts.join(" ")} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Horizontal meter bar. */
export function Meter({ value, color = "#34d399", className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]", className)}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}66` }}
      />
    </div>
  );
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 p-10 text-center">
      <span className="text-2xl">🛰️</span>
      <p className="font-display text-lg font-semibold text-white">{title}</p>
      <p className="max-w-sm text-sm text-white/45">{detail}</p>
      {action}
    </div>
  );
}

export function Chip({ children, active, onClick, className }: { children: ReactNode; active?: boolean; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
          : "border-white/10 text-white/50 hover:border-white/30 hover:text-white/80",
        className,
      )}
    >
      {children}
    </button>
  );
}
