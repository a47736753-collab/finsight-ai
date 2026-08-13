import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Lightbulb, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Insight } from "@/lib/finsight";
import { useFinsight } from "./context";
import { GlassCard, KindBadge, Kicker, Meter, SectionHeader, SeverityBadge } from "./shared";

export function InsightsTab() {
  const { analysis } = useFinsight();
  const [open, setOpen] = useState<string | null>(null);
  const profile = analysis.profile;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        kicker="Explainable AI"
        title="AI Insights"
        right={
          <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/45">
            <Sparkles className="size-3 text-emerald-300" />
            Every insight cites your data
          </div>
        }
      />

      {/* insights */}
      <div className="grid gap-4 lg:grid-cols-2">
        {analysis.insights.map((ins, i) => (
          <InsightCard key={ins.id} insight={ins} index={i} open={open === ins.id} onToggle={() => setOpen(open === ins.id ? null : ins.id)} />
        ))}
      </div>

      {/* behavior profile */}
      <GlassCard glow="#c084fc22" className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Kicker>AI-generated profile</Kicker>
            <h3 className="mt-1 font-display text-2xl font-semibold text-white">Your financial personality</h3>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/50">{profile.tagline}</p>
          </div>
          <div className="rounded-2xl border border-violet-400/25 bg-violet-400/10 px-5 py-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-violet-300/70">Profile</p>
            <p className="mt-1 font-display text-2xl font-semibold text-white">“{profile.title}”</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Traits</p>
            <div className="mt-3 flex flex-col gap-3">
              {profile.traits.map((t) => (
                <div key={t.label} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-300/80" />
                  <div>
                    <p className="text-xs font-semibold text-white/85">{t.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{t.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Your blind spots</p>
            <div className="mt-3 flex flex-col gap-3">
              {profile.blindSpots.map((b) => (
                <div key={b.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-white/85">{b.label}</p>
                    <span
                      className={
                        b.level === "HIGH"
                          ? "rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 font-mono text-[9px] text-rose-300"
                          : b.level === "MEDIUM"
                            ? "rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[9px] text-amber-300"
                            : "rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] text-emerald-300"
                      }
                    >
                      {b.level}
                    </span>
                  </div>
                  <Meter
                    value={b.level === "HIGH" ? 92 : b.level === "MEDIUM" ? 62 : 30}
                    color={b.level === "HIGH" ? "#fb7185" : b.level === "MEDIUM" ? "#fbbf24" : "#34d399"}
                    className="mt-2"
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-white/45">{b.detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.15em] text-white/25">
              Behavioral labels describe spending patterns — not diagnoses
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function InsightCard({ insight, index, open, onToggle }: { insight: Insight; index: number; open: boolean; onToggle: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <SeverityBadge level={insight.severity} />
          <KindBadge kind={insight.kind} />
        </div>
        <span className="font-mono text-[11px] text-white/40">{insight.confidence}% confidence</span>
      </div>

      <div>
        <h3 className="font-display text-lg font-semibold leading-snug text-white">{insight.what}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">{insight.why}</p>
      </div>

      <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-3.5 py-2.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-300/70">Impact</p>
        <p className="mt-0.5 font-mono text-sm text-emerald-200">{insight.impact}</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-sky-300/70">Recommended action</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/70">{insight.action}</p>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="flex cursor-pointer items-center gap-1.5 self-start font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 transition-colors hover:text-white"
      >
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        Why am I seeing this?
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Evidence · the transaction patterns behind this insight</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {insight.evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-white/55">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-sky-400/60" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
