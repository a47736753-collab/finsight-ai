// ─── Financial health score ──────────────────────────────────────────────────
// A weighted 0-100 score with an explainable breakdown. Every component is
// computed from real transaction data; weights sum to 1.0 so the score is the
// weighted average of its parts.

import { avgMonthlySpend, expenses, spendInMonth, totalIncome, totalSpend } from "./aggregate";
import { currentMonthKey } from "./detect";
import type { Goal, HealthResult, Transaction } from "./types";
import { formatINR } from "./types";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function computeHealth(
  txs: Transaction[],
  goals: Goal[],
  anomalyStats?: { anomalies: number; duplicates: number; priceIncreases: number },
): HealthResult {
  const current = currentMonthKey(txs);
  const income = totalIncome(txs, current);
  const spend = totalSpend(txs, current);
  const avg = avgMonthlySpend(txs, 3);
  const savingsRate = income > 0 ? (income - spend) / income : 0;

  // 1. Spending control — how far current-month spending runs above the 3-month norm
  const spendRatio = avg > 0 ? spend / avg : 1;
  const spendingControl = Math.round(clamp(100 - Math.max(0, spendRatio - 1) * 70, 15, 100));
  const spendingDetail =
    avg > 0
      ? spendRatio > 1.02
        ? `This month you spent ${formatINR(spend)} — ${Math.round((spendRatio - 1) * 100)}% above your ${formatINR(avg)} 3-month average.`
        : `This month you spent ${formatINR(spend)}, in line with (or below) your ${formatINR(avg)} 3-month average.`
      : "Not enough history to benchmark spending.";

  // 2. Savings health — share of income left after expenses (incl. forced savings)
  const savings = Math.round(clamp(35 + savingsRate * 180, 5, 100));
  const savingsDetail = `You keep ${Math.round(savingsRate * 100)}% of income after expenses this month (${
    income > 0 ? formatINR(Math.max(0, income - spend)) : "₹0"
  }). A rate above 25% is strong, below 10% is fragile.`;

  // 3. Recurring expenses — subscription load relative to total spending
  const subSpend = expenses(txs).reduce(
    (s, t) => (t.category === "subscriptions" && t.date.slice(0, 7) === current ? s + t.amount : s),
    0,
  );
  const subShare = spend > 0 ? subSpend / spend : 0;
  const recurring = Math.round(clamp(95 - subShare * 220, 10, 100));
  const recurringDetail = `Subscriptions are ${formatINR(Math.round(subSpend))} (${Math.round(subShare * 100)}% of monthly spending). Above 15% signals subscription bloat.`;

  // 4. Fees — bank & service charges relative to income
  const feeSpend = expenses(txs).reduce(
    (s, t) => (t.category === "fees" && t.date.slice(0, 7) === current ? s + t.amount : s),
    0,
  );
  const feeRatio = income > 0 ? feeSpend / income : 0;
  const fees = Math.round(clamp(100 - feeRatio * 1600, 10, 100));
  const feesDetail = `You paid ${formatINR(Math.round(feeSpend))} in bank/service fees this month. Every ₹100 in avoidable fees is pure leakage.`;

  // 5. Anomaly risk — penalized by anomalies, duplicates, price increases
  //    (counts come from the real detectors in the analysis pipeline)
  const anom = anomalyStats ?? { anomalies: 0, duplicates: 0, priceIncreases: 0 };
  const anomalyScore = Math.round(clamp(100 - anom.anomalies * 12 - anom.duplicates * 10 - anom.priceIncreases * 8, 10, 100));
  const anomalyDetail = anomalyScore >= 90
    ? "No unusual transactions detected in recent history."
    : `Recent anomalies, duplicates or price jumps are dragging this score down. See the Anomalies and Subscriptions tabs for details.`;

  // 6. Goal progress
  const goalScore = goals.length
    ? Math.round(goals.reduce((s, g) => s + clamp(g.target > 0 ? g.current / g.target : 0, 0, 1) * 100, 0) / goals.length)
    : 55;
  const goalDetail = goals.length
    ? `Average progress across your ${goals.length} goal${goals.length > 1 ? "s" : ""} is ${goalScore}%.`
    : "No goals set yet — adding one gives the score a progress component and makes recommendations personal.";

  const breakdown = [
    { id: "spending", label: "Spending Control", score: spendingControl, weight: 0.2, explanation: spendingDetail },
    { id: "savings", label: "Savings", score: savings, weight: 0.2, explanation: savingsDetail },
    { id: "recurring", label: "Recurring Expenses", score: recurring, weight: 0.15, explanation: recurringDetail },
    { id: "fees", label: "Fees", score: fees, weight: 0.15, explanation: feesDetail },
    { id: "anomaly", label: "Anomaly Risk", score: anomalyScore, weight: 0.15, explanation: anomalyDetail },
    { id: "goals", label: "Goal Progress", score: goalScore, weight: 0.15, explanation: goalDetail },
  ];

  const score = Math.round(breakdown.reduce((s, b) => s + b.score * b.weight, 0));

  let level: string;
  let levelLabel: string;
  if (score >= 88) {
    level = "Level 9 · Financial Guardian";
    levelLabel = "Elite control";
  } else if (score >= 80) {
    level = "Level 8 · Wealth Builder";
    levelLabel = "Strong momentum";
  } else if (score >= 70) {
    level = "Level 7 · Money Master";
    levelLabel = "Good, with leaks to fix";
  } else if (score >= 60) {
    level = "Level 6 · Saver";
    levelLabel = "Stable but leaking";
  } else if (score >= 50) {
    level = "Level 5 · Starter";
    levelLabel = "Recovery in progress";
  } else {
    level = "Level 4 · At Risk";
    levelLabel = "Action needed";
  }

  return { score, level, levelLabel, breakdown };
}

export function healthLevelOf(score: number) {
  return score >= 80 ? "Good" : score >= 60 ? "Moderate" : "At risk";
}

export function overallRisk(txs: Transaction[]): { risk: "low" | "moderate" | "high"; riskLabel: string } {
  const current = currentMonthKey(txs);
  const spend = spendInMonth(txs, current);
  const avg = avgMonthlySpend(txs, 3);
  const growth = avg > 0 ? spend / avg : 1;
  const months = txs.length ? [...new Set(txs.map((t) => t.date.slice(0, 7)))].length : 0;
  const anomalyCount = Math.min(4, expenses(txs).filter((t) => {
    const arr = expenses(txs).filter((x) => x.merchant === t.merchant).map((x) => x.amount).sort((a, b) => a - b);
    const median = arr[Math.floor(arr.length / 2)] || 0;
    return median > 0 && t.amount >= median * 3;
  }).length);
  const score = (growth > 1.15 ? 1 : 0) + (anomalyCount >= 2 ? 1 : 0) + (months >= 6 && growth > 1.05 ? 1 : 0);
  if (score >= 2) return { risk: "high", riskLabel: "High" };
  if (score >= 1) return { risk: "moderate", riskLabel: "Moderate" };
  return { risk: "low", riskLabel: "Low" };
}
