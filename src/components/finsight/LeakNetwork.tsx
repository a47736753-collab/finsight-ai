import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { networkNodeDetail } from "@/lib/finsight/network";
import type { Anomaly, CategorySummary, DuplicatePair, NetworkResult, Subscription, Transaction } from "@/lib/finsight";
import { Kicker } from "./shared";

const W = 860;
const H = 520;

interface Pos {
  id: string;
  label: string;
  severity: number;
  value: number;
  group: string;
  x: number;
  y: number;
  r: number;
}

function severityColor(s: number) {
  if (s < 0.33) return "#34d399";
  if (s < 0.66) return "#fbbf24";
  return "#fb7185";
}

export function LeakNetwork({
  network,
  txs,
  categories,
  subs,
  anomalies,
  dups,
  compact,
}: {
  network: NetworkResult;
  txs: Transaction[];
  categories: CategorySummary[];
  subs: Subscription[];
  anomalies: Anomaly[];
  dups: DuplicatePair[];
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const positions = useMemo<Pos[]>(() => {
    const groups: Record<string, string[]> = { behavior: [], category: [], spending: [], consequence: [] };
    for (const n of network.nodes) {
      (groups[n.group] ??= []).push(n.id);
    }
    const lay = (ids: string[], y: number) =>
      ids.map((id, i) => {
        const node = network.nodes.find((n) => n.id === id)!;
        const x = ids.length === 1 ? W / 2 : (W * (i + 0.5)) / ids.length;
        return { id, label: node.label, severity: node.severity, value: node.value, group: node.group, x, y, r: 12 + node.severity * 14 };
      });
    return [...lay(groups.behavior ?? [], compact ? 60 : 70), ...lay(groups.category ?? [], compact ? 130 : 150), ...lay(groups.spending ?? [], compact ? 210 : 240), ...lay(groups.consequence ?? [], compact ? 300 : 350)];
  }, [network, compact]);

  const posOf = (id: string) => positions.find((p) => p.id === id);
  const selectedDetail = selected ? networkNodeDetail(selected, { txs, categories, subs, anomalies, dups }) : null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="relative min-h-[340px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(80%_70%_at_50%_40%,rgba(56,189,248,0.07),transparent_65%)]">
        <div className="pointer-events-none absolute left-4 top-3 z-10">
          <Kicker>Financial Leak Network</Kicker>
          <p className="mt-1 max-w-xs font-mono text-[9px] uppercase tracking-[0.15em] text-white/35">
            {network.headline}
          </p>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
          <defs>
            <style>{`
              @keyframes fs-pulse { 0%,100% { opacity: .5 } 50% { opacity: .12 } }
              @keyframes fs-dash { to { stroke-dashoffset: -24; } }
              .fs-link { stroke-dasharray: 3 6; animation: fs-dash 6s linear infinite; }
            `}</style>
          </defs>
          {network.links.map((l, i) => {
            const a = posOf(l.source);
            const b = posOf(l.target);
            if (!a || !b) return null;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2 + (b.y - a.y) * 0.18;
            const color = severityColor(Math.max(a.severity, b.severity));
            return (
              <motion.path
                key={i}
                d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                fill="none"
                stroke={color}
                strokeWidth={1 + l.strength * 2}
                opacity={0.16 + l.strength * 0.4}
                className="fs-link"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: i * 0.04 }}
              />
            );
          })}
          {positions.map((p, i) => {
            const color = severityColor(p.severity);
            const active = selected === p.id;
            return (
              <g
                key={p.id}
                transform={`translate(${p.x}, ${p.y})`}
                onClick={() => setSelected(active ? null : p.id)}
                className="cursor-pointer"
              >
                <circle r={p.r + 8} fill={color} opacity={0.15} style={{ animation: `fs-pulse ${2.2 + (i % 5) * 0.3}s ease-in-out infinite` }} />
                <motion.circle
                  r={p.r}
                  fill="rgba(5,6,12,0.85)"
                  stroke={color}
                  strokeWidth={active ? 2.5 : 1.4}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18, delay: i * 0.03 }}
                  style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
                />
                <text y={-p.r - 9} textAnchor="middle" className="fill-white/85" fontSize={compact ? 11 : 12.5} fontWeight={600}>
                  {p.label.length > 18 ? `${p.label.slice(0, 17)}…` : p.label}
                </text>
                <text y={p.r + 16} textAnchor="middle" className="fill-white/40" fontSize={9.5} fontFamily="monospace">
                  {p.group === "consequence" ? "" : valueShort(p.value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selectedDetail && (
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-5 lg:w-64"
        >
          <div className="flex items-start justify-between gap-2">
            <Kicker>Node detail</Kicker>
            <button type="button" onClick={() => setSelected(null)} className="cursor-pointer font-mono text-[10px] text-white/40 hover:text-white">
              ✕
            </button>
          </div>
          <h3 className="mt-2 font-display text-xl font-semibold text-white">{selectedDetail.title}</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {selectedDetail.lines.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-white/55">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-emerald-400/60" />
                {line}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}

function valueShort(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}
