// ─── Explainable AI insight engine ───────────────────────────────────────────
// Every insight is computed from real transaction data (or clearly labeled as a
// prediction / potential saving). No random insights — each one carries
// WHAT / WHY / IMPACT / CONFIDENCE / ACTION plus evidence bullets.

import { discretionaryNightShare, expenses, hourOf, lastNMonths, monthKey, totalSpend } from "./aggregate";
import { potentialSavings } from "./detect";
import type {
  Alert,
  Anomaly,
  CategorySummary,
  DuplicatePair,
  ForecastResult,
  Insight,
  Leak,
  Subscription,
  TimeOfDay,
  Transaction,
} from "./types";
import { formatINR } from "./types";

export interface InsightContext {
  txs: Transaction[];
  subs: Subscription[];
  dups: DuplicatePair[];
  anomalies: Anomaly[];
  leaks: Leak[];
  categories: CategorySummary[];
  currentMonth: string;
  timeOfDay: TimeOfDay[];
  weekendRatio: number;
  forecast: ForecastResult;
}

export function generateInsights(ctx: InsightContext): Insight[] {
  const { txs, subs, dups, anomalies, leaks, categories, currentMonth, timeOfDay, weekendRatio, forecast } = ctx;
  const out: Insight[] = [];
  const curMonthSpend = totalSpend(txs, currentMonth) || totalSpend(txs);

  // ── 1. Category overspend (spending) ──
  // skip when the jump is driven by a single already-flagged anomaly — the
  // anomaly insight owns that story, and it isn't a fixable spending behavior.
  const overspendCat = categories.find((c) => {
    if ((c.changePct ?? 0) < 15 || c.amount < 1000) return false;
    const monthTxs = expenses(txs).filter((t) => t.category === c.id && monthKey(t.date) === currentMonth);
    const largest = monthTxs.reduce((a, b) => (a.amount > b.amount ? a : b), monthTxs[0]);
    if (largest && anomalies.some((a) => a.tx.id === largest.id) && largest.amount >= c.amount * 0.5) return false;
    return true;
  });
  if (overspendCat) {
    const catPct = overspendCat.changePct ?? 0;
    const excess = Math.round(overspendCat.amount - overspendCat.amount / (1 + catPct / 100));
    out.push({
      id: "insight-spend",
      severity: "high",
      type: "spending",
      what: `${overspendCat.label} spending increased ${overspendCat.changePct}%.`,
      why: `You spent ${formatINR(overspendCat.amount)} on ${overspendCat.label.toLowerCase()} this month across ${overspendCat.transactions} transactions — above your 3-month average for the category.`,
      impact: `Estimated excess spending: ${formatINR(Math.max(0, excess))} this month.`,
      confidence: Math.min(97, 82 + Math.min(14, Math.round(Math.abs(catPct) / 4))),
      action: `Review ${overspendCat.label.toLowerCase()} transactions in the Transactions tab and set a monthly limit ${formatINR(Math.round(overspendCat.amount * 0.85))}.`,
      evidence: [
        `This month: ${formatINR(overspendCat.amount)} (${overspendCat.transactions} transactions)`,
        `3-month average: ${formatINR(Math.round(overspendCat.amount / (1 + catPct / 100)))}`,
        `Change: ${catPct > 0 ? "+" : ""}${catPct}%`,
      ],
      kind: "actual",
    });
  }

  // ── 2. Duplicate payment ──
  const dup = dups[0];
  if (dup) {
    out.push({
      id: "insight-dup",
      severity: "high",
      type: "duplicate",
      what: `Possible duplicate payment detected — ${formatINR(dup.a.amount)} charged twice.`,
      why: `${dup.a.merchant} charged ${formatINR(dup.a.amount)} twice, ${dup.minutesApart} minutes apart, on ${dup.a.date}.`,
      impact: `Potential double charge: ${formatINR(dup.a.amount)}.`,
      confidence: dup.confidence,
      action: "Confirm or dismiss the duplicate in the Anomalies tab, then request a refund from the merchant if valid.",
      evidence: [`Same merchant: ${dup.a.merchant}`, `Same amount: ${formatINR(dup.a.amount)}`, `Transactions ${dup.minutesApart} minutes apart`],
      kind: "inference",
    });
  }

  // ── 3. Subscription optimization (unused) ──
  const unusedSubs = subs.filter((s) => s.unused);
  if (unusedSubs.length) {
    const monthly = unusedSubs.reduce((s, x) => s + x.monthlyCost, 0);
    out.push({
      id: "insight-subs",
      severity: "medium",
      type: "subscription",
      what: `${unusedSubs.length} subscription${unusedSubs.length > 1 ? "s" : ""} look${unusedSubs.length > 1 ? "" : "s"} unused.`,
      why: `${unusedSubs.map((s) => s.merchant).join(", ")} ${unusedSubs.length > 1 ? "are" : "is"} charged every month with no activity detected beyond the charge itself.`,
      impact: `${formatINR(Math.round(monthly))}/month · ${formatINR(Math.round(monthly * 12))}/year in potential savings.`,
      confidence: 78,
      action: "Review each subscription in the Subscriptions tab and cancel the ones you no longer use.",
      evidence: unusedSubs.slice(0, 3).map((s) => `${s.merchant}: ${formatINR(s.monthlyCost)}/month, first seen ${s.firstSeen}`),
      kind: "potential saving",
    });
  }

  // ── 4. Price increase ──
  const priceSub = subs.filter((s) => s.priceIncreasePct >= 10).sort((a, b) => b.priceIncreasePct - a.priceIncreasePct)[0];
  if (priceSub) {
    const first = priceSub.priceHistory[0]?.amount ?? priceSub.amount;
    const last = priceSub.priceHistory[priceSub.priceHistory.length - 1]?.amount ?? priceSub.amount;
    const extra = (last - first) * 12;
    out.push({
      id: "insight-price",
      severity: "medium",
      type: "subscription",
      what: `${priceSub.merchant} raised its price ${priceSub.priceIncreasePct}%.`,
      why: `Monthly charge went from ${formatINR(first)} to ${formatINR(last)} over your transaction history.`,
      impact: `Extra annual cost: ~${formatINR(Math.max(0, extra))}.`,
      confidence: Math.min(96, 80 + priceSub.priceIncreasePct),
      action: "Downgrade the plan, switch to the annual billing cycle, or shop the equivalent service.",
      evidence: priceSub.priceHistory.map((p) => `${p.month}: ${formatINR(p.amount)}`),
      kind: "actual",
    });
  }

  // ── 5. Micro-spending ──
  const micro = expenses(txs).filter((t) => t.amount <= 200);
  if (micro.length >= 20) {
    const microTotal = micro.reduce((s, t) => s + t.amount, 0);
    const spendAll = totalSpend(txs) || 1;
    out.push({
      id: "insight-micro",
      severity: "medium",
      type: "micro",
      what: `${micro.length} transactions under ₹200 add up.`,
      why: `${micro.length} small transactions (chai, parking, wallet recharges, snacks) totalled ${formatINR(Math.round(microTotal))} in your history.`,
      impact: `${formatINR(Math.round(microTotal))} total — around ${Math.round((microTotal / spendAll) * 100)}% of all spending.`,
      confidence: 90,
      action: `Bundle small spends — set a daily chai/cash budget of ₹100 and see where the rest goes.`,
      evidence: [
        `${micro.length} transactions ≤ ₹200`,
        `Top micro merchants: ${[...new Set(micro.map((t) => t.merchant))].slice(0, 3).join(", ")}`,
        `${formatINR(Math.round(microTotal))} cumulative`,
      ],
      kind: "actual",
    });
  }

  // ── 6. Unusual transaction ──
  const anomaly = anomalies[0];
  if (anomaly) {
    out.push({
      id: "insight-anomaly",
      severity: "high",
      type: "anomaly",
      what: `Unusual transaction detected — ${formatINR(anomaly.tx.amount)} at ${anomaly.tx.merchant}.`,
      why: `${anomaly.reasons[0] ?? "Amount outside your normal range"}.`,
      impact: `${formatINR(anomaly.tx.amount)} on ${anomaly.tx.date} (${anomaly.multiple.toFixed(1)}× your typical ${formatINR(anomaly.baseline)}).`,
      confidence: anomaly.score,
      action: "Verify this transaction in the Anomalies tab. If you didn't make it, block the card and report it.",
      evidence: anomaly.reasons,
      kind: "inference",
    });
  }

  // ── 7. Weekend spending ──
  if (weekendRatio > 1.2) {
    out.push({
      id: "insight-weekend",
      severity: "low",
      type: "behavior",
      what: `You spend ${Math.round((weekendRatio - 1) * 100)}% more on weekends.`,
      why: "Spending on Saturday–Sunday runs well above your weekday average.",
      impact: `Weekend spend is ${formatINR(Math.round(weekdayWeekendAmount(txs)))}/week — ${formatINR(Math.round((weekdayWeekendAmount(txs) * (1 - 1 / weekendRatio))))} of it is above your weekday pace.`,
      confidence: 88,
      action: "Plan weekend outings ahead of time and set a weekend budget in the What If? simulator.",
      evidence: [`Weekend/day average vs weekday/day average ratio: ${weekendRatio.toFixed(2)}×`],
      kind: "inference",
    });
  }

  // ── 8. Late-night spending (share of *discretionary* spending after 9 PM —
  //     rent and bills at 9 AM shouldn't hide the delivery-at-midnight story) ──
  const night = discretionaryNightShare(txs);
  if (night.share > 0.2) {
    out.push({
      id: "insight-night",
      severity: "medium",
      type: "behavior",
      what: `${Math.round(night.share * 100)}% of discretionary spending happens after 9 PM.`,
      why: `Late-night purchases (${formatINR(Math.round(night.amount))} across food, shopping and transport) are dominated by food delivery and impulse buys.`,
      impact: `${formatINR(Math.round(night.amount * 0.3))}/month is realistically avoidable.`,
      confidence: 84,
      action: "Set a 9 PM ordering cutoff or delete saved cards from delivery apps.",
      evidence: [`After 9 PM: ${formatINR(Math.round(night.amount))}`, `${Math.round(night.share * 100)}% of discretionary spend`],
      kind: "inference",
    });
  }

  // ── 9. Fee leak ──
  const feeLeak = leaks.find((l) => l.kind === "fee");
  if (feeLeak) {
    out.push({
      id: "insight-fee",
      severity: "low",
      type: "fee",
      what: feeLeak.title,
      why: feeLeak.detail,
      impact: `Potential saving: ${formatINR(feeLeak.annual)}/year.`,
      confidence: 92,
      action: "Check for account-maintenance waivers, switch to zero-fee accounts, or maintain the minimum balance.",
      evidence: feeLeak.evidence.slice(0, 3),
      kind: "recommendation",
    });
  }

  // ── 10. Prediction ──
  const growth = forecast.nextMonthSpend > curMonthSpend ? Math.round(((forecast.nextMonthSpend - curMonthSpend) / Math.max(1, curMonthSpend)) * 100) : 0;
  if (growth > 0) {
    out.push({
      id: "insight-prediction",
      severity: "medium",
      type: "prediction",
      what: `If this trend continues, next month will cost ${formatINR(forecast.nextMonthSpend)}.`,
      why: `Based on your last ${Math.max(3, txs.length ? [...new Set(txs.map((t) => t.date.slice(0, 7)))].length : 0)} months, spending is trending ${growth > 0 ? "up" : "down"} ${Math.abs(growth)}%.`,
      impact: `Projected ${formatINR(Math.max(0, forecast.nextMonthSpend - curMonthSpend))} above this month — ${formatINR(Math.max(0, (forecast.nextMonthSpend - curMonthSpend) * 12))}/year if unchanged.`,
      confidence: 76,
      action: `Use the What If? simulator to cut the top projected categories before the month starts.`,
      evidence: forecast.insights.slice(0, 3),
      kind: "prediction",
    });
  }

  // ── 11. Opportunity summary ──
  const pot = potentialSavings(leaks);
  if (pot.monthly > 0) {
    out.push({
      id: "insight-opportunity",
      severity: "medium",
      type: "opportunity",
      what: `${formatINR(pot.monthly)}/month in potential savings found.`,
      why: `The leak detector found ${leaks.filter((l) => l.monthly > 0).length} actionable leaks across subscriptions, fees, and overspending.`,
      impact: `${formatINR(pot.annual)}/year if addressed.`,
      confidence: 85,
      action: "Open Financial Leaks and work through the highest-impact items first.",
      evidence: pot.breakdown.slice(0, 3).map((b) => `${b.label} — ${formatINR(b.monthly)}/month`),
      kind: "potential saving",
    });
  }

  const priority: Record<Insight["severity"], number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => priority[a.severity] - priority[b.severity] || b.confidence - a.confidence);
}

function weekdayWeekendAmount(txs: Transaction[]) {
  const recentKeys = lastNMonths(txs, 3);
  let weekend = 0;
  let weekdays = 0;
  for (const t of expenses(txs)) {
    if (!recentKeys.includes(monthKey(t.date))) continue;
    const d = new Date(`${t.date}T12:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    const day = d.getDay();
    if (day === 0 || day === 6) weekend += t.amount;
    else weekdays += t.amount;
  }
  return Math.round(weekend);
}

// ── Alerts ───────────────────────────────────────────────────────────────────

export function generateAlerts(ctx: InsightContext, riskLabel: string): Alert[] {
  const { anomalies, dups, subs, leaks, txs, currentMonth } = ctx;
  const out: Alert[] = [];

  for (const a of anomalies.slice(0, 2)) {
    out.push({
      id: `alert-anom-${a.id}`,
      level: "critical",
      title: "Unusual transaction detected",
      detail: `${formatINR(a.tx.amount)} at ${a.tx.merchant} on ${a.tx.date} (${a.multiple.toFixed(1)}× normal).`,
      date: a.tx.date,
      page: "anomalies",
    });
  }

  const overspend = leaks.find((l) => l.kind === "overspend" || l.kind === "spike");
  if (overspend) {
    out.push({
      id: "alert-spike",
      level: "warning",
      title: "Spending spike detected",
      detail: overspend.title,
      date: currentMonth,
      page: "root-cause",
    });
  }

  const priceSub = subs.filter((s) => s.priceIncreasePct >= 10)[0];
  if (priceSub) {
    out.push({
      id: "alert-price",
      level: "warning",
      title: `Subscription price increased — ${priceSub.merchant}`,
      detail: `${priceSub.priceIncreasePct}% higher than when you started.`,
      date: priceSub.lastSeen,
      page: "subscriptions",
    });
  }

  if (dups[0]) {
    out.push({
      id: "alert-dup",
      level: "warning",
      title: "Possible duplicate payment",
      detail: `${formatINR(dups[0].a.amount)} charged twice at ${dups[0].a.merchant}.`,
      date: dups[0].a.date,
      page: "anomalies",
    });
  }

  const recurring = subs.filter((s) => !s.unused).length;
  if (recurring > 0) {
    out.push({
      id: "alert-recurring",
      level: "info",
      title: `${recurring} recurring payment${recurring > 1 ? "s" : ""} active`,
      detail: `${formatINR(Math.round(subs.filter((s) => !s.unused).reduce((a, s) => a + s.monthlyCost, 0)))}/month in recurring charges tracked.`,
      date: subs[0]?.lastSeen ?? currentMonth,
      page: "subscriptions",
    });
  }

  const pot = potentialSavings(leaks);
  if (pot.monthly > 0) {
    out.push({
      id: "alert-save",
      level: "success",
      title: "Saving opportunity found",
      detail: `${formatINR(pot.monthly)}/month in potential savings detected.`,
      date: currentMonth,
      page: "leaks",
    });
  }

  out.push({
    id: "alert-risk",
    level: riskLabel === "High" ? "critical" : riskLabel === "Moderate" ? "warning" : "info",
    title: `Financial risk: ${riskLabel.toLowerCase()}`,
    detail: "Based on your spending trend, anomalies and recurring charges.",
    date: currentMonth,
    page: "forecast",
  });

  const priority: Record<Alert["level"], number> = { critical: 0, warning: 1, info: 2, success: 3 };
  return out.sort((a, b) => priority[a.level] - priority[b.level]);
}

export function lateNightFoodCount(txs: Transaction[], currentMonth: string) {
  return expenses(txs).filter((t) => t.category === "food" && hourOf(t) >= 21 && monthKey(t.date) === currentMonth).length;
}
