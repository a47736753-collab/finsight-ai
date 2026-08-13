import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CalendarClock,
  Eye,
  Flame,
  FlaskConical,
  GitBranch,
  Network,
  Radar,
  ScanSearch,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router";
import { analyzeAll, formatINR, generateDemoTransactions } from "@/lib/finsight";
import { Universe3D } from "@/components/finsight/Universe3D";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl border border-emerald-400/40 bg-gradient-to-br from-emerald-400/25 to-sky-500/10">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="#34d399" strokeWidth="1.6" opacity="0.5" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="#34d399" />
        </svg>
      </span>
      <span className="font-display text-sm font-semibold tracking-tight text-white">
        FinSight <span className="text-emerald-300">AI</span>
      </span>
    </div>
  );
}

const FEATURES: { icon: LucideIcon; title: string; copy: string; color: string }[] = [
  { icon: Radar, title: "Financial Health Score", copy: "A weighted, explainable 0–100 score across spending control, savings, recurring load, fees, anomaly risk and goal progress.", color: "#34d399" },
  { icon: Flame, title: "Financial Leak Detector", copy: "Unused subscriptions, bank fees, micro-spending and price hikes — each one quantified in ₹/month and ₹/year.", color: "#fb7185" },
  { icon: GitBranch, title: "Root-Cause Engine", copy: "Not just “you spent more”. A visual tree shows which behavior drove it: late-night orders, average order value, extra transactions.", color: "#fbbf24" },
  { icon: FlaskConical, title: "What If? Simulator", copy: "Drag category budgets and watch monthly, annual and 3-year potential savings rebuild in real time.", color: "#e879f9" },
  { icon: BarChart3, title: "Future Leak Predictor", copy: "Forecast next month from your own trend, flag rising categories and surface the risk level before the month starts.", color: "#38bdf8" },
  { icon: Bot, title: "FinSight Copilot", copy: "Ask “where am I wasting money?” or “how can I save ₹5,000?” — every answer cites your actual transactions.", color: "#22d3ee" },
  { icon: Network, title: "Financial Leak Network", copy: "See how micro-spending feeds food delivery, which feeds monthly spend, savings, credit utilization and interest cost.", color: "#a78bfa" },
  { icon: CalendarClock, title: "Subscription Intelligence", copy: "Recurring payments with price history, annual cost and usage signals — review or keep, without fake cancellations.", color: "#f472b6" },
];

const PIPELINE = [
  "Transaction Intelligence",
  "Pattern Detection",
  "Anomaly Detection",
  "Root-Cause Analysis",
  "Prediction",
  "Recommendation Engine",
  "What-If Simulation",
  "Action Plan",
];

export default function Landing() {
  const navigate = useNavigate();

  const demo = useMemo(() => {
    try {
      const a = analyzeAll(generateDemoTransactions(), []);
      return a;
    } catch {
      return null;
    }
  }, []);

  const topInsight = demo?.insights.find((i) => i.type === "spending") ?? demo?.insights[0];

  return (
    <div className="min-h-screen bg-[#05060c] text-white antialiased">
      {/* ================= NAV ================= */}
      <nav className="absolute inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-5 sm:px-10 lg:px-16">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              className="cursor-pointer text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => navigate("/auth")}
            >
              Sign in
            </Button>
            <Button
              className="cursor-pointer bg-white text-black hover:bg-white/85"
              onClick={() => navigate("/dashboard")}
            >
              Open command center
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        {/* ambient background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/4 h-[30rem] w-[46rem] -translate-x-1/2 rounded-full bg-emerald-500/[0.07] blur-3xl" />
          <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-sky-500/[0.06] blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,transparent_45%,rgba(2,4,12,0.7)_100%)]" />
        </div>

        <div className="relative mx-auto grid max-w-[1600px] items-center gap-10 px-5 pb-20 pt-28 sm:px-10 sm:pt-36 lg:grid-cols-2 lg:gap-6 lg:px-16 lg:pb-28">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-300"
            >
              <Sparkles className="size-3" />
              AI financial blind-spot intelligence
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl"
            >
              Your money has
              <br />
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">
                blind spots.
              </span>
              <br />
              AI finds them.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.15 }}
              className="mt-6 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg"
            >
              FinSight AI analyzes your financial behavior, discovers hidden leaks, predicts future risks, and creates
              actionable strategies — so you know exactly <span className="text-white/85">where money leaks, why it leaks,
              what happens if you do nothing, and what to do next</span>.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.25 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Button
                size="lg"
                className="cursor-pointer bg-emerald-400 px-8 text-black hover:bg-emerald-300"
                onClick={() => navigate("/auth")}
              >
                Analyze my finances
                <ArrowRight className="ml-2 size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="cursor-pointer border-white/20 bg-transparent px-8 text-white hover:border-white/40 hover:bg-white/10"
                onClick={() => navigate("/dashboard")}
              >
                Explore the demo
              </Button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.35 }}
              className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35"
            >
              <span>Detect</span>
              <span className="text-emerald-400/60">→</span>
              <span>Explain</span>
              <span className="text-emerald-400/60">→</span>
              <span>Predict</span>
              <span className="text-emerald-400/60">→</span>
              <span>Simulate</span>
              <span className="text-emerald-400/60">→</span>
              <span>Act</span>
            </motion.div>
          </div>

          {/* hero 3D visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative h-[420px] sm:h-[500px]"
          >
            {demo ? (
              <Universe3D
                categories={demo.categories}
                income={demo.income}
                onSelect={() => undefined}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-white/10">
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/40">Rendering universe…</p>
              </div>
            )}
            {/* floating health chip */}
            {demo && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="absolute left-4 top-4 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-md"
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">Demo financial health</p>
                <p className="mt-1 font-display text-3xl font-semibold text-emerald-300">{demo.health.score}<span className="text-base text-white/40">/100</span></p>
              </motion.div>
            )}
            {demo && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.15 }}
                className="absolute bottom-4 right-4 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-md"
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">Found in demo data</p>
                <p className="mt-1 font-mono text-sm text-emerald-300">{formatINR(demo.potentialSavings.monthly)}/mo potential savings</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ================= TICKER ================= */}
      <section className="border-y border-white/[0.07] bg-[#07090f]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-5 font-mono text-[11px] uppercase tracking-[0.3em] text-white/35">
          {["Duplicate payments", "Unused subscriptions", "Price increases", "Micro-spending", "Late-night orders", "Bank fees", "Spending anomalies", "Weekend surges"].map((s) => (
            <span key={s} className="flex items-center gap-2">
              <span className="size-1 rounded-full bg-emerald-400/60" />
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ================= PROBLEM ================= */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            className="font-mono text-xs uppercase tracking-[0.35em] text-white/40"
          >
            The problem
          </motion.p>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl"
          >
            Trackers tell you <em className="text-white/50 not-italic">what</em> you spent.
            <br />
            FinSight tells you <span className="text-emerald-300">why</span>.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-7 max-w-2xl text-base leading-relaxed text-white/55"
          >
            An ordinary expense tracker stops at “₹31,200 this month”. FinSight answers the questions that matter:
            which ₹ are leaking, which behavior caused it, what the trend costs if nothing changes, and the exact steps
            to recover the money.
          </motion.p>

          {/* example leak card — real numbers from the demo dataset */}
          {topInsight && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
            >
              <div className="flex items-center gap-2">
                <Eye className="size-4 text-emerald-300" />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">Example insight · generated from demo data</span>
              </div>
              <h3 className="mt-4 font-display text-2xl font-semibold text-white sm:text-3xl">{topInsight.what}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{topInsight.why}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-300/70">Impact</p>
                  <p className="mt-1 font-mono text-sm text-emerald-200">{topInsight.impact}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Confidence</p>
                  <p className="mt-1 font-mono text-sm text-white/80">{topInsight.confidence}%</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Potential annual</p>
                  <p className="mt-1 font-mono text-sm text-white/80">{demo ? formatINR(demo.potentialSavings.annual) : "—"}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/55">
                <span className="font-semibold text-white/85">Recommended action:</span> {topInsight.action}
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="border-t border-white/[0.07] bg-[#07090f]">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.35em] text-white/40">The command center</p>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                Every leak. Explained.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/45">
              Thirteen working modules — from health score to copilot — all backed by one deterministic, explainable
              analysis engine.
            </p>
          </motion.div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((fx, i) => {
              const Icon = fx.icon;
              return (
                <motion.article
                  key={fx.title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: (i % 4) * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors duration-300 hover:border-white/25"
                >
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
                    style={{ backgroundColor: fx.color }}
                  />
                  <span className="flex size-11 items-center justify-center rounded-xl border border-white/15 bg-black/40">
                    <Icon className="size-5" style={{ color: fx.color }} />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-white">{fx.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/45">{fx.copy}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= PIPELINE ================= */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-mono text-xs uppercase tracking-[0.35em] text-white/40"
          >
            The AI layer
          </motion.p>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-5 font-display text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            From raw transactions to an action plan
          </motion.h2>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: (i % 4) * 0.06 }}
                className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-5"
              >
                <span className="font-mono text-[10px] text-emerald-300">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-2 text-sm font-semibold text-white/85">{step}</p>
                {i < PIPELINE.length - 1 && (
                  <ArrowRight className="absolute -right-2.5 top-1/2 hidden size-4 -translate-y-1/2 text-white/20 lg:block" />
                )}
              </motion.div>
            ))}
          </div>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mt-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30"
          >
            <BrainCircuit className="size-4 text-emerald-400/70" />
            No random insights — every claim cites the transactions behind it, or is labeled a prediction.
          </motion.p>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="relative overflow-hidden border-t border-white/[0.07]">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[52rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500/15 via-sky-500/15 to-violet-500/15 blur-3xl" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-28 text-center sm:py-36">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="font-mono text-xs uppercase tracking-[0.35em] text-white/40"
          >
            Demo-ready · India-first
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl"
          >
            Don't just track money.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">
              Understand it.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-lg text-base leading-relaxed text-white/55"
          >
            Load the demo dataset (duplicate payments, price hikes, an unused subscription and a late-night food surge
            are all planted inside), or upload your own bank statement CSV.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
          >
            <Button
              size="lg"
              className="cursor-pointer bg-emerald-400 px-8 text-black hover:bg-emerald-300"
              onClick={() => navigate("/auth")}
            >
              Analyze my finances
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="cursor-pointer border-white/20 bg-transparent px-8 text-white hover:border-white/40 hover:bg-white/10"
              onClick={() => navigate("/dashboard")}
            >
              <FlaskConical className="mr-2 size-4" />
              Explore the demo
            </Button>
          </motion.div>
          <p className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">
            <Target className="size-3.5 text-emerald-400/70" />
            ₹ INR · UPI · NEFT · IMPS · ATM · CSV upload
          </p>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-white/[0.07] bg-[#04050a]">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row sm:px-10 lg:px-16">
          <Logo />
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">
            <ScanSearch className="size-3.5" />
            Detect · Explain · Predict · Simulate · Act
          </p>
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} FinSight AI · potential savings are estimates
          </p>
        </div>
      </footer>
    </div>
  );
}
