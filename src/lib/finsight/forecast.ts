// ─── Future leak predictor ───────────────────────────────────────────────────
// Predicts next-month spending from the actual monthly trend, per-category
// momentum, and expected subscription charges. Clearly labeled a prediction.

import { lastNMonths, monthKey, spendInMonth, totalIncome } from "./aggregate";
import { currentMonthKey } from "./detect";
import type { CategorySummary, ForecastResult, Subscription, Transaction } from "./types";
import { formatINR } from "./types";

export function buildForecast(
  txs: Transaction[],
  subs: Subscription[],
  categories: CategorySummary[],
): ForecastResult {
  const current = currentMonthKey(txs);
  const keys = lastNMonths(txs, 3);

  // weighted recent average of monthly spend
  const spends = keys.map((k) => spendInMonth(txs, k));
  const recent = spends.length ? spends[spends.length - 1] : 0;
  const prev = spends.length > 1 ? spends[spends.length - 2] : recent;
  const prev2 = spends.length > 2 ? spends[spends.length - 3] : prev;
  const weightedBase = spends.length ? 0.5 * recent + 0.3 * prev + 0.2 * prev2 : 0;

  // month-over-month growth (clamped so predictions stay sane)
  const growth = recent > 0 && prev > 0 ? (recent - prev) / prev : 0;
  const clampedGrowth = Math.max(-0.15, Math.min(0.25, growth));

  const nextMonthSpend = Math.round(weightedBase * (1 + clampedGrowth * 0.5));

  // per-category forecast
  const categoryForecasts = categories.slice(0, 6).map((c) => {
    const momentum = Math.max(-0.2, Math.min(0.3, (c.changePct ?? 0) / 100));
    const expected = Math.round(c.amount * (1 + momentum * 0.6));
    const avg = c.amount / (1 + (c.changePct ?? 0) / 100);
    return {
      category: c.id,
      label: c.label,
      expected,
      aboveAverage: Math.round(expected - avg),
    };
  });

  const subscriptionCharges = Math.round(subs.reduce((s, x) => s + x.monthlyCost, 0));

  // risk assessment
  const trendRising = clampedGrowth > 0.05;
  const anomalyHeavy = txs.length > 0 && txs.filter((t) => t.kind === "expense" && t.amount >= 5000).length >= 2;
  const feeHeavy = subs.some((s) => s.priceIncreasePct >= 10);
  let risk: "low" | "moderate" | "high";
  if (trendRising && anomalyHeavy) risk = "high";
  else if (trendRising || feeHeavy) risk = "moderate";
  else risk = "low";

  const insights: string[] = [];
  const riser = [...categoryForecasts].sort((a, b) => b.aboveAverage - a.aboveAverage)[0];
  if (riser && riser.aboveAverage > 200) {
    insights.push(
      `${riser.label} spending is likely to exceed your current average by ${formatINR(riser.aboveAverage)} next month.`,
    );
  }
  if (subscriptionCharges > 0) {
    insights.push(`Expected subscription charges: ${formatINR(subscriptionCharges)}/month (${formatINR(subscriptionCharges * 12)}/year).`);
  }
  const rising = subs.filter((s) => s.priceIncreasePct >= 10);
  if (rising.length) {
    insights.push(`${rising.length} service${rising.length > 1 ? "s" : ""} recently raised price${rising.length > 1 ? "s" : ""} — that increase is now baked into next month.`);
  }
  if (clampedGrowth > 0.05) {
    insights.push(`Your spending has been rising ~${Math.round(clampedGrowth * 100)}% month-over-month.`);
  }
  if (insights.length === 0) {
    insights.push("No significant upward pressure detected — next month looks close to your recent average.");
  }

  const income = totalIncome(txs, current);
  const expectedSavings = Math.max(0, income - nextMonthSpend);

  const riskLabel = risk === "high" ? "High" : risk === "moderate" ? "Moderate" : "Low";

  return { nextMonthSpend, categoryForecasts, subscriptionCharges, risk, riskLabel, insights, expectedSavings };
}

export function nextMonthKey() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyFromDate(iso: string) {
  return monthKey(iso);
}
