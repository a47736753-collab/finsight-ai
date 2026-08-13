import { motion } from "framer-motion";
import { BarChart3, CalendarDays, Clock3, Gauge } from "lucide-react";
import { useMemo } from "react";
import { categoryColor, formatINR } from "@/lib/finsight";
import { useFinsight } from "./context";
import { GlassCard, Kicker, SectionHeader } from "./shared";

export function ForecastTab() {
  const { analysis } = useFinsight();
  const f = analysis.forecast;
  const maxExpected = Math.max(...f.categoryForecasts.map((c) => c.expected), 1);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader kicker="AI Forecast" title="What happens next?" />

      {/* headline stats */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard glow="#38bdf833" className="p-5">
          <Kicker>Next month spend</Kicker>
          <p className="mt-2 font-display text-3xl font-semibold text-white">{formatINR(f.nextMonthSpend)}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-white/35">predicted from your trend</p>
        </GlassCard>
        <GlassCard className="p-5">
          <Kicker>Subscription charges</Kicker>
          <p className="mt-2 font-display text-3xl font-semibold text-fuchsia-300">{formatINR(f.subscriptionCharges)}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-white/35">/month · {formatINR(f.subscriptionCharges * 12)}/yr</p>
        </GlassCard>
        <GlassCard className="p-5">
          <Kicker>Expected savings</Kicker>
          <p className="mt-2 font-display text-3xl font-semibold text-emerald-300">{formatINR(f.expectedSavings)}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-white/35">income − predicted spend</p>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <Kicker>Financial risk</Kicker>
            <Gauge className="size-4" style={{ color: riskColor(f.risk) }} />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold" style={{ color: riskColor(f.risk) }}>
            {f.riskLabel}
          </p>
          <div className="mt-2 flex gap-1">
            {["low", "moderate", "high"].map((r) => (
              <div
                key={r}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  backgroundColor: r === f.risk ? riskColor(f.risk) : "rgba(255,255,255,0.08)",
                  boxShadow: r === f.risk ? `0 0 10px ${riskColor(f.risk)}66` : "none",
                }}
              />
            ))}
          </div>
        </GlassCard>
      </div>

      {/* category forecast + insights */}
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard className="p-6">
          <Kicker>Category forecasts</Kicker>
          <h3 className="mt-1 font-display text-xl font-semibold text-white">Expected next-month spending</h3>
          <div className="mt-4 flex flex-col gap-3">
            {f.categoryForecasts.map((c, i) => (
              <div key={c.category} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs text-white/70">{c.label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.expected / maxExpected) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: categoryColor(c.category),
                      opacity: c.aboveAverage > 0 ? 1 : 0.5,
                    }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right font-mono text-xs text-white/80">{formatINR(c.expected)}</span>
                <span
                  className={
                    c.aboveAverage > 0
                      ? "w-20 shrink-0 text-right font-mono text-[10px] text-amber-300"
                      : "w-20 shrink-0 text-right font-mono text-[10px] text-emerald-300"
                  }
                >
                  {c.aboveAverage > 0 ? `+${formatINR(c.aboveAverage)}` : `${formatINR(c.aboveAverage)}`}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <Kicker>Prediction notes</Kicker>
          <h3 className="mt-1 font-display text-xl font-semibold text-white">What the model sees</h3>
          <ul className="mt-4 flex flex-col gap-2.5">
            {f.insights.map((ins, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm leading-relaxed text-white/65"
              >
                <BarChart3 className="mt-0.5 size-4 shrink-0 text-sky-300/70" />
                {ins}
              </motion.li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.15em] text-white/25">
            Based on your last {analysis.monthlySeries.length} months · prediction, not certainty
          </p>
        </GlassCard>
      </div>

      {/* heatmap + time */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Heatmap />
        <TimeAndWeekday />
      </div>
    </div>
  );
}

function riskColor(risk: "low" | "moderate" | "high") {
  return risk === "low" ? "#34d399" : risk === "moderate" ? "#fbbf24" : "#fb7185";
}

function Heatmap() {
  const { analysis } = useFinsight();
  const cells = useMemo(() => {
    const byDate = new Map(analysis.heatmap.cells.map((c) => [c.date, c.amount]));
    const max = analysis.heatmap.cells.reduce((m, c) => Math.max(m, c.amount), 1);
    // last 8 full weeks (Mon–Sun) ending on the most recent data day
    const dates = [...byDate.keys()].sort();
    const last = dates.length ? new Date(`${dates[dates.length - 1]}T12:00:00`) : new Date();
    const weeks: { label: string; days: { date: string; amount: number; intensity: number }[] }[] = [];
    const weekNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let w = 7; w >= 0; w--) {
      const start = new Date(last);
      start.setDate(start.getDate() - (last.getDay() === 0 ? 6 : last.getDay() - 1) - w * 7);
      const days = weekNames.map((_, di) => {
        const d = new Date(start);
        d.setDate(start.getDate() + di);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const amount = byDate.get(iso) ?? 0;
        return { date: iso, amount, intensity: amount > 0 ? 0.15 + (amount / max) * 0.85 : 0 };
      });
      weeks.push({ label: `${start.getDate()}/${start.getMonth() + 1}`, days });
    }
    return weeks;
  }, [analysis.heatmap.cells]);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-emerald-300/80" />
        <Kicker>Spending heatmap</Kicker>
      </div>
      <h3 className="mt-1 font-display text-xl font-semibold text-white">Where the days add up</h3>
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[420px]">
          <div className="flex gap-1.5">
            <div className="w-8 shrink-0" />
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="flex-1 text-center font-mono text-[9px] text-white/30">
                {d}
              </div>
            ))}
          </div>
          {cells.map((week, wi) => (
            <div key={week.label} className="mt-1.5 flex items-center gap-1.5">
              <div className="w-8 shrink-0 font-mono text-[9px] text-white/30">{week.label}</div>
              {week.days.map((day, di) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: wi * 0.03 + di * 0.01 }}
                  className="flex-1"
                  title={`${day.date}: ${formatINR(day.amount)}`}
                >
                  <div
                    className="h-8 rounded-md"
                    style={{
                      backgroundColor: day.amount > 0 ? `rgba(52,211,153,${day.intensity})` : "rgba(255,255,255,0.04)",
                      boxShadow: day.amount > 0 ? `0 0 6px rgba(52,211,153,${day.intensity * 0.5})` : "none",
                    }}
                  />
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.15em] text-white/25">
        Brighter = more spent that day · {analysis.heatmap.days} active days · avg {formatINR(Math.round(analysis.heatmap.avgPerDay))}/day
      </p>
    </GlassCard>
  );
}

function TimeAndWeekday() {
  const { analysis } = useFinsight();
  const maxTime = Math.max(...analysis.timeOfDay.map((t) => t.amount), 1);
  const maxDay = Math.max(...analysis.weekday.byDay.map((d) => d.amount), 1);
  const night = analysis.timeOfDay.find((t) => t.label === "Night");

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2">
        <Clock3 className="size-4 text-sky-300/80" />
        <Kicker>Time intelligence</Kicker>
      </div>
      <h3 className="mt-1 font-display text-xl font-semibold text-white">When your money moves</h3>

      <div className="mt-4 flex flex-col gap-3">
        {analysis.timeOfDay.map((t) => (
          <div key={t.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-white/70">{t.label}</span>
            <span className="w-20 shrink-0 font-mono text-[9px] text-white/35">{t.range}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(t.amount / maxTime) * 100}%` }}
                transition={{ duration: 0.7 }}
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
              />
            </div>
            <span className="w-20 shrink-0 text-right font-mono text-xs text-white/75">{formatINR(t.amount)}</span>
            <span className="w-10 shrink-0 text-right font-mono text-[10px] text-white/40">{Math.round(t.share * 100)}%</span>
          </div>
        ))}
      </div>

      {night && night.share > 0.15 && (
        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-relaxed text-amber-100/80">
          🌙 <span className="font-semibold">{Math.round(night.share * 100)}%</span> of your spending happens after 9 PM — a root-cause feeder.
        </div>
      )}

      <div className="mt-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">By weekday</p>
        <div className="mt-2.5 flex items-end gap-1.5">
          {analysis.weekday.byDay.map((d, i) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <motion.div
                initial={{ height: 4 }}
                animate={{ height: `${Math.max(6, (d.amount / maxDay) * 70)}px` }}
                transition={{ duration: 0.6, delay: i * 0.04 }}
                className="w-full rounded-t"
                style={{
                  backgroundColor: i === 0 || i === 6 ? "#fbbf24" : "#38bdf8",
                  opacity: d.amount > 0 ? 0.85 : 0.2,
                }}
              />
              <span className="font-mono text-[9px] text-white/40">{d.day}</span>
            </div>
          ))}
        </div>
        {analysis.weekday.weekendRatio > 1.15 && (
          <p className="mt-2.5 text-[11px] text-white/45">
            You spend <span className="font-semibold text-amber-300">{Math.round((analysis.weekday.weekendRatio - 1) * 100)}% more</span> on
            weekends than weekdays.
          </p>
        )}
      </div>
    </GlassCard>
  );
}
