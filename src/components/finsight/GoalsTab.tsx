import { motion } from "framer-motion";
import { Plus, Rocket, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatINR, goalAcceleration } from "@/lib/finsight";
import { useFinsight } from "./context";
import { GlassCard, Kicker, SectionHeader } from "./shared";

export function GoalsTab() {
  const { analysis, goals, addGoal, removeGoal, updateGoalCurrent } = useFinsight();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [monthly, setMonthly] = useState("");

  const add = () => {
    const t = parseFloat(target);
    const c = parseFloat(current) || 0;
    const m = parseFloat(monthly);
    if (!name.trim() || !t || t <= 0) return;
    addGoal({ name: name.trim(), emoji: emoji.trim() || "🎯", target: Math.round(t), current: Math.round(c), monthlyTarget: m > 0 ? Math.round(m) : undefined });
    setName("");
    setTarget("");
    setCurrent("");
    setMonthly("");
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        kicker="Financial goals"
        title="Goals with a plan"
        right={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-emerald-300"
          >
            <Plus className="size-3.5" />
            New goal
          </button>
        }
      />

      {showForm && (
        <GlassCard className="p-6">
          <Kicker>New goal</Kicker>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🎯" className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-center text-lg focus:border-emerald-400/40 focus:outline-none" />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goal name (e.g. Emergency fund)" className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none lg:col-span-2" />
            <input value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))} placeholder="Target ₹" className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 font-mono text-sm text-white placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none" />
            <input value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/[^\d]/g, ""))} placeholder="Monthly ₹ (optional)" className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 font-mono text-sm text-white placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none" />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={add} className="cursor-pointer rounded-full bg-emerald-400 px-5 py-2 text-xs font-semibold text-black hover:bg-emerald-300">
              Create goal
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="cursor-pointer rounded-full border border-white/12 px-5 py-2 text-xs text-white/60 hover:bg-white/10">
              Cancel
            </button>
          </div>
        </GlassCard>
      )}

      {goals.length === 0 && (
        <GlassCard className="p-10 text-center">
          <span className="text-3xl">🎯</span>
          <p className="mt-3 font-display text-xl font-semibold text-white">No goals yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/45">Add an emergency fund, a laptop, a trip — then see how your detected leaks can fund it faster.</p>
        </GlassCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {goals.map((g, i) => {
          const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
          const accel = goalAcceleration(analysis.potentialSavings.monthly, g.target, g.monthlyTarget);
          const monthsLeft = g.monthlyTarget && g.monthlyTarget > 0 ? Math.ceil(Math.max(0, g.target - g.current) / g.monthlyTarget) : null;
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{g.emoji}</span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-white">{g.name}</h3>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                      {g.monthlyTarget ? `${formatINR(g.monthlyTarget)}/month · ${monthsLeft ? `${monthsLeft} months left` : "no timeline"}` : "no monthly target"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeGoal(g.id)}
                  className="cursor-pointer rounded-full border border-white/10 p-2 text-white/30 transition-colors hover:border-rose-400/30 hover:text-rose-300"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-semibold text-white">
                    {formatINR(g.current)} <span className="text-base text-white/35">/ {formatINR(g.target)}</span>
                  </span>
                  <span className="font-mono text-sm font-semibold text-emerald-300">{pct}%</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
                    style={{ boxShadow: "0 0 12px rgba(52,211,153,0.5)" }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={g.target}
                  step={1000}
                  value={g.current}
                  onChange={(e) => updateGoalCurrent(g.id, parseFloat(e.target.value))}
                  className="mt-3 h-1 w-full cursor-pointer appearance-none"
                  style={{ accentColor: "#34d399" }}
                />
                <p className="mt-1 text-right font-mono text-[9px] uppercase tracking-[0.15em] text-white/25">drag to update progress</p>
              </div>

              {accel !== null && accel > 0 ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-violet-400/20 bg-violet-400/[0.07] p-3.5">
                  <Rocket className="mt-0.5 size-4 shrink-0 text-violet-300" />
                  <p className="text-xs leading-relaxed text-white/70">
                    If you redirect <span className="font-semibold text-white">{formatINR(analysis.potentialSavings.monthly)}/month</span> of detected
                    leaks toward this goal, you can reach it <span className="font-semibold text-violet-300">{accel} months earlier</span>.
                  </p>
                </div>
              ) : (
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/25">
                  Set a monthly target to get an AI acceleration estimate
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
