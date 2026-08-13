import { AnimatePresence, motion } from "framer-motion";
import { AlarmClock, Check, ChevronDown, Flame, ScanSearch, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import type { Leak } from "@/lib/finsight";
import { formatINR } from "@/lib/finsight";
import { useFinsight } from "./context";
import { GlassCard, Kicker, KindBadge, Money, SectionHeader } from "./shared";

export function LeaksTab() {
  const { analysis, setLeakStatus, setTab } = useFinsight();
  const [open, setOpen] = useState<string | null>(null);
  const pot = analysis.potentialSavings;
  const maxMonthly = Math.max(...pot.breakdown.map((b) => b.monthly), 1);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        kicker="Financial Leaks"
        title="Where your money is leaking"
        right={
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2">
            <Flame className="size-4 text-emerald-300" />
            <span className="font-mono text-xs text-emerald-200">
              {formatINR(pot.monthly)}/mo · {formatINR(pot.annual)}/yr potential
            </span>
          </div>
        }
      />

      {/* savings breakdown */}
      <GlassCard className="p-6">
        <Kicker>Money you could save</Kicker>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="font-display text-4xl font-semibold text-white">{formatINR(pot.monthly)}<span className="text-lg text-white/40">/month</span></span>
          <span className="font-mono text-xs text-emerald-300">{formatINR(pot.annual)}/year potential</span>
        </div>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
          Potential savings — estimates, not guarantees
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          {pot.breakdown.map((b, i) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="w-40 truncate text-xs text-white/70">{b.label}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(b.monthly / maxMonthly) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
                  style={{ boxShadow: "0 0 12px rgba(52,211,153,0.4)" }}
                />
              </div>
              <Money value={b.monthly} className="w-20 text-right text-xs text-white/80" />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* leak cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {analysis.leaks.map((leak, i) => (
          <LeakCard
            key={leak.id}
            leak={leak}
            index={i}
            open={open === leak.id}
            onToggle={() => setOpen(open === leak.id ? null : leak.id)}
            onAction={(action) => {
              if (action === "investigate") setOpen(open === leak.id ? null : leak.id);
              if (action === "dismiss") setLeakStatus(leak.id, "dismissed");
              if (action === "mark-useful") setLeakStatus(leak.id, "useful");
              if (action === "reminder") setLeakStatus(leak.id, "reminder");
            }}
          />
        ))}
      </div>

      {analysis.leaks.length === 0 && (
        <GlassCard className="p-10 text-center">
          <span className="text-3xl">🛡️</span>
          <p className="mt-3 font-display text-xl font-semibold text-white">No active leaks</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/45">
            Dismissed and marked-useful leaks are hidden. Load demo data to see the leak detector in action.
          </p>
        </GlassCard>
      )}

      {/* duplicate payments panel */}
      {analysis.duplicates.length > 0 && (
        <div>
          <SectionHeader kicker="Duplicate detector" title="Possible duplicate payments" />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {analysis.duplicates.slice(0, 4).map((d) => (
              <GlassCard key={d.id} className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ScanSearch className="size-4 text-amber-300" />
                    <span className="text-sm font-semibold text-white">{d.a.merchant}</span>
                  </div>
                  <KindBadge kind="inference" />
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">{d.a.date}</p>
                    <Money value={d.a.amount} className="text-lg text-white" />
                  </div>
                  <span className="font-mono text-[10px] text-white/30">+ {d.minutesApart} min</span>
                  <div className="text-right">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">{d.b.date}</p>
                    <Money value={d.b.amount} className="text-lg text-white" />
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/50">
                  {d.reason} · <span className="font-semibold text-amber-300">{d.confidence}% confidence</span>
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTab("anomalies")}
                    className="cursor-pointer rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-400/20"
                  >
                    Investigate
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* micro-spending */}
      <MicroPanel />
    </div>
  );
}

function LeakCard({
  leak,
  index,
  open,
  onToggle,
  onAction,
}: {
  leak: Leak;
  index: number;
  open: boolean;
  onToggle: () => void;
  onAction: (a: Leak["actions"][number]["action"]) => void;
}) {
  const kindColor: Record<Leak["kind"], string> = {
    subscription: "text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-400/10",
    fee: "text-rose-300 border-rose-400/30 bg-rose-400/10",
    micro: "text-amber-300 border-amber-400/30 bg-amber-400/10",
    price: "text-orange-300 border-orange-400/30 bg-orange-400/10",
    spike: "text-red-300 border-red-400/30 bg-red-400/10",
    overspend: "text-yellow-300 border-yellow-400/30 bg-yellow-400/10",
  };
  const kindLabel: Record<Leak["kind"], string> = {
    subscription: "Subscription leak",
    fee: "Fee leak",
    micro: "Micro-spending",
    price: "Price increase",
    spike: "Spending spike",
    overspend: "Category overspend",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${kindColor[leak.kind]}`}>
            {kindLabel[leak.kind]}
          </span>
          <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-white">{leak.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-white/50">{leak.detail}</p>
        </div>
        <div className="shrink-0 text-right">
          <Money value={leak.monthly} className="block font-display text-xl font-semibold text-emerald-300" />
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/35">/month · {formatINR(leak.annual)}/yr</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {leak.actions.map((a) => {
          const Icon = a.action === "dismiss" ? X : a.action === "mark-useful" ? Check : a.action === "reminder" ? AlarmClock : ScanSearch;
          return (
            <button
              key={a.action}
              type="button"
              onClick={() => onAction(a.action)}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              <Icon className="size-3" />
              {a.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-sky-300/70">Evidence · why am I seeing this?</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {leak.evidence.map((e, i) => (
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

      <button
        type="button"
        onClick={onToggle}
        className="flex cursor-pointer items-center gap-1 self-start font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 transition-colors hover:text-white"
      >
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        {open ? "Hide evidence" : "Show evidence"}
      </button>
    </motion.div>
  );
}

function MicroPanel() {
  const { analysis } = useFinsight();
  const micro = analysis.txs.filter((t) => t.kind === "expense" && t.amount <= 200);
  const total = micro.reduce((s, t) => s + t.amount, 0);
  const share = analysis.spending > 0 ? total / analysis.spending : 0;
  if (micro.length < 20) return null;
  const topMerchants = [...new Set(micro.map((t) => t.merchant))].slice(0, 5);

  return (
    <GlassCard className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Kicker>Micro-spending leak</Kicker>
          <h3 className="mt-1 font-display text-2xl font-semibold text-white">
            {micro.length} small transactions under ₹200
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/50">
            Total <Money value={Math.round(total)} className="font-semibold text-amber-300" /> — your small
            transactions represent <span className="font-semibold text-amber-300">{Math.round(share * 100)}%</span> of monthly spending.
            Individually tiny, cumulatively significant.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {topMerchants.map((m) => (
            <span key={m} className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] text-white/50">
              {m}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
        <ShieldCheck className="size-3.5 text-emerald-400/70" />
        AI insight: bundle small spends into a daily budget to see where the rest goes
      </div>
    </GlassCard>
  );
}
