import { motion } from "framer-motion";
import { Download, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { downloadText, formatINR, reportMarkdown } from "@/lib/finsight";
import { useFinsight } from "./context";
import { GlassCard, Kicker, SectionHeader } from "./shared";

export function ReportsTab() {
  const { analysis } = useFinsight();
  const months = useMemo(() => analysis.monthlySeries.slice().reverse(), [analysis.monthlySeries]);
  const [month, setMonth] = useState(analysis.currentMonth);

  const md = useMemo(() => reportMarkdown(analysis, month), [analysis, month]);
  const mp = analysis.monthlySeries.find((m) => m.month === month);

  const download = () => {
    downloadText(`finsight-report-${month}.md`, md, "text/markdown");
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        kicker="Report generator"
        title="Your monthly financial report"
        right={
          <button
            type="button"
            onClick={download}
            className="flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-emerald-300"
          >
            <Download className="size-3.5" />
            Download Report
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard className="p-5">
          <Kicker>Report month</Kicker>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-white/10 bg-[#0a0d17] px-3 text-sm text-white focus:border-emerald-400/40 focus:outline-none"
          >
            {months.map((m) => (
              <option key={m.month} value={m.month}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { label: "Income", value: mp?.income ?? analysis.income, color: "text-emerald-300" },
              { label: "Spending", value: mp?.spending ?? analysis.spending, color: "text-rose-300" },
              { label: "Savings", value: mp?.savings ?? analysis.savings, color: "text-sky-300" },
              { label: "Subscriptions", value: mp?.subscriptions ?? 0, color: "text-fuchsia-300" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">{s.label}</p>
                <p className={`mt-1 font-display text-lg font-semibold ${s.color}`}>{formatINR(s.value)}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-emerald-300/80" />
            <Kicker>Preview</Kicker>
          </div>
          <div className="mt-3 max-h-[420px] overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-5 font-mono text-[11px] leading-relaxed text-white/60">
            {md.split("\n").map((line, i) => {
              if (line.startsWith("# ")) return <p key={i} className="mb-2 font-display text-base font-bold text-white">{line.slice(2)}</p>;
              if (line.startsWith("## ")) return <p key={i} className="mb-1.5 mt-4 font-display text-sm font-semibold text-emerald-300">{line.slice(3)}</p>;
              if (line.startsWith("### ")) return <p key={i} className="mb-1 mt-3 text-xs font-bold text-white/85">{line.slice(4)}</p>;
              if (line.startsWith("- ")) return <p key={i} className="pl-3">{line}</p>;
              return <p key={i}>{line || " "}</p>;
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
