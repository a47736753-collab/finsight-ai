import { motion } from "framer-motion";
import { Check, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { categoryColor, formatINR } from "@/lib/finsight";
import { useFinsight } from "./context";
import { GlassCard, Kicker, Meter, SectionHeader } from "./shared";

export function AnomaliesTab() {
  const { analysis } = useFinsight();
  const [resolved, setResolved] = useState<Record<string, "confirmed" | "cleared">>({});
  const anomalies = analysis.anomalies.filter((a) => !resolved[a.id]);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        kicker="Anomaly detection"
        title="Unusual transactions"
        right={
          <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-1.5 font-mono text-xs text-rose-200">
            {anomalies.length} flagged
          </span>
        }
      />

      {anomalies.length === 0 && (
        <GlassCard className="p-10 text-center">
          <span className="text-3xl">✅</span>
          <p className="mt-3 font-display text-xl font-semibold text-white">No unusual transactions</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/45">
            Every transaction is compared against its merchant's typical size. Nothing currently stands out.
          </p>
        </GlassCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {anomalies.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex flex-col gap-4 rounded-2xl border border-rose-400/20 bg-rose-400/[0.03] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-400/10">
                  <ShieldAlert className="size-4 text-rose-300" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">
                    {formatINR(a.tx.amount)} at {a.tx.merchant}
                  </h3>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                    {a.tx.date} · {a.tx.category}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-semibold" style={{ color: scoreColor(a.score) }}>
                  {a.score}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/35">anomaly score</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">Normal for {a.tx.merchant}</span>
                <span className="font-mono text-white/80">{formatINR(a.baseline)} · {a.multiple.toFixed(1)}×</span>
              </div>
              <Meter value={a.score} color={scoreColor(a.score)} className="mt-2" />
            </div>

            <div className="rounded-xl border border-white/10 bg-black/25 p-3.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Why flagged</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {a.reasons.map((r, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs leading-relaxed text-white/60">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-rose-400/70" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto flex gap-2">
              <button
                type="button"
                onClick={() => setResolved((prev) => ({ ...prev, [a.id]: "confirmed" }))}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-400/20"
              >
                <Check className="size-3" />
                I made this purchase
              </button>
              <button
                type="button"
                onClick={() => setResolved((prev) => ({ ...prev, [a.id]: "cleared" }))}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="size-3" />
                Not mine — investigate
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* duplicates */}
      {analysis.duplicates.length > 0 && (
        <div>
          <SectionHeader kicker="Duplicate detector" title="Potential duplicate payments" />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {analysis.duplicates.map((d) => {
              const res = resolved[d.id];
              return (
                <GlassCard key={d.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{d.a.merchant}</span>
                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 font-mono text-[10px] text-amber-300">
                      {d.confidence}% confidence
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">{d.a.date}</p>
                      <p className="font-mono text-lg text-white">{formatINR(d.a.amount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-[10px] text-amber-300">{d.minutesApart} min apart</p>
                      <p className="font-mono text-[9px] text-white/30">same amount</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">{d.b.date}</p>
                      <p className="font-mono text-lg text-white">{formatINR(d.b.amount)}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-white/40">{d.reason}</p>
                  <div className="mt-3 flex gap-2">
                    {!res && (
                      <>
                        <button
                          type="button"
                          onClick={() => setResolved((prev) => ({ ...prev, [d.id]: "confirmed" }))}
                          className="cursor-pointer rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-400/20"
                        >
                          Confirm duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => setResolved((prev) => ({ ...prev, [d.id]: "cleared" }))}
                          className="cursor-pointer rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white"
                        >
                          Not a duplicate
                        </button>
                      </>
                    )}
                    {res === "confirmed" && (
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-200">
                        ✓ confirmed — request a refund from {d.a.merchant}
                      </span>
                    )}
                    {res === "cleared" && (
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-200">
                        ✓ cleared — legitimate
                      </span>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* methodology note */}
      <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-sky-300/70" />
        <p className="text-xs leading-relaxed text-white/45">
          Anomaly scores compare each transaction against its merchant's median size and your typical spending hours. Scores ≥ 60 are surfaced here.
          Confirming or clearing an anomaly teaches the session model and removes it from future counts.
        </p>
      </div>
    </div>
  );
}

function scoreColor(s: number) {
  return s >= 85 ? "#fb7185" : s >= 70 ? "#fbbf24" : "#34d399";
}
