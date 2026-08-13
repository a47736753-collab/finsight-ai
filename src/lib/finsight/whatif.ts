// ─── "What If?" financial simulator ──────────────────────────────────────────
// The user moves sliders for category spending (or the AI builds an optimal
// scenario) and we compute monthly / annual / 3-year potential savings.
// Everything is labeled potential — projections, not guarantees.

import { expenses, lastNMonths, monthKey, spendInMonth, totalIncome, totalSpend } from "./aggregate";
import { currentMonthKey } from "./detect";
import type { Anomaly, CategoryId, CategorySummary, ScenarioResult, Subscription, Transaction } from "./types";
import { CATEGORIES, categoryMeta, formatINR } from "./types";

export const SCENARIO_CATEGORIES: CategoryId[] = [
  "food",
  "groceries",
  "shopping",
  "transport",
  "entertainment",
  "subscriptions",
  "travel",
  "bills",
];

export function currentCategorySpend(txs: Transaction[], category: CategoryId): number {
  const current = currentMonthKey(txs);
  return expenses(txs)
    .filter((t) => t.category === category && monthKey(t.date) === current)
    .reduce((s, t) => s + t.amount, 0);
}

export interface Adjustment {
  category: CategoryId;
  current: number;
  target: number;
}

/** Run a scenario given target amounts per category (0 = keep as-is). */
export function simulateScenario(
  txs: Transaction[],
  categories: CategorySummary[],
  adjustments: Adjustment[],
): ScenarioResult {
  const current = currentMonthKey(txs);
  const income = totalIncome(txs, current);
  const spend = spendInMonth(txs, current) || totalSpend(txs);

  const byCategory: ScenarioResult["byCategory"] = [];
  let saving = 0;
  for (const adj of adjustments) {
    const meta = categoryMeta(adj.category);
    const savingAmt = Math.max(0, adj.current - adj.target);
    saving += savingAmt;
    byCategory.push({
      category: adj.category,
      label: meta.label,
      current: adj.current,
      target: adj.target,
      saving: savingAmt,
    });
  }
  // categories not in the adjustment list keep their current spend
  const covered = new Set(adjustments.map((a) => a.category));
  for (const c of categories) {
    if (!covered.has(c.id) && SCENARIO_CATEGORIES.includes(c.id)) {
      byCategory.push({ category: c.id, label: c.label, current: c.amount, target: c.amount, saving: 0 });
    }
  }
  byCategory.sort((a, b) => b.saving - a.saving);

  const monthly = Math.round(saving);
  const annual = monthly * 12;
  const threeYear = annual * 3; // simple projection, no compounding — honest & legible

  const spendAfter = Math.max(0, spend - monthly);
  const savingsRateAfter = income > 0 ? (income - spendAfter) / income : 0;
  const newSavings = Math.max(0, income - spendAfter);

  return { monthly, annual, threeYear, byCategory, savingsRateAfter, newSavings };
}

/** AI-built "optimal" scenario: realistic reductions grounded in the data. */
export function buildOptimalScenario(
  txs: Transaction[],
  categories: CategorySummary[],
  subs: Subscription[],
  anomalies: Anomaly[] = [],
): { adjustments: Adjustment[]; rationale: string[] } {
  const byCat = new Map<CategoryId, Adjustment>();
  const rationale: string[] = [];
  const addAdjustment = (category: CategoryId, current: number, target: number, note: string) => {
    const existing = byCat.get(category);
    if (existing) {
      // merge overlapping reductions into the single most-aggressive target
      existing.target = Math.min(existing.target, target);
      existing.current = Math.max(existing.current, current);
    } else {
      byCat.set(category, { category, current, target });
    }
    rationale.push(note);
  };
  const current = currentMonthKey(txs);

  // 1. Overspent categories → pull back toward their 3-month average.
  //    One-off anomalies (a laptop, a big festive order) are events, not a
  //    recurring behavior — exclude them so the target stays realistic.
  const anomIds = new Set(anomalies.map((a) => a.tx.id));
  for (const c of categories) {
    if (!SCENARIO_CATEGORIES.includes(c.id)) continue;
    if ((c.changePct ?? 0) >= 15 && c.amount >= 800) {
      const anomAmount = expenses(txs)
        .filter((t) => t.category === c.id && monthKey(t.date) === current && anomIds.has(t.id))
        .reduce((s, t) => s + t.amount, 0);
      const base = Math.max(0, c.amount - anomAmount);
      if (base < 800) continue; // only the anomaly is left — nothing recurring to cut
      const avg = Math.round(base / (1 + (c.changePct ?? 0) / 100));
      const target = Math.round(avg * 1.02); // a little above average — realistic, not heroic
      if (target < base) {
        const note =
          anomAmount > 0
            ? `${c.label} is ${c.changePct}% above its 3-month average — ${formatINR(Math.round(anomAmount))} of it is a one-off flagged anomaly, excluded from the target (${formatINR(Math.round(base))} → ${formatINR(target)}).`
            : `${c.label} is ${c.changePct}% above its 3-month average (${formatINR(Math.round(base))} → ${formatINR(target)}).`;
        addAdjustment(c.id, Math.round(base), target, note);
      }
    }
  }

  // 2. Unused subscriptions → cancel
  const unused = subs.filter((s) => s.unused);
  if (unused.length) {
    const total = unused.reduce((s, x) => s + x.monthlyCost, 0);
    const subCurrent = currentCategorySpend(txs, "subscriptions");
    addAdjustment("subscriptions", subCurrent, Math.max(0, subCurrent - total), `Cancel possibly-unused subscriptions: ${unused.map((s) => s.merchant).join(", ")} (${formatINR(Math.round(total))}/month).`);
  }

  // 3. Fees → zero (bank/service charges)
  const feeCurrent = currentCategorySpend(txs, "fees");
  if (feeCurrent > 0 && categories.some((c) => c.id === "fees")) {
    addAdjustment("fees", feeCurrent, 0, "Eliminate avoidable bank & service fees.");
  }

  // 4. Micro-spending trim (if it's a real leak) — monthlyized so the 6-month
  //    cumulative isn't compared to one month of food spend
  const micro = expenses(txs).filter((t) => t.amount <= 200);
  const monthsCount = Math.max(1, [...new Set(txs.map((t) => t.date.slice(0, 7)))].length);
  if (micro.length >= 20) {
    const microTotal = micro.reduce((s, t) => s + t.amount, 0);
    const foodCurrent = currentCategorySpend(txs, "food");
    if (foodCurrent > 0) {
      const trim = Math.round(Math.min((microTotal / monthsCount) * 0.25, foodCurrent * 0.15));
      addAdjustment("food", foodCurrent, Math.round(foodCurrent - trim), `Trim micro-spending by 25% (${formatINR(trim)}/month across chai, snacks & parking).`);
    }
  }

  return { adjustments: [...byCat.values()], rationale };
}

export function scenarioGrowthNote(annual: number) {
  return `Simple projection: ${formatINR(annual)}/year over 3 years = ${formatINR(annual * 3)}. Real returns would add compounding on top.`;
}

export const scenarioCategoryLabel = (id: CategoryId) => categoryMeta(id).label;
export { CATEGORIES };
