// ─── FinSight engine — pipeline + barrel ─────────────────────────────────────
// analyzeAll() runs the full AI layer over a transaction set:
//   aggregation → detection → health → insights → root cause → network
//   → forecast → profile → action plan → gamification

import {
  avgMonthlySpend,
  categorySummaries,
  expenses,
  merchantIntel,
  monthLabel,
  monthlySeries,
  spendingHeatmap,
  timeOfDay,
  totalIncome,
  totalSpend,
  weekdayStats,
} from "./aggregate";
import { buildActionPlan } from "./action-plan";
import { answerCopilot, QUICK_PROMPTS } from "./copilot";
import { currentMonthKey, detectAnomalies, detectDuplicates, detectLeaks, detectSubscriptions, potentialSavings } from "./detect";
import { buildForecast, nextMonthKey } from "./forecast";
import { computeHealth, overallRisk } from "./health";
import { generateAlerts, generateInsights } from "./insights";
import { buildNetwork } from "./network";
import { buildProfile } from "./profile";
import { buildRootCause } from "./root-cause";
import type { Analysis, CategoryId, Goal, Transaction } from "./types";
import { categoryMeta, formatINR } from "./types";
import { buildOptimalScenario, currentCategorySpend, simulateScenario, type Adjustment } from "./whatif";
import { parseCsv, parseCsvLine, parseDateToIso, parseAmountRaw, normalizeMerchant, inferCategory, transactionsToCsv, downloadText } from "./csv";

export const DEFAULT_GOALS: Goal[] = [
  { id: "goal-emergency", name: "Emergency Fund", emoji: "🛟", target: 150000, current: 60000, monthlyTarget: 5000, createdAt: "" },
  { id: "goal-laptop", name: "New Laptop", emoji: "💻", target: 80000, current: 30000, monthlyTarget: 3000, createdAt: "" },
];

export function analyzeAll(txs: Transaction[], goals: Goal[]): Analysis {
  const currentMonth = currentMonthKey(txs);
  const currentMonthLabel = monthLabel(currentMonth);

  const subs = detectSubscriptions(txs);
  const dups = detectDuplicates(txs);
  const anomalies = detectAnomalies(txs);
  const leaks = detectLeaks({ txs, subs, anomalies, dups, currentMonth });
  const categories = categorySummaries(txs, currentMonth);
  const pot = potentialSavings(leaks);

  const risk = overallRisk(txs);

  const insightCtx = {
    txs,
    subs,
    dups,
    anomalies,
    leaks,
    categories,
    currentMonth,
    timeOfDay: timeOfDay(txs),
    weekendRatio: weekdayStats(txs).weekendRatio,
    forecast: buildForecast(txs, subs, categories),
  };
  const insights = generateInsights(insightCtx);
  const alerts = generateAlerts(insightCtx, risk.riskLabel);

  const income = totalIncome(txs, currentMonth);
  const spending = totalSpend(txs, currentMonth);
  const health = computeHealth(txs, goals, {
    anomalies: anomalies.length,
    duplicates: dups.length,
    priceIncreases: subs.filter((s) => s.priceIncreasePct >= 10).length,
  });
  const monthly = monthlySeries(txs);

  const analysis: Analysis = {
    txs,
    goals,
    currentMonth,
    currentMonthLabel,
    income,
    spending,
    savings: Math.max(0, income - spending),
    savingsRate: income > 0 ? (income - spending) / income : 0,
    avgMonthlySpend: avgMonthlySpend(txs, 3),
    risk: risk.risk,
    riskLabel: risk.riskLabel,
    health,
    gamification: buildGamification(health.score, leaks, pot.monthly, txs),
    potentialSavings: pot,
    insights,
    alerts,
    leaks,
    subscriptions: subs,
    duplicates: dups,
    anomalies,
    categories,
    merchants: merchantIntel(txs),
    monthlySeries: monthly,
    heatmap: spendingHeatmap(txs),
    timeOfDay: timeOfDay(txs),
    weekday: weekdayStats(txs),
    rootCause: buildRootCause(txs, categories, anomalies),
    network: buildNetwork(txs, categories, subs, anomalies, dups),
    forecast: buildForecast(txs, subs, categories),
    profile: buildProfile(txs, subs),
    actionPlan: buildActionPlan(leaks),
  };

  return analysis;
}

function buildGamification(
  score: number,
  leaks: Analysis["leaks"],
  monthlyPotential: number,
  txs: Transaction[],
): Analysis["gamification"] {
  const level = Math.max(1, Math.min(9, Math.round(score / 10)));
  const levelLabel =
    score >= 88
      ? "Financial Guardian"
      : score >= 80
        ? "Wealth Builder"
        : score >= 70
          ? "Money Master"
          : score >= 60
            ? "Saver"
            : "Starter";
  return {
    streak: computeStreak(txs),
    leaksFound: leaks.filter((l) => l.monthly > 0).length,
    savingsMilestone: Math.round(monthlyPotential),
    level,
    levelLabel,
  };
}

/** Consecutive recent days with spending at or below ₹300 (no unnecessary spend). */
function computeStreak(txs: Transaction[]): number {
  const ex = expenses(txs);
  if (!ex.length) return 0;
  const byDay = new Map<string, number>();
  for (const t of ex) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amount);
  const latest = [...byDay.keys()].sort().reverse()[0];
  if (!latest) return 0;
  const cursor = new Date(`${latest}T12:00:00`);
  let streak = 0;
  for (let i = 0; i < 120; i++) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
      cursor.getDate(),
    ).padStart(2, "0")}`;
    const amt = byDay.get(iso) ?? 0;
    if (amt <= 300) streak++;
    else break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function formatMoney(n: number) {
  return formatINR(n);
}

export function categoryName(id: CategoryId) {
  return categoryMeta(id).label;
}

export function reportMarkdown(a: Analysis, monthKey: string): string {
  const m = a.monthlySeries.find((x) => x.month === monthKey);
  const lines: string[] = [];
  lines.push(`# FinSight AI — Monthly Financial Report`);
  lines.push(`**Month:** ${m?.label ?? monthKey}`);
  lines.push(`**Health score:** ${a.health.score}/100 — ${a.health.level}`);
  lines.push("");
  lines.push(`## Overview`);
  lines.push(`- Income: ${formatINR(a.income)}`);
  lines.push(`- Spending: ${formatINR(a.spending)}`);
  lines.push(`- Savings: ${formatINR(a.savings)} (${Math.round(a.savingsRate * 100)}%)`);
  lines.push(`- Risk: ${a.riskLabel}`);
  lines.push("");
  lines.push(`## Top categories`);
  for (const c of a.categories.slice(0, 5)) {
    lines.push(`- ${c.label}: ${formatINR(c.amount)} (${c.changePct !== null ? `${c.changePct > 0 ? "+" : ""}${c.changePct}%` : "n/a"})`);
  }
  lines.push("");
  lines.push(`## Top merchants`);
  for (const m2 of a.merchants.slice(0, 5)) {
    lines.push(`- ${m2.merchant}: ${formatINR(m2.total)} (${m2.count} tx)`);
  }
  lines.push("");
  lines.push(`## Financial leaks detected (${a.leaks.length})`);
  for (const l of a.leaks) {
    lines.push(`- ${l.title} — potential ${formatINR(l.monthly)}/month`);
  }
  lines.push("");
  lines.push(`## Anomalies (${a.anomalies.length})`);
  for (const an of a.anomalies) {
    lines.push(`- ${formatINR(an.tx.amount)} at ${an.tx.merchant} on ${an.tx.date} (score ${an.score}/100)`);
  }
  lines.push("");
  lines.push(`## AI insights`);
  for (const i of a.insights.slice(0, 6)) {
    lines.push(`### ${i.what}`);
    lines.push(`${i.why}`);
    lines.push(`${i.impact} Confidence: ${i.confidence}%.`);
    lines.push(`Action: ${i.action}`);
    lines.push("");
  }
  lines.push(`## Potential savings`);
  lines.push(`${formatINR(a.potentialSavings.monthly)}/month · ${formatINR(a.potentialSavings.annual)}/year`);
  lines.push("");
  lines.push(`## Next-month forecast`);
  lines.push(`Expected spending: ${formatINR(a.forecast.nextMonthSpend)} — risk: ${a.forecast.riskLabel}`);
  for (const i of a.forecast.insights) lines.push(`- ${i}`);
  lines.push("");
  lines.push(`## Goals`);
  if (a.goals.length) {
    for (const g of a.goals) {
      lines.push(`- ${g.emoji} ${g.name}: ${formatINR(g.current)} / ${formatINR(g.target)} (${Math.round((g.current / Math.max(1, g.target)) * 100)}%)`);
    }
  } else {
    lines.push("No goals set.");
  }
  lines.push("");
  lines.push(`*Generated by FinSight AI. Potential savings and forecasts are estimates based on your transaction data — not guarantees.*`);
  return lines.join("\n");
}

export { nextMonthKey };

// re-export everything the UI needs
export * from "./aggregate";
export * from "./detect";
export * from "./types";
export { buildActionPlan, goalAcceleration, planHeadline } from "./action-plan";
export { parseCsv, parseCsvLine, parseDateToIso, parseAmountRaw, normalizeMerchant, inferCategory, transactionsToCsv, downloadText };
export { answerCopilot, QUICK_PROMPTS };
export { simulateScenario, buildOptimalScenario, currentCategorySpend, SCENARIO_CATEGORIES } from "./whatif";
export type { Adjustment } from "./whatif";
export { generateDemoTransactions, DEMO_SUMMARY } from "./demo";
