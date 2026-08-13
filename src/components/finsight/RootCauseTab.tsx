import { motion } from "framer-motion";
import { GitBranch, Info } from "lucide-react";
import type { TreeNode } from "@/lib/finsight";
import { formatINR } from "@/lib/finsight";
import { useFinsight } from "./context";
import { GlassCard, Kicker, SectionHeader } from "./shared";

export function RootCauseTab() {
  const { analysis } = useFinsight();
  const rc = analysis.rootCause;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader kicker="Root-cause engine" title="Why did your spending change?" />

      {/* headline */}
      <GlassCard glow="#f59e0b22" className="p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10">
            <GitBranch className="size-5 text-amber-300" />
          </span>
          <div>
            <Kicker>Root cause</Kicker>
            <h3 className="mt-1 font-display text-xl font-semibold leading-snug text-white sm:text-2xl">{rc.headline}</h3>
            <p className="mt-1.5 text-sm text-white/50">
              Monthly spending is <span className="font-semibold text-white/80">{rc.changePct >= 0 ? "+" : ""}{rc.changePct}%</span> vs your
              3-month average — an excess of <span className="font-semibold text-emerald-300">{formatINR(rc.excess)}</span> this month.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* tree */}
      <GlassCard className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <Kicker>Spending driver tree</Kicker>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">detection → explanation → impact</span>
        </div>
        <div className="mt-6 overflow-x-auto">
          <TreeNodeView node={rc.root} depth={0} />
        </div>
      </GlassCard>

      {/* how it works */}
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "Detection",
            detail: "We benchmark every category against its own 3-month average, so a busy month doesn't get confused with a leak.",
          },
          {
            title: "Explanation",
            detail: "For each driver we dig one level deeper — transaction counts, average order value, and late-night patterns.",
          },
          {
            title: "Impact",
            detail: "Every branch ends in the estimated excess in rupees, so you can see exactly what the behavior costs.",
          },
        ].map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.07 }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
          >
            <span className="font-mono text-[10px] text-emerald-300">0{i + 1}</span>
            <h4 className="mt-2 font-display text-base font-semibold text-white">{s.title}</h4>
            <p className="mt-1.5 text-xs leading-relaxed text-white/45">{s.detail}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-sky-300/70" />
        <p className="text-xs leading-relaxed text-white/45">
          The tree is computed from your transactions — every percentage is the difference between this month and your own 3-month average for that category.
          Excess figures are estimates of what you spent above your normal pattern.
        </p>
      </div>
    </div>
  );
}

function TreeNodeView({ node, depth }: { node: TreeNode; depth: number }) {
  const kindStyle: Record<string, string> = {
    root: "border-amber-400/40 bg-amber-400/[0.08]",
    branch: "border-sky-400/30 bg-sky-400/[0.05]",
    leaf: "border-white/10 bg-white/[0.03]",
  };
  const isExcess = node.label.includes("EXCESS");
  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: depth * 0.08 }}
        className={
          "relative z-10 w-full max-w-md rounded-xl border px-5 py-3.5 text-center " +
          (kindStyle[node.kind ?? "leaf"] ?? kindStyle.leaf)
        }
      >
        <p className={"font-mono text-[9px] uppercase tracking-[0.25em] " + (node.kind === "root" ? "text-amber-300/80" : "text-white/35")}>
          {node.label}
        </p>
        <p className={"mt-1 font-display text-2xl font-semibold " + (isExcess ? "text-emerald-300" : "text-white")}>{node.value}</p>
        {node.detail && <p className="mt-1 text-[11px] leading-relaxed text-white/45">{node.detail}</p>}
      </motion.div>

      {node.children && node.children.length > 0 && (
        <>
          {/* connector */}
          <div className="h-5 w-px bg-white/15" />
          <div className="relative w-full">
            {/* horizontal spine */}
            {node.children.length > 1 && <div className="absolute left-[12%] right-[12%] top-0 h-px bg-white/15" />}
            <div className="flex flex-wrap items-start justify-center gap-4">
              {node.children.map((child) => (
                <div key={child.label} className="flex flex-col items-center">
                  <div className="h-5 w-px bg-white/15" />
                  <TreeNodeView node={child} depth={depth + 1} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
