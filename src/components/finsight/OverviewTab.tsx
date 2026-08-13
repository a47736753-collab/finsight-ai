import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Award, Flame, PiggyBank, ShieldAlert, Sparkles, TrendingUp, Zap } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR } from "@/lib/finsight";
import { useFinsight } from "./context";
import { GlassCard, Kicker, Money, PctPill, SectionHeader, SeverityBadge } from "./shared";
import { HealthRing } from "./HealthRing";
import { Universe3D, UniverseDetail } from "./Universe3D";
import type { CategorySummary } from "@/lib/finsight";

export function OverviewTab() {
  const { analysis, setTab, setCopilotOpen } = useFinsight();
  const [selected, setSelected] = useState<CategorySummary | null>(null);

  const stats = [
    { label: "Income", value: analysis.income, icon: TrendingUp, color: "#34d399", sub: "this month" },
    { label: "Spending", value: analysis.spending, icon: Zap, color: "#fb7185", sub: `${Math.round(analysis.savingsRate * 100)}% saved` },
    { label: "Savings", value: analysis.savings, icon: PiggyBank, color: "#38bdf8", sub: "income − spending" },
    { label: "Potential", value: analysis.potentialSavings.monthly, icon: Sparkles, color: "#e879f9", sub: "per month, from leaks" },
  ];

  const gamification = [
    { label: "Financial streak", value: `${analysis.gamification.streak}`, icon: Flame, color: "#fb923c", sub: "days without big spends" },
    { label: "Leak hunter", value: `${analysis.gamification.leaksFound}`, icon: AlertTriangle, color: "#fbbf24", sub: "leaks found" },
    { label: "Savings milestone", value: formatINR(analysis.gamification.savingsMilestone), icon: Award, color: "#34d399", sub: "potential / month" },
    { label: "Health level", value: `${analysis.gamification.level}`, icon: ShieldAlert, color: "#38bdf8", sub: analysis.gamification.levelLabel },
  ];

  const chartData = analysis.monthlySeries.map((m) => ({
    label: m.label,
    Income: m.income,
    Spending: m.spending,
    Savings: m.savings,
  }));

  return (
    <div className="flex flex-col gap-8">
      {/* top row: health + stats */}
      <div className="grid gap-5 lg:grid-cols-3">
        <HealthRing health={analysis.health} />

        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
              >
                <GlassCard glow={`${s.color}33`} className="p-5">
                  <div className="flex items-center justify-between">
                    <Icon className="size-4" style={{ color: s.color }} />
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">{s.sub}</span>
                  </div>
                  <Money value={s.value} className="mt-3 block font-display text-2xl font-semibold text-white" />
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">{s.label}</p>
                </GlassCard>
              </motion.div>
            );
          })}

          <GlassCard className="col-span-2 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className="size-4 text-amber-300" />
                <div>
                  <p className="text-sm font-medium text-white/85">Financial risk: {analysis.riskLabel}</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Based on trend + anomalies + recurring charges</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">{analysis.alerts.length} active alerts</span>
                <button
                  type="button"
                  onClick={() => setTab("forecast")}
                  className="cursor-pointer rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/60 transition-colors hover:border-white/30 hover:text-white"
                >
                  Forecast →
                </button>
              </div>
            </div>
            <div className="mt-3 flex h-2 w-full gap-1">
              {analysis.monthlySeries.map((m, i) => {
                const max = Math.max(...analysis.monthlySeries.map((x) => x.spending), 1);
                return (
                  <div key={m.month} className="flex flex-1 flex-col justify-end">
                    <div
                      className="rounded-sm bg-amber-400/70"
                      style={{ height: `${Math.max(6, (m.spending / max) * 100)}%`, opacity: 0.5 + (i / analysis.monthlySeries.length) * 0.5 }}
                    />
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* gamification strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {gamification.map((g, i) => {
          const Icon = g.icon;
          return (
            <motion.div
              key={g.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <span className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-black/30">
                <Icon className="size-4" style={{ color: g.color }} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold text-white">{g.value}</p>
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">{g.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* insights + alerts */}
      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <Kicker>AI Insights</Kicker>
              <h3 className="mt-1 font-display text-xl font-semibold text-white">Top findings in your data</h3>
            </div>
            <button
              type="button"
              onClick={() => setTab("insights")}
              className="cursor-pointer rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 hover:border-white/30 hover:text-white"
            >
              View all →
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {analysis.insights.slice(0, 3).map((ins, i) => (
              <motion.button
                key={ins.id}
                type="button"
                onClick={() => setTab("insights")}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.07 }}
                className="group flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:border-white/25"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 font-mono text-[11px] text-emerald-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{ins.what}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">{ins.why}</p>
                  <p className="mt-1.5 font-mono text-[11px] text-emerald-300/80">{ins.impact}</p>
                </div>
                <ArrowRight className="mt-1 size-3.5 shrink-0 text-white/25 transition-transform group-hover:translate-x-1 group-hover:text-white/60" />
              </motion.button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <Kicker>Smart Alerts</Kicker>
              <h3 className="mt-1 font-display text-xl font-semibold text-white">Priority queue</h3>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            {analysis.alerts.slice(0, 6).map((a, i) => (
              <motion.button
                key={a.id}
                type="button"
                onClick={() => setTab(a.page as never)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left transition-colors hover:border-white/25"
              >
                <SeverityBadge level={a.level} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white/85">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-white/45">{a.detail}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* flow chart + universe */}
      <div className="grid gap-5 lg:grid-cols-5">
        <GlassCard className="p-5 lg:col-span-3">
          <SectionHeader kicker="Timeline" title="Income · Spending · Savings" />
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ background: "#0a0d17", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                  formatter={(value: number | string, name: string) => [formatINR(Number(value)), name]}
                />
                <Area type="monotone" dataKey="Income" stroke="#34d399" strokeWidth={2} fill="url(#gIncome)" />
                <Area type="monotone" dataKey="Spending" stroke="#fb7185" strokeWidth={2} fill="url(#gSpend)" />
                <Area type="monotone" dataKey="Savings" stroke="#38bdf8" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400" /> Income</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-400" /> Spending</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-400" /> Savings</span>
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col gap-4 p-5 lg:col-span-2">
          <SectionHeader kicker="3D Financial Universe" title="Where your money orbits" />
          <div className="h-72">
            <Universe3D categories={analysis.categories} income={analysis.income} onSelect={(sel) => setSelected(sel.category)} />
          </div>
          {selected ? (
            <UniverseDetail selection={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
              Click a node to inspect a category
            </div>
          )}
        </GlassCard>
      </div>

      {/* bottom CTA */}
      <GlassCard className="flex flex-wrap items-center justify-between gap-4 border-emerald-400/20 bg-emerald-400/[0.04] p-5">
        <div className="flex items-center gap-3">
          <Sparkles className="size-5 shrink-0 text-emerald-300" />
          <div>
            <p className="text-sm font-semibold text-white">
              {analysis.potentialSavings.monthly > 0
                ? `${formatINR(analysis.potentialSavings.monthly)}/month in potential savings detected`
                : "No leaks detected — keep tracking"}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">DON'T JUST TRACK MONEY · UNDERSTAND IT</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("leaks")}
            className="cursor-pointer rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-emerald-300"
          >
            See the leaks
          </button>
          <button
            type="button"
            onClick={() => setCopilotOpen(true)}
            className="cursor-pointer rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10"
          >
            Ask the copilot
          </button>
        </div>
      </GlassCard>

      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">
        <span>{analysis.txs.length} transactions</span>·<span>{analysis.categories.length} categories</span>·
        <span>{analysis.subscriptions.length} subscriptions</span>·<span>{analysis.monthlySeries.length} months analyzed</span>
      </div>
    </div>
  );
}
