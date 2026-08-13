// ─── Root-cause engine ───────────────────────────────────────────────────────
// Turns "you spent more" into an explainable tree:
//   MONTHLY SPENDING +18% → Food +31% → Late-night orders +42% → excess ₹1,850

import { expenses, hourOf, lastNMonths, monthKey, spendInMonth, totalSpend } from "./aggregate";
import { currentMonthKey } from "./detect";
import type { Anomaly, CategorySummary, RootCauseResult, Transaction, TreeNode } from "./types";
import { formatINR } from "./types";

export function buildRootCause(txs: Transaction[], categories: CategorySummary[], anomalies: Anomaly[] = []): RootCauseResult {
  const current = currentMonthKey(txs);
  const anomIds = new Set(anomalies.map((a) => a.tx.id));
  // The tree tells the *behavioral* story — one-off anomalies (a laptop, a
  // refund dispute) are events owned by the Anomalies tab, so exclude them
  // from the totals to keep the root and its branches internally consistent.
  const behaviorTx = (t: Transaction) => !anomIds.has(t.id);
  const now = expenses(txs).filter((t) => behaviorTx(t) && monthKey(t.date) === current).reduce((s, t) => s + t.amount, 0);
  const avgKeys = lastNMonths(txs, 3).filter((k) => k !== current);
  const avg = avgKeys.length
    ? avgKeys.reduce((s, k) => s + expenses(txs).filter((t) => behaviorTx(t) && monthKey(t.date) === k).reduce((x, t) => x + t.amount, 0), 0) / avgKeys.length
    : 0;
  const changePct = avg > 0 ? Math.round(((now - avg) / avg) * 100) : 0;
  const excess = Math.max(0, Math.round(now - avg));

  const root: TreeNode = {
    label: "MONTHLY SPENDING",
    value: `${changePct >= 0 ? "+" : ""}${changePct}%`,
    detail: `${formatINR(now)} this month vs ${formatINR(Math.round(avg))} average`,
    kind: "root",
    level: 0,
    children: [],
  };

  // per-category driver analysis
  // A category whose jump is a single already-flagged anomaly (e.g. a one-off
  // laptop purchase) is an event, not a behavior — it doesn't drive the
  // root-cause story and shouldn't crowd out real patterns like food delivery.
  const anomalyDriven = (c: CategorySummary) => {
    if (!anomalies.length) return false;
    const monthTxs = expenses(txs).filter((t) => t.category === c.id && monthKey(t.date) === current);
    const largest = monthTxs.reduce((a, b) => (a.amount > b.amount ? a : b), monthTxs[0]);
    return !!largest && anomalies.some((a) => a.tx.id === largest.id) && largest.amount >= c.amount * 0.5;
  };
  const drivers = categories
    .filter((c) => (c.changePct ?? 0) >= 8 && c.amount >= 500 && !anomalyDriven(c))
    .map((c) => ({ c, excess: Math.round(c.amount - c.amount / (1 + (c.changePct ?? 0) / 100)) }))
    .filter((d) => d.excess >= 400)
    .sort((a, b) => b.excess - a.excess)
    .slice(0, 3);

  for (const { c: cat, excess } of drivers) {
    const avgCat = cat.amount / (1 + (cat.changePct ?? 0) / 100);
    const branch: TreeNode = {
      label: `${cat.label.toUpperCase()} +${cat.changePct}%`,
      value: formatINR(cat.amount),
      detail: `${cat.transactions} transactions`,
      kind: "branch",
      level: 1,
      children: [],
    };

    // transaction count delta
    const countNow = cat.transactions;
    const countAvg = Math.max(1, Math.round(countNow / (1 + (cat.changePct ?? 0) / 100)));
    const extraCount = countNow - countAvg;
    if (extraCount > 0) {
      branch.children!.push({
        label: `${extraCount} ADDITIONAL TRANSACTIONS`,
        value: `${extraCount} tx`,
        detail: `vs your typical ${countAvg}`,
        kind: "leaf",
        level: 2,
      });
    }

    // avg transaction value change
    const avgNow = cat.avgTx;
    const avgBefore = cat.amount / Math.max(1, countNow) / Math.max(1, 1 + (cat.changePct ?? 0) / 100);
    if (avgBefore > 0 && avgNow > avgBefore * 1.05) {
      branch.children!.push({
        label: "AVERAGE TRANSACTION VALUE",
        value: `${Math.round(((avgNow - avgBefore) / avgBefore) * 100)}%`,
        detail: `${formatINR(Math.round(avgNow))} vs ${formatINR(Math.round(avgBefore))}`,
        kind: "leaf",
        level: 2,
      });
    }

    // food-specific: late-night delivery driver
    if (cat.id === "food") {
      const isDelivery = (t: Transaction) => /(swiggy|zomato|dominos|kfc|mcdonald)/i.test(t.merchant);
      const lateNow = expenses(txs).filter((t) => isDelivery(t) && hourOf(t) >= 21 && monthKey(t.date) === current);
      const latePrev = expenses(txs).filter((t) => isDelivery(t) && hourOf(t) >= 21 && monthKey(t.date) !== current);
      const lateNowTotal = lateNow.reduce((s, t) => s + t.amount, 0);
      const latePrevPerMonth = latePrev.length ? latePrev.reduce((s, t) => s + t.amount, 0) / Math.max(1, avgKeys.length) : 0;
      if (latePrevPerMonth > 0 && lateNowTotal > latePrevPerMonth * 1.1) {
        branch.children!.push({
          label: "LATE-NIGHT ORDERS",
          value: `${lateNow.length} orders`,
          detail: `${formatINR(Math.round(lateNowTotal))} after 9 PM (${Math.round(((lateNowTotal - latePrevPerMonth) / latePrevPerMonth) * 100)}% above your norm)`,
          kind: "leaf",
          level: 2,
        });
      }
    }

    // per-branch excess
    branch.children!.push({
      label: "ESTIMATED EXCESS SPENDING",
      value: formatINR(excess),
      detail: `${cat.label} above its 3-month average`,
      kind: "leaf",
      level: 2,
    });

    root.children!.push(branch);
  }

  if (!root.children!.length) {
    root.children!.push({
      label: "SPENDING IN LINE WITH AVERAGE",
      value: `${changePct >= 0 ? "+" : ""}${changePct}%`,
      detail: "No category exceeds its 3-month average by a meaningful margin.",
      kind: "leaf",
      level: 1,
    });
  }

  // headline — the single largest driver
  let headline = "Your spending is broadly in line with your 3-month average.";
  const top = drivers[0]?.c;
  if (top && top.id === "food") {
    headline = `Late-night food ordering is your largest spending driver this month (${formatINR(top.amount)} in ${top.label.toLowerCase()}, +${top.changePct}% vs average).`;
  } else if (top) {
    headline = `${top.label} is your largest spending driver this month (${formatINR(top.amount)}, +${top.changePct}% vs average).`;
  }

  return { root, headline, changePct, excess };
}
