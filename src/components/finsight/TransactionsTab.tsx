import { AnimatePresence, motion } from "framer-motion";
import { Download, FileUp, Search, ShieldAlert, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { CategoryId, Transaction } from "@/lib/finsight";
import { CATEGORIES, categoryColor, formatINR, parseCsv, transactionsToCsv, downloadText } from "@/lib/finsight";
import { useFinsight } from "./context";
import { GlassCard, Kicker, SectionHeader } from "./shared";

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.id !== "income");

export function TransactionsTab() {
  const { analysis, recategorize, importTxs } = useFinsight();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [sort, setSort] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const [showImport, setShowImport] = useState(false);
  const [preview, setPreview] = useState<{ txs: Transaction[]; errors: string[]; skipped: number; detected: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const anomalyIds = useMemo(() => new Set(analysis.anomalies.map((a) => a.tx.id)), [analysis.anomalies]);

  const filtered = useMemo(() => {
    let out = [...analysis.txs];
    if (q.trim()) {
      const needle = q.toLowerCase();
      out = out.filter((t) => `${t.merchant} ${t.description} ${t.category}`.toLowerCase().includes(needle));
    }
    if (cat !== "all") out = out.filter((t) => t.category === cat);
    const lo = parseFloat(minAmt);
    const hi = parseFloat(maxAmt);
    if (!Number.isNaN(lo)) out = out.filter((t) => t.amount >= lo);
    if (!Number.isNaN(hi)) out = out.filter((t) => t.amount <= hi);
    out.sort((a, b) => {
      if (sort === "date-desc") return a.date < b.date ? 1 : -1;
      if (sort === "date-asc") return a.date > b.date ? 1 : -1;
      if (sort === "amount-desc") return b.amount - a.amount;
      return a.amount - b.amount;
    });
    return out;
  }, [analysis.txs, q, cat, minAmt, maxAmt, sort]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = parseCsv(text);
    setPreview({
      txs: result.txs,
      errors: result.errors,
      skipped: result.skipped,
      detected: result.detectedColumns,
    });
  };

  const doExport = () => {
    downloadText(`finsight-transactions-${new Date().toISOString().slice(0, 10)}.csv`, transactionsToCsv(filtered), "text/csv");
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        kicker="Transactions"
        title="Every transaction, searchable"
        right={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowImport((v) => !v);
                setPreview(null);
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-400/20"
            >
              <FileUp className="size-3.5" />
              Upload Statement
            </button>
            <button
              type="button"
              onClick={doExport}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Download className="size-3.5" />
              Export
            </button>
          </div>
        }
      />

      {/* import panel */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="p-6">
              <Kicker>Import statement</Kicker>
              <h3 className="mt-1 font-display text-xl font-semibold text-white">Upload CSV / Excel export</h3>
              <p className="mt-1 max-w-xl text-sm text-white/50">
                Expected columns: <span className="font-mono text-white/70">Date, Description, Amount, Type, Category, Payment Method</span>.
                Columns are auto-mapped and merchants are normalized (UPI handles → names). Everything is processed in your browser — nothing leaves this device.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer rounded-xl border border-dashed border-white/25 bg-white/[0.02] px-6 py-3 text-sm text-white/70 transition-colors hover:border-emerald-400/50 hover:text-white"
                >
                  Choose .csv file
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadText("finsight-sample.csv", sampleCsv(), "text/csv");
                  }}
                  className="cursor-pointer rounded-xl border border-white/10 px-4 py-3 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Download sample CSV
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {preview && (
                <div className="mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 font-mono text-[11px] text-emerald-200">
                        {preview.txs.length} transactions parsed
                      </span>
                      {preview.skipped > 0 && (
                        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-mono text-[11px] text-amber-200">
                          {preview.skipped} rows skipped
                        </span>
                      )}
                      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/35">
                        mapped: {preview.detected.join(", ") || "minimal"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        importTxs(preview.txs);
                        setShowImport(false);
                        setPreview(null);
                      }}
                      className="cursor-pointer rounded-full bg-emerald-400 px-5 py-2 text-xs font-semibold text-black transition-colors hover:bg-emerald-300"
                    >
                      Import {preview.txs.length} transactions
                    </button>
                  </div>
                  {preview.errors.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                      {preview.errors.map((e, i) => (
                        <li key={i} className="text-[11px] text-amber-200/80">
                          ⚠ {e}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                          <th className="pb-2 pr-3">Date</th>
                          <th className="pb-2 pr-3">Merchant</th>
                          <th className="pb-2 pr-3">Category</th>
                          <th className="pb-2 pr-3">Amount</th>
                          <th className="pb-2 pr-3">Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.txs.slice(0, 8).map((t) => (
                          <tr key={t.id} className="border-t border-white/5">
                            <td className="py-2 pr-3 font-mono text-white/60">{t.date}</td>
                            <td className="py-2 pr-3 text-white/85">{t.merchant}</td>
                            <td className="py-2 pr-3">
                              <span className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase" style={{ backgroundColor: `${categoryColor(t.category)}22`, color: categoryColor(t.category) }}>
                                {t.category}
                              </span>
                            </td>
                            <td className="py-2 pr-3 font-mono text-white/85">{formatINR(t.amount)}</td>
                            <td className="py-2 pr-3 font-mono text-white/50">{t.payment}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* filters */}
      <GlassCard className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search merchant, description, category…"
              className="h-10 w-full rounded-xl border border-white/10 bg-black/30 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none"
            />
          </div>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value as CategoryId | "all")}
            className="h-10 cursor-pointer rounded-xl border border-white/10 bg-[#0a0d17] px-3 text-sm text-white/70 focus:border-emerald-400/40 focus:outline-none"
          >
            <option value="all">All categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              value={minAmt}
              onChange={(e) => setMinAmt(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="Min ₹"
              className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 font-mono text-xs text-white placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none"
            />
            <input
              value={maxAmt}
              onChange={(e) => setMaxAmt(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="Max ₹"
              className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 font-mono text-xs text-white placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-10 cursor-pointer rounded-xl border border-white/10 bg-[#0a0d17] px-3 text-sm text-white/70 focus:border-emerald-400/40 focus:outline-none"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Amount ↓</option>
            <option value="amount-asc">Amount ↑</option>
          </select>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
          {filtered.length} of {analysis.txs.length} transactions
        </p>
      </GlassCard>

      {/* table */}
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.03]">
              <tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Merchant</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">AI conf.</th>
                <th className="px-4 py-3">Anomaly</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 150).map((t) => (
                <tr key={t.id} className="group border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-white/55">{t.date}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white/85">{t.merchant}</span>
                      {t.normalized && (
                        <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-sky-300/80">
                          UPI
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 max-w-[220px] truncate font-mono text-[9px] text-white/25">{t.description}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={t.category}
                      onChange={(e) => recategorize(t.id, e.target.value as CategoryId)}
                      className="cursor-pointer rounded-lg border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px] focus:border-emerald-400/50 focus:outline-none"
                      style={{ color: categoryColor(t.category) }}
                      title="Correct category — the engine learns from corrections"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c.id} value={c.id} className="text-white">
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-white/90">{formatINR(t.amount)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-white/50">{t.payment}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        t.status === "settled"
                          ? "rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] uppercase text-emerald-300"
                          : t.status === "pending"
                            ? "rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 font-mono text-[9px] uppercase text-amber-300"
                            : "rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 font-mono text-[9px] uppercase text-rose-300"
                      }
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-10 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${t.confidence}%`, backgroundColor: t.confidence >= 90 ? "#34d399" : t.confidence >= 75 ? "#fbbf24" : "#fb7185" }}
                        />
                      </div>
                      <span className="font-mono text-[9px] text-white/45">{t.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {anomalyIds.has(t.id) ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 font-mono text-[9px] uppercase text-rose-300">
                        <ShieldAlert className="size-2.5" /> unusual
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] text-white/20">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <span className="text-2xl">🔍</span>
            <p className="text-sm text-white/60">No transactions match your filters.</p>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setCat("all");
                setMinAmt("");
                setMaxAmt("");
              }}
              className="cursor-pointer text-xs text-emerald-300 underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
        {filtered.length > 150 && (
          <p className="border-t border-white/5 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            Showing 150 of {filtered.length} — narrow your search to see more
          </p>
        )}
      </div>
    </div>
  );
}

function sampleCsv() {
  const header = "Date,Description,Amount,Type,Category,Payment Method";
  const rows = [
    "05/08/2026,UPI/123456/SWIGGY@OKHDFC,285,Debit,Food,UPI",
    "05/08/2026,ZOMATO ORDER 778899,312,Debit,Food,UPI",
    "04/08/2026,BIGBASKET GROCERY,1240,Debit,Groceries,UPI",
    "03/08/2026,NETFLIX.COM/MEMBERSHIP,649,Debit,Subscriptions,Card",
    "02/08/2026,BANK CHARGES/MAINTENANCE,300,Debit,Fees,Bank Charge",
    "01/08/2026,SALARY/ACME SOLUTIONS/NEFT,45000,Credit,Income,NEFT",
    "01/08/2026,AMAZON/ORDER/11223344,1299,Debit,Shopping,Card",
    "01/08/2026,AMAZON/ORDER/11223345,1299,Debit,Shopping,Card",
  ];
  return [header, ...rows].join("\n");
}
