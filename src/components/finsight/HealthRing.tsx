import { motion } from "framer-motion";
import { useState } from "react";
import type { HealthResult } from "@/lib/finsight";
import { GlassCard, Kicker, Meter } from "./shared";

const scoreColor = (s: number) => (s >= 80 ? "#34d399" : s >= 60 ? "#fbbf24" : "#fb7185");

export function HealthRing({ health }: { health: HealthResult }) {
  const [open, setOpen] = useState(false);
  const color = scoreColor(health.score);
  const r = 84;
  const c = 2 * Math.PI * r;
  const filled = (health.score / 100) * c;

  return (
    <GlassCard glow={color} className="flex flex-col items-center p-6 sm:p-8">
      <div className="flex w-full items-start justify-between">
        <div>
          <Kicker>Financial Health</Kicker>
          <p className="mt-1 font-display text-sm font-medium text-white/70">{health.level}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 transition-colors hover:border-white/30 hover:text-white"
        >
          {open ? "Hide breakdown" : "Why this score?"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative mt-6 cursor-pointer outline-none"
        aria-label="Financial health score breakdown"
      >
        <svg width="200" height="200" className="-rotate-90">
          <defs>
            <linearGradient id="health-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity="0.6" />
            </linearGradient>
            <filter id="health-glow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
          <motion.circle
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="url(#health-grad)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - filled }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: "url(#health-glow)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="font-display text-6xl font-semibold tracking-tight"
            style={{ color }}
          >
            {health.score}
          </motion.span>
          <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">/ 100</span>
          <span className="mt-3 flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/50">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="size-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            Level {Math.max(1, Math.min(9, Math.round(health.score / 10)))}
          </span>
        </div>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.4 }}
          className="mt-6 w-full overflow-hidden"
        >
          <div className="flex flex-col gap-3.5">
            {health.breakdown.map((b, i) => (
              <div key={b.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2" style={{ backgroundColor: scoreColor(b.score) }} />
                    <span className="text-xs font-medium text-white/80">{b.label}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/30">w {Math.round(b.weight * 100)}%</span>
                  </div>
                  <motion.span
                    key={b.score}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="font-mono text-xs font-semibold"
                    style={{ color: scoreColor(b.score) }}
                  >
                    {b.score}
                  </motion.span>
                </div>
                <Meter value={b.score} color={scoreColor(b.score)} />
                <p className="text-[11px] leading-relaxed text-white/40">{b.explanation}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </GlassCard>
  );
}
