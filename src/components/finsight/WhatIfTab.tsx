import { AnimatePresence, motion } from "framer-motion";
import { FlaskConical, RotateCcw, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import type { CategoryId } from "@/lib/finsight";
import { SCENARIO_CATEGORIES, buildOptimalScenario, categoryColor, categoryMeta, currentCategorySpend, formatINR, simulateScenario } from "@/lib/finsight";
import { useFinsight } from "./context";
import { GlassCard, Kicker, SectionHeader } from "./shared";

export function WhatIfTab() {
  const { analysis } = useFinsight();
  const cats = analysis.categories.filter((c) => SCENARIO_CATEGORIES.includes(c.id) && c.amount > 0);

  const currentMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of cats) m[c.id] = currentCategorySpend(analysis.txs, c.id) || c.amount;
    return m;
  }, [cats, analysis.txs]);

  const [targets, setTargets] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const c of cats) m[c.id] = currentCategorySpend(analysis.txs, c.id) || c.amount;
    return m;
  });
  const [rationale, setRationale] = useState<string[]>([]);

  const adjustments = useMemo(
    () =>
      cats
        .filter((c) => targets[c.id] !== undefined && targets[c.id] < (currentMap[c.id] ?? 0))
        .map((c) => ({ category: c.id as CategoryId, current: currentMap[c.id] ?? 0, target: targets[c.id] ?? 0 })),
    [cats, targets, currentMap],
  );

  const result = useMemo(() => simulateScenario(analysis.txs, analysis.categories, adjustments), [analysis.txs, analysis.categories, adjustments]);

  const buildOptimal = () => {
    const opt = buildOptimalScenario(analysis.txs, analysis.categories, analysis.subscriptions, analysis.anomalies);
    const next: Record<string, number> = { ...currentMap };
    for (const a of opt.adjustments) next[a.category] = a.target;
    // keep untouched categories at current
    setTargets(next);
    setRationale(opt.rationale);
  };

  const reset = () => {
    setTargets({ ...currentMap });
    setRationale([]);
  };

  const savingPct = analysis.spending > 0 ? Math.round((result.monthly / analysis.spending) * 100) : 0;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        kicker="Behavior simulator"
        title="What if you changed your spending?"
        right={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={buildOptimal}
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-violet-400 px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-violet-300"
            >
              <Sparkles className="size-3.5" />
              Build my optimal scenario
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </button>
          </div>
        }
      />

      {/* results */}
      <div className="grid gap-5 lg:grid-cols-3">
        <ResultCard value={result.monthly} label="Monthly saving" note="potential" color="#34d399" />
        <ResultCard value={result.annual} label="Annual saving" note="× 12" color="#38bdf8" />
        <ResultCard value={result.threeYear} label="3-year potential" note="simple projection" color="#e879f9" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* sliders */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2">
            <FlaskConical className="size-4 text-violet-300" />
            <Kicker>Adjust monthly budgets</Kicker>
          </div>
          <div className="mt-5 flex flex-col gap-5">
            {cats.map((c) => {
              const cur = currentMap[c.id] ?? 0;
              const target = targets[c.id] ?? cur;
              const saving = Math.max(0, cur - target);
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: categoryColor(c.id) }}>
                        {categoryMeta(c.id).emoji}
                      </span>
                      <span className="text-sm font-medium text-white/85">{c.label}</span>
                    </div>
                    <div className="flex items-baseline gap-2 font-mono text-xs">
                      <span className={saving > 0 ? "text-white/40 line-through" : "text-white/50"}>{formatINR(cur)}</span>
                      <span className="text-white/30">→</span>
                      <span className="font-semibold text-white">{formatINR(Math.round(target))}</span>
                      {saving > 0 && <span className="text-emerald-300">−{formatINR(saving)}</span>}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(cur * 1.05, 100)}
                    step={50}
                    value={target}
                    onChange={(e) => setTargets((prev) => ({ ...prev, [c.id]: parseFloat(e.target.value) }))}
                    className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full"
                    style={{ accentColor: categoryColor(c.id) }}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.15em] text-white/25">
            Drag below current to create savings · all figures are potential
          </p>
        </GlassCard>

        {/* projection */}
        <GlassCard glow="#34d39922" className="p-6">
          <Kicker>Projected impact</Kicker>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Savings rate</p>
              <p className="mt-1 font-display text-3xl font-semibold text-white">
                {Math.round(analysis.savingsRate * 100)}% → {Math.round(result.savingsRateAfter * 100)}%
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Spending cut</p>
              <p className="mt-1 font-display text-3xl font-semibold text-white">{savingPct}%</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Savings tower · potential</p>
            <div className="mt-3 flex items-end gap-2">
              {[
                { label: "Monthly", v: result.monthly, h: 30, color: "#34d399" },
                { label: "Annual", v: result.annual, h: 60, color: "#38bdf8" },
                { label: "3-Year", v: result.threeYear, h: 95, color: "#e879f9" },
              ].map((b) => (
                <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="font-mono text-[10px] text-white/60">{formatINR(b.v, { compact: true })}</span>
                  <motion.div
                    initial={{ height: 8 }}
                    animate={{ height: b.h }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full rounded-t-lg"
                    style={{ backgroundColor: b.color, boxShadow: `0 0 24px ${b.color}44` }}
                  />
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/35">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
            <TrendingUp className="mt-0.5 size-4 shrink-0 text-emerald-300" />
            <p className="text-xs leading-relaxed text-white/55">
              Current monthly savings <span className="font-mono text-white/80">{formatINR(analysis.savings)}</span> → after the plan{" "}
              <span className="font-mono text-emerald-300">{formatINR(result.newSavings)}</span>. Projections are estimates, not guarantees.
            </p>
          </div>
        </GlassCard>
      </div>

      {/* optimal scenario rationale */}
      <AnimatePresence>
        {rationale.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GlassCard className="p-6">
              <Kicker>AI-built optimal scenario</Kicker>
              <p className="mt-1 max-w-2xl text-sm text-white/50">
                Realistic reductions grounded in your own history — overspent categories return toward their averages, unused subscriptions are cancelled, avoidable fees removed.
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {rationale.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-400" />
                    {r}
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.15em] text-white/25">
                No guarantees — these are potential savings based on your transaction patterns
              </p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultCard({ value, label, note, color }: { value: number; label: string; note: string; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <GlassCard glow={`${color}33`} className="p-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/35">{label}</span>
          <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/40">{note}</span>
        </div>
        <motion.p
          key={value}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 font-display text-4xl font-semibold tracking-tight"
          style={{ color }}
        >
          {formatINR(value)}
        </motion.p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, 12 + Math.log10(Math.max(1, value)) * 16)}%` }}
            className="h-full rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}66` }}
          />
        </div>
      </GlassCard>
    </motion.div>
  );
}
