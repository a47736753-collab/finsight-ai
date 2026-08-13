import { motion } from "framer-motion";
import { AlarmClock, Check, Repeat2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { formatINR } from "@/lib/finsight";
import { useFinsight } from "./context";
import { GlassCard, Kicker, SectionHeader, Sparkline } from "./shared";

export function SubscriptionsTab() {
  const { analysis } = useFinsight();
  const [reviewed, setReviewed] = useState<Record<string, "review" | "keep">>({});
  const subs = analysis.subscriptions;
  const totalMonthly = subs.reduce((s, x) => s + x.monthlyCost, 0);
  const priceRisers = subs.filter((s) => s.priceIncreasePct >= 10);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        kicker="Subscription intelligence"
        title="Recurring payments, decoded"
        right={
          <div className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-mono text-xs text-white/60">
            <Repeat2 className="size-3.5 text-fuchsia-300" />
            {subs.length} services · {formatINR(totalMonthly)}/mo · {formatINR(totalMonthly * 12)}/yr
          </div>
        }
      />

      {/* price increases banner */}
      {priceRisers.length > 0 && (
        <GlassCard glow="#fb923c33" className="border-amber-400/25 p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-amber-300" />
            <Kicker>Price-increase detector</Kicker>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {priceRisers.map((s) => {
              const first = s.priceHistory[0]?.amount ?? s.amount;
              const last = s.priceHistory[s.priceHistory.length - 1]?.amount ?? s.amount;
              return (
                <div key={s.id} className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{s.merchant}</span>
                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 font-mono text-[10px] text-amber-300">
                      +{s.priceIncreasePct}%
                    </span>
                  </div>
                  <p className="mt-1.5 font-mono text-xs text-white/60">
                    {formatINR(first)} → {formatINR(last)}/month
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-amber-200/80">
                    Extra annual cost ≈ {formatINR(Math.max(0, (last - first) * 12))}
                  </p>
                  <div className="mt-2">
                    <Sparkline data={s.priceHistory.map((p) => p.amount)} color="#fbbf24" width={180} height={30} />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* subscription cards */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {subs.map((s, i) => {
          const status = reviewed[s.id];
          const history = s.priceHistory.map((p) => p.amount);
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={
                "flex flex-col gap-3 rounded-2xl border p-5 " +
                (status === "keep"
                  ? "border-emerald-400/25 bg-emerald-400/[0.04]"
                  : s.unused
                    ? "border-rose-400/25 bg-rose-400/[0.03]"
                    : "border-white/10 bg-white/[0.03]")
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">{s.merchant}</h3>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                    {s.frequency} · since {s.firstSeen} · {s.monthsActive} months
                  </p>
                </div>
                {s.unused && (
                  <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-rose-300">
                    possibly unused
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-semibold text-white">{formatINR(s.monthlyCost)}</span>
                <span className="font-mono text-[10px] text-white/40">/month</span>
                <span className="ml-auto font-mono text-xs text-fuchsia-300">{formatINR(s.annualCost)}/yr</span>
              </div>

              {history.length >= 2 ? (
                <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">Price history</p>
                  <div className="mt-1.5 flex items-end justify-between gap-3">
                    <Sparkline data={history} color={s.priceIncreasePct >= 10 ? "#fbbf24" : "#34d399"} width={150} height={30} />
                    <span className="font-mono text-[10px] text-white/45">{history.map((h) => formatINR(h)).join(" → ")}</span>
                  </div>
                </div>
              ) : (
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/25">Not enough history for a price chart</p>
              )}

              <div className="mt-auto flex gap-2">
                {status === undefined && (
                  <>
                    <button
                      type="button"
                      onClick={() => setReviewed((prev) => ({ ...prev, [s.id]: "review" }))}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-400/20"
                    >
                      <AlarmClock className="size-3" />
                      Review subscription
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewed((prev) => ({ ...prev, [s.id]: "keep" }))}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <Check className="size-3" />
                      Keep
                    </button>
                  </>
                )}
                {status === "review" && (
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-200">
                    ⏰ reminder set — we can't cancel services for you
                  </span>
                )}
                {status === "keep" && (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-200">
                    ✓ kept
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {subs.length === 0 && (
        <GlassCard className="p-10 text-center">
          <p className="text-sm text-white/50">No recurring payments detected in this dataset.</p>
        </GlassCard>
      )}
    </div>
  );
}
