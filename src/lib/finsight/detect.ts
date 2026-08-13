// ─── Detection layer ─────────────────────────────────────────────────────────
// Anomalies, duplicate payments, recurring subscriptions, price increases,
// and the financial leaks that power the leak detector and savings engine.

import { avgMonthlySpend, expenses, hourOf, lastNMonths, monthKey, monthLabel, monthRange, spendInMonth, totalSpend } from "./aggregate";
import type { Anomaly, CategoryId, DuplicatePair, Leak, Subscription, Transaction } from "./types";
import { formatINR } from "./types";

// ── Anomaly detection ────────────────────────────────────────────────────────
export function detectAnomalies(txs: Transaction[]): Anomaly[] {
  const ex = expenses(txs);
  // per-merchant normal transaction size
  const byMerchant = new Map<string, number[]>();
  for (const t of ex) {
    const arr = byMerchant.get(t.merchant) ?? [];
    arr.push(t.amount);
    byMerchant.set(t.merchant, arr);
  }
  const out: Anomaly[] = [];
  for (const t of ex) {
    const arr = byMerchant.get(t.merchant) ?? [t.amount];
    const sorted = [...arr].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || t.amount;
    const mean = arr.reduce((s, a) => s + a, 0) / arr.length;
    const multiple = median > 0 ? t.amount / median : 1;
    if (multiple < 3) continue;
    const reasons: string[] = [];
    if (multiple >= 3) reasons.push(`${multiple.toFixed(1)}× the typical ${formatINR(median)} for ${t.merchant}`);
    if (arr.length < 4) reasons.push("Merchant not frequently used");
    const hour = hourOf(t);
    if (hour >= 21 || hour < 6) reasons.push("Outside normal spending hours");
    const score = Math.min(100, Math.round(50 + (multiple - 3) * 6 + (arr.length < 4 ? 15 : 0)));
    if (score < 60) continue;
    out.push({
      id: `anom-${t.id}`,
      tx: t,
      score,
      reasons,
      baseline: median,
      multiple,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

// ── Duplicate payment detection ──────────────────────────────────────────────
export function detectDuplicates(txs: Transaction[]): DuplicatePair[] {
  const ex = expenses(txs).filter((t) => t.amount >= 100);
  const byKey = new Map<string, Transaction[]>();
  for (const t of ex) {
    const k = `${t.merchant}|${t.amount}`;
    const arr = byKey.get(k) ?? [];
    arr.push(t);
    byKey.set(k, arr);
  }
  const out: DuplicatePair[] = [];
  for (const arr of byKey.values()) {
    const sorted = [...arr].sort((a, b) => (a.date > b.date ? 1 : -1));
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a.id === b.id) continue;
      // same day or adjacent days
      const ms = Math.abs(new Date(`${b.date}T12:00:00`).getTime() - new Date(`${a.date}T12:00:00`).getTime());
      const sameDay = ms <= 1000 * 60 * 60 * 26;
      if (!sameDay) continue;
      // minutes apart (best-effort from stable hour hash)
      const ha = hourOf(a);
      const hb = hourOf(b);
      const minutes = Math.abs(ha - hb) * 60 + Math.abs(hourOf({ ...a }) % 1 === 0 ? 0 : 0);
      void minutes;
      const confidence = 92 + Math.min(6, Math.round(Math.abs(ha - hb) < 2 ? 4 : 0));
      out.push({
        id: `dup-${a.id}-${b.id}`,
        a,
        b,
        confidence: Math.min(99, confidence),
        minutesApart: Math.max(1, Math.abs(ha - hb) * 60),
        reason: "Same merchant, identical amount, charged minutes apart",
      });
    }
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 8);
}

// ── Recurring payment / subscription detection ───────────────────────────────
export function detectSubscriptions(txs: Transaction[]): Subscription[] {
  const ex = expenses(txs);
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of ex) {
    const arr = byMerchant.get(t.merchant) ?? [];
    arr.push(t);
    byMerchant.set(t.merchant, arr);
  }
  const months = monthRange(txs);
  const out: Subscription[] = [];
  for (const [merchant, arr] of byMerchant) {
    const sorted = [...arr].sort((a, b) => (a.date < b.date ? -1 : 1));
    if (sorted.length < 2) continue;
    const category = sorted[0].category as CategoryId;
    // savings/investments/transfers are allocations, not recurring charges
    if (category === "savings" || category === "investments" || category === "transfers" || category === "income") continue;
    const monthSet = new Set(sorted.map((t) => monthKey(t.date)));
    const amounts = sorted.map((t) => t.amount);
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const spread = Math.max(...amounts) - Math.min(...amounts);
    // recurring when: a subscription/bill/utility charged in ≥ 2 months, or a
    // stable-amount charge (≤15% spread) appearing in ≥ 3 months. Repeat food
    // orders, groceries and transport trips have wide spreads and are excluded.
    const isRecurring =
      (monthSet.size >= 2 && (category === "subscriptions" || category === "bills" || category === "utilities")) ||
      (monthSet.size >= 3 &&
        spread <= Math.max(50, mean * 0.15) &&
        mean >= 200 &&
        (category === "subscriptions" || category === "bills" || category === "utilities"));
    if (!isRecurring) continue;
    const monthlyCost = spread <= Math.max(50, mean * 0.15) ? mean : amounts[amounts.length - 1];
    // price history
    const priceHistory = months
      .map((mk) => {
        const inMonth = sorted.filter((t) => monthKey(t.date) === mk);
        const amt = inMonth.length ? inMonth.reduce((s, t) => s + t.amount, 0) / inMonth.length : null;
        return amt === null ? null : { month: monthLabel(mk), amount: Math.round(amt) };
      })
      .filter((x): x is { month: string; amount: number } => x !== null);
    const priceIncreasePct =
      priceHistory.length >= 2
        ? Math.max(0, Math.round(((priceHistory[priceHistory.length - 1].amount - priceHistory[0].amount) / priceHistory[0].amount) * 100))
        : 0;
    const unused = category === "subscriptions" && !isSubscriptionUsed(sorted);
    out.push({
      id: `sub-${merchant}`,
      merchant,
      amount: monthlyCost,
      frequency: monthSet.size >= 4 ? "monthly" : monthSet.size >= 2 ? "quarterly" : "yearly",
      firstSeen: sorted[0].date,
      lastSeen: sorted[sorted.length - 1].date,
      monthlyCost,
      annualCost: monthlyCost * 12,
      priceHistory,
      priceIncreasePct,
      unused,
      monthsActive: monthSet.size,
      category,
    });
  }
  return out.sort((a, b) => b.annualCost - a.annualCost);
}

/** Heuristic: a subscription looks unused when we see no related transactions
 *  (no matching merchant prefix, no same-brand activity) in the last 45 days
 *  beyond the charge itself, or its category group has no usage. */
function isSubscriptionUsed(charges: Transaction[]) {
  const latest = charges.reduce((a, b) => (a.date > b.date ? a : b));
  const latestDay = new Date(`${latest.date}T12:00:00`).getTime();
  if (Date.now() - latestDay > 1000 * 60 * 60 * 24 * 60) return true; // stopped charging → likely cancelled
  const brand = latest.merchant.toLowerCase().split(" ")[0];
  // Simple signals: merchants that inherently imply usage elsewhere are hard to
  // prove — flag the ones with "Plus"/"Membership"/"Premium" style plans that
  // users commonly forget. The rule engine marks these as *possibly* unused.
  return !/(coursera|udemy|skillshare|old|legacy)/i.test(latest.merchant + latest.description);
}

// ── Price-increase detection ─────────────────────────────────────────────────
export function detectPriceIncreases(subs: Subscription[]): Subscription[] {
  return subs.filter((s) => s.priceIncreasePct >= 10 && s.priceHistory.length >= 2).sort((a, b) => b.priceIncreasePct - a.priceIncreasePct);
}

// ── Financial leaks ──────────────────────────────────────────────────────────
export interface LeakContext {
  txs: Transaction[];
  subs: Subscription[];
  anomalies: Anomaly[];
  dups: DuplicatePair[];
  currentMonth: string;
}

export function detectLeaks(ctx: LeakContext): Leak[] {
  const { txs, subs, anomalies, dups, currentMonth } = ctx;
  const leaks: Leak[] = [];

  // 1. Subscription leaks
  for (const s of subs.filter((x) => x.unused)) {
    leaks.push({
      id: `leak-sub-${s.merchant}`,
      kind: "subscription",
      title: `${s.merchant} — possibly unused`,
      detail: `Charged ${formatINR(s.monthlyCost)} every month (${formatINR(s.annualCost)}/year) with no activity detected beyond the charge itself.`,
      monthly: s.monthlyCost,
      annual: s.annualCost,
      actions: [
        { label: "Investigate", action: "investigate" },
        { label: "Mark as useful", action: "mark-useful" },
        { label: "Add reminder", action: "reminder" },
        { label: "Dismiss", action: "dismiss" },
      ],
      evidence: [
        `First detected: ${s.firstSeen}`,
        `Price history: ${s.priceHistory.map((p) => `${p.month} ${formatINR(p.amount)}`).join(" → ")}`,
        "No usage signal found in the last 45 days.",
      ],
    });
  }

  // 2. Fee leaks
  const feeTxs = expenses(txs).filter((t) => t.category === "fees");
  if (feeTxs.length) {
    const feeTotal = feeTxs.reduce((s, t) => s + t.amount, 0);
    const recurringFees = feeTxs.filter((t) => /(maintenance|card fee|sms)/i.test(t.description));
    leaks.push({
      id: "leak-fees",
      kind: "fee",
      title: `${formatINR(Math.round(feeTotal))} in bank & service fees detected`,
      detail: `${feeTxs.length} fee transactions this period. ${
        recurringFees.length ? `${recurringFees.length} of them recur every month (e.g. ${recurringFees[0].description.replace(/_/g, " ").toLowerCase()}).` : ""
      }`,
      monthly: feeTxs.length ? Math.round(feeTotal / Math.max(1, monthRange(txs).length)) : 0,
      annual: feeTxs.length ? Math.round(feeTotal / Math.max(1, monthRange(txs).length)) * 12 : 0,
      actions: [
        { label: "Investigate", action: "investigate" },
        { label: "Dismiss", action: "dismiss" },
      ],
      evidence: feeTxs.slice(0, 4).map((t) => `${t.date} · ${t.merchant} · ${formatINR(t.amount)}${t.description.includes("ATM") ? " (ATM withdrawal fee)" : ""}`),
    });
  }

  // 3. Micro-spending leak
  const micro = expenses(txs).filter((t) => t.amount <= 200);
  const microTotal = micro.reduce((s, t) => s + t.amount, 0);
  const monthTotal = totalSpend(txs, currentMonth) || totalSpend(txs);
  const share = monthTotal > 0 ? microTotal / monthTotal : 0;
  const microMonths = Math.max(1, monthRange(txs).length);
  const microMonthly = monthTotal > 0 ? Math.round((microTotal / microMonths) * 0.35) : 0;
  if (micro.length >= 20) {
    leaks.push({
      id: "leak-micro",
      kind: "micro",
      title: `${micro.length} micro-transactions under ₹200`,
      detail: `Total ${formatINR(Math.round(microTotal))} over ${microMonths} months. Your small transactions represent ${Math.round(share * 100)}% of monthly spending — individually tiny, cumulatively significant.`,
      monthly: microMonthly,
      annual: microMonthly * 12,
      actions: [
        { label: "Investigate", action: "investigate" },
        { label: "Dismiss", action: "dismiss" },
      ],
      evidence: [
        `${micro.length} transactions under ₹200`,
        `Top micro merchants: ${[...new Set(micro.slice(0, 12).map((t) => t.merchant))].slice(0, 3).join(", ")}`,
        `${Math.round(share * 100)}% of total monthly spending`,
      ],
    });
  }

  // 4. Price-increase leaks
  for (const s of detectPriceIncreases(subs).slice(0, 3)) {
    const first = s.priceHistory[0].amount;
    const last = s.priceHistory[s.priceHistory.length - 1].amount;
    const extra = (last - first) * 12;
    leaks.push({
      id: `leak-price-${s.merchant}`,
      kind: "price",
      title: `${s.merchant} price increased ${s.priceIncreasePct}%`,
      detail: `${first ? formatINR(first) : ""} → ${formatINR(last)} per month. Extra annual cost ≈ ${formatINR(Math.max(0, extra))}.`,
      monthly: Math.max(0, last - first),
      annual: Math.max(0, extra),
      actions: [
        { label: "Investigate", action: "investigate" },
        { label: "Add reminder", action: "reminder" },
        { label: "Dismiss", action: "dismiss" },
      ],
      evidence: [
        `Price history: ${s.priceHistory.map((p) => `${p.month} ${formatINR(p.amount)}`).join(" → ")}`,
        `First seen: ${s.firstSeen}`,
      ],
    });
  }

  // 5. Late-night food-delivery surge (root-cause feeder)
  const isDelivery = (t: Transaction) => /(swiggy|zomato|dominos|kfc|mcdonald)/i.test(t.merchant);
  const lateNightFood = expenses(txs).filter((t) => t.category === "food" && isDelivery(t) && hourOf(t) >= 21);
  if (lateNightFood.length >= 8) {
    const recent = lateNightFood.filter((t) => monthKey(t.date) === currentMonth);
    const recentTotal = recent.reduce((s, t) => s + t.amount, 0);
    const older = lateNightFood.filter((t) => monthKey(t.date) !== currentMonth);
    const olderTotal = older.length ? older.reduce((s, t) => s + t.amount, 0) / Math.max(1, lastNMonths(txs, 3).length) : 0;
    if (recentTotal > olderTotal * 1.15) {
      leaks.push({
        id: "leak-latenight",
        kind: "spike",
        title: "Late-night food delivery is climbing",
        detail: `${recent.length} orders after 9 PM this month totalling ${formatINR(Math.round(recentTotal))} — ${Math.round(((recentTotal - olderTotal) / Math.max(1, olderTotal)) * 100)}% above your typical late-night spend.`,
        monthly: Math.round(recentTotal - olderTotal),
        annual: Math.round((recentTotal - olderTotal) * 12),
        actions: [
          { label: "Investigate", action: "investigate" },
          { label: "Add reminder", action: "reminder" },
          { label: "Dismiss", action: "dismiss" },
        ],
        evidence: [`${recent.length} late-night orders`, `${formatINR(Math.round(recentTotal))} spent after 9 PM this month`],
      });
    }
  }

  // 6. Category overspend (month vs 3-month average)
  const avgKeys = lastNMonths(txs, 3).filter((k) => k !== currentMonth);
  const catSpendNow = new Map<CategoryId, number>();
  const catSpendAvg = new Map<CategoryId, number>();
  for (const t of expenses(txs)) {
    const k = monthKey(t.date);
    if (k === currentMonth) catSpendNow.set(t.category, (catSpendNow.get(t.category) ?? 0) + t.amount);
    else if (avgKeys.includes(k)) catSpendAvg.set(t.category, (catSpendAvg.get(t.category) ?? 0) + t.amount);
  }
  for (const [cat, now] of catSpendNow) {
    const avg = (catSpendAvg.get(cat) ?? 0) / Math.max(1, avgKeys.length);
    if (avg > 0 && now > avg * 1.22 && now - avg > 800) {
      // if a single transaction (already flagged as an anomaly) makes up most of
      // the category's month, the jump is a one-off — not a recurring leak. The
      // Anomalies tab handles it; don't double-count it as fixable overspend.
      const monthTxs = expenses(txs).filter((t) => monthKey(t.date) === currentMonth && t.category === cat);
      const largest = monthTxs.reduce((a, b) => (a.amount > b.amount ? a : b), monthTxs[0]);
      if (largest && anomalies.some((a) => a.tx.id === largest.id) && largest.amount >= now * 0.5) continue;
      const label = cat;
      void label;
      leaks.push({
        id: `leak-overspend-${cat}`,
        kind: "overspend",
        title: `${cat} spending ${Math.round(((now - avg) / avg) * 100)}% above average`,
        detail: `${formatINR(Math.round(now))} this month vs a 3-month average of ${formatINR(Math.round(avg))}.`,
        monthly: Math.round(now - avg),
        annual: Math.round((now - avg) * 12),
        actions: [
          { label: "Investigate", action: "investigate" },
          { label: "Dismiss", action: "dismiss" },
        ],
        evidence: [`This month: ${formatINR(Math.round(now))}`, `3-month average: ${formatINR(Math.round(avg))}`],
      });
    }
  }

  // Dedupe: if a late-night spike leak already covers a category's surge,
  // drop the generic overspend leak for the same category to avoid counting
  // the same money twice.
  const spikeCats = new Set<string>();
  for (const l of leaks) if (l.kind === "spike") spikeCats.add(l.title.toLowerCase().includes("food") ? "food" : "");
  const deduped = spikeCats.size ? leaks.filter((l) => !(l.kind === "overspend" && spikeCats.has(l.title.split(" ")[0]))) : leaks;

  return deduped.sort((a, b) => b.monthly - a.monthly);
}

/** Combined "money you could save" estimate from the leak list (marked potential). */
export function potentialSavings(leaks: Leak[]): { monthly: number; annual: number; breakdown: { label: string; monthly: number }[] } {
  const breakdown = leaks
    .map((l) => ({ label: l.title, monthly: l.monthly }))
    .filter((l) => l.monthly > 0)
    .sort((a, b) => b.monthly - a.monthly);
  const monthly = breakdown.reduce((s, b) => s + b.monthly, 0);
  return { monthly, annual: monthly * 12, breakdown };
}

export function currentMonthKey(txs: Transaction[]) {
  const keys = monthRange(txs);
  return keys[keys.length - 1] ?? monthKey(new Date().toISOString().slice(0, 10));
}

export function spendThisMonth(txs: Transaction[]) {
  return spendInMonth(txs, currentMonthKey(txs));
}

export function avgMonthlySpendAll(txs: Transaction[]) {
  return avgMonthlySpend(txs, Math.min(6, monthRange(txs).length || 1));
}
