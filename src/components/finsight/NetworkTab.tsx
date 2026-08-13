import { motion } from "framer-motion";
import { Network } from "lucide-react";
import { useFinsight } from "./context";
import { LeakNetwork } from "./LeakNetwork";
import { GlassCard, Kicker, SectionHeader } from "./shared";

export function NetworkTab() {
  const { analysis } = useFinsight();

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        kicker="Financial Leak Network"
        title="How your problems connect"
        right={
          <span className="rounded-full border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/45">
            {analysis.network.nodes.length} nodes · {analysis.network.links.length} relationships
          </span>
        }
      />

      <GlassCard className="p-5 sm:p-6">
        <div className="flex items-start gap-3 rounded-2xl border border-sky-400/15 bg-sky-400/[0.04] p-4">
          <Network className="mt-0.5 size-4 shrink-0 text-sky-300" />
          <p className="text-sm leading-relaxed text-white/70">
            <span className="font-semibold text-white">{analysis.network.headline}</span> — click any node to see what it costs and how it feeds the cascade.
          </p>
        </div>
        <div className="mt-4">
          <LeakNetwork
            network={analysis.network}
            txs={analysis.txs}
            categories={analysis.categories}
            subs={analysis.subscriptions}
            anomalies={analysis.anomalies}
            dups={analysis.duplicates}
          />
        </div>
      </GlassCard>

      {/* legend */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Behaviors", color: "#fbbf24", detail: "Actions that start the cascade" },
          { label: "Categories", color: "#38bdf8", detail: "Where the money lands" },
          { label: "Monthly spending", color: "#34d399", detail: "The central pressure point" },
          { label: "Consequences", color: "#fb7185", detail: "What leaks eventually cost" },
        ].map((g, i) => (
          <motion.div
            key={g.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
          >
            <span className="size-2.5 rounded-full" style={{ backgroundColor: g.color, boxShadow: `0 0 10px ${g.color}66` }} />
            <p className="mt-2 text-sm font-semibold text-white">{g.label}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">{g.detail}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <Kicker className="!text-sky-300/70">Read it like this</Kicker>
        <p className="text-xs leading-relaxed text-white/45">
          Follow the arrows from top to bottom: a behavior (late-night ordering, micro-spending, subscriptions) feeds a category, which feeds monthly
          spending, which lowers savings, raises credit utilization and eventually produces interest cost. Node color shows severity — red means it's
          costing you the most relative to your income.
        </p>
      </div>
    </div>
  );
}
