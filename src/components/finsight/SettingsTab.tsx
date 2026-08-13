import { motion } from "framer-motion";
import { Download, FileUp, Loader2, RefreshCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { parseCsv, transactionsToCsv, downloadText } from "@/lib/finsight";
import { useFinsight } from "./context";
import { GlassCard, Kicker, SectionHeader } from "./shared";

export function SettingsTab() {
  const { analysis, txs, loadDemo, importTxs, clearData } = useFinsight();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const result = parseCsv(text);
      if (result.txs.length) {
        importTxs(result.txs);
      } else {
        alert(`No transactions could be parsed.\n${result.errors.join("\n")}`);
      }
    } catch (e) {
      alert(`Failed to read file: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader kicker="Settings" title="Currency, data & privacy" />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* preferences */}
        <GlassCard className="p-6">
          <Kicker>Preferences</Kicker>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div>
                <p className="text-sm font-medium text-white/85">Currency</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/35">INR ₹ · India-first (UPI, NEFT, IMPS, ATM)</p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-white/70">₹ INR</span>
            </div>
            <button
              type="button"
              onClick={() => setReducedMotion((v) => !v)}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left"
            >
              <div>
                <p className="text-sm font-medium text-white/85">Reduced motion</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/35">Disable heavy 3D & ambient animation</p>
              </div>
              <span
                className={
                  "relative h-6 w-11 rounded-full transition-colors " + (reducedMotion ? "bg-emerald-400/70" : "bg-white/10")
                }
              >
                <span
                  className={
                    "absolute top-0.5 size-5 rounded-full bg-white transition-all " +
                    (reducedMotion ? "left-[22px]" : "left-0.5")
                  }
                />
              </span>
            </button>
          </div>
        </GlassCard>

        {/* data management */}
        <GlassCard className="p-6">
          <Kicker>Data management</Kicker>
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            {txs.length} transactions · {analysis.categories.length} categories · {analysis.monthlySeries.length} months analyzed.
            All processing happens in your browser — nothing is uploaded.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={loadDemo}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-400/20"
            >
              <RefreshCcw className="size-4" />
              Load demo data
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
              Import CSV
            </button>
            <button
              type="button"
              onClick={() => downloadText(`finsight-transactions-${new Date().toISOString().slice(0, 10)}.csv`, transactionsToCsv(txs), "text/csv")}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/10"
            >
              <Download className="size-4" />
              Export data
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete all financial data in this session? This cannot be undone.")) clearData();
              }}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/5 px-4 py-3 text-sm text-rose-300 transition-colors hover:bg-rose-400/15"
            >
              <Trash2 className="size-4" />
              Delete data
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </GlassCard>
      </div>

      {/* privacy */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-300" />
          <Kicker>Privacy & trust</Kicker>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Runs in your browser",
              detail: "Transaction parsing, detection and AI reasoning all execute locally. Your statements never leave this device.",
            },
            {
              title: "No personal data needed",
              detail: "We analyze amounts, dates and merchant names only. No Aadhaar, PAN, phone or location data is requested.",
            },
            {
              title: "You stay in control",
              detail: "Export, delete or replace your data any time from this page. Demo data is session-based and clearly labeled.",
            },
          ].map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
            >
              <p className="text-sm font-semibold text-white">{p.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/45">{p.detail}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3.5 text-xs leading-relaxed text-amber-100/70">
          <span className="font-semibold">Hackathon prototype:</span> banking integrations are simulated. Merchant normalization and anomaly scoring are
          heuristic demo engines. Potential-savings figures are estimates — we never claim guarantees or banking-grade security certifications.
        </p>
      </GlassCard>
    </div>
  );
}
