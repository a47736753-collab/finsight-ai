// ─── Aggregation layer: turns transactions into structured analytics ────────

import {
  CATEGORIES,
  categoryMeta,
  type CategoryId,
  type CategorySummary,
  type HeatCell,
  type MerchantIntel,
  type MonthPoint,
  type TimeOfDay,
  type Transaction,
} from "./types";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}
export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

/** List of month keys present in the data, oldest → newest */
export function monthKeys(txs: Transaction[]): string[] {
  const set = new Set<string>();
  for (const t of txs) set.add(monthKey(t.date));
  return [...set].sort();
}

/** All months from first to last (filled), oldest → newest */
export function monthRange(txs: Transaction[]): string[] {
  const keys = monthKeys(txs);
  if (!keys.length) return [];
  const [startY, startM] = keys[0].split("-").map(Number);
  const [endY, endM] = keys[keys.length - 1].split("-").map(Number);
  const out: string[] = [];
  let y = startY;
  let m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export function monthlySeries(txs: Transaction[]): MonthPoint[] {
  const months = monthRange(txs);
  return months.map((key) => {
    let income = 0;
    let spending = 0;
    let subscriptions = 0;
    for (const t of txs) {
      if (monthKey(t.date) !== key || t.status === "failed") continue;
      if (t.kind === "income") {
        income += t.amount;
      } else if (t.category === "savings" || t.category === "investments" || t.category === "transfers") {
        // allocation, not spending — excluded from the spend line
      } else {
        spending += t.amount;
      }
      if (t.category === "subscriptions") subscriptions += t.amount;
    }
    return { month: key, label: monthLabel(key), income, spending, savings: income - spending, subscriptions };
  });
}

export function monthSpendMap(txs: Transaction[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.kind !== "expense" || t.status === "failed" || t.category === "savings" || t.category === "investments" || t.category === "transfers")
      continue;
    const k = monthKey(t.date);
    map.set(k, (map.get(k) ?? 0) + t.amount);
  }
  return map;
}

export function expenses(txs: Transaction[]): Transaction[] {
  return txs.filter(
    (t) =>
      t.kind === "expense" &&
      t.status !== "failed" &&
      t.category !== "savings" &&
      t.category !== "investments" &&
      t.category !== "transfers",
  );
}

/** all money out of the account (incl. savings/investments) */
export function outflow(txs: Transaction[]): Transaction[] {
  return txs.filter((t) => t.kind === "expense" && t.status !== "failed");
}

export function totalIncome(txs: Transaction[], key?: string) {
  return txs.reduce((s, t) => (t.kind === "income" && t.status !== "failed" && (!key || monthKey(t.date) === key) ? s + t.amount : s), 0);
}

export function totalSpend(txs: Transaction[], key?: string) {
  return expenses(txs).reduce((s, t) => (!key || monthKey(t.date) === key ? s + t.amount : s), 0);
}

export function lastNMonths(txs: Transaction[], n: number) {
  const keys = monthRange(txs);
  return keys.slice(-n);
}

/** spending for a specific month key (excl savings/investments/transfers) */
export function spendInMonth(txs: Transaction[], key: string) {
  return expenses(txs).reduce((s, t) => (monthKey(t.date) === key ? s + t.amount : s), 0);
}

/** average monthly spend over the last `n` months */
export function avgMonthlySpend(txs: Transaction[], n = 3) {
  const keys = lastNMonths(txs, n);
  if (!keys.length) return 0;
  return keys.reduce((s, k) => s + spendInMonth(txs, k), 0) / keys.length;
}

export function categorySummaries(txs: Transaction[], key?: string): CategorySummary[] {
  const ex = expenses(txs).filter((t) => !key || monthKey(t.date) === key);
  const prev = (map: Map<string, number>, cat: CategoryId) => map.get(cat) ?? 0;
  // 3-month average (excluding current key) for change calc
  const avgMap = new Map<CategoryId, number>();
  const prevKeys = key ? lastNMonths(txs, 4).filter((k) => k !== key).slice(-3) : lastNMonths(txs, 3);
  for (const t of expenses(txs)) {
    if (!prevKeys.includes(monthKey(t.date))) continue;
    avgMap.set(t.category, (avgMap.get(t.category) ?? 0) + t.amount);
  }
  for (const k of avgMap.keys()) avgMap.set(k, avgMap.get(k)! / Math.max(1, prevKeys.length));

  const totals = new Map<CategoryId, { amount: number; count: number }>();
  for (const t of ex) {
    const e = totals.get(t.category) ?? { amount: 0, count: 0 };
    e.amount += t.amount;
    e.count++;
    totals.set(t.category, e);
  }
  const total = [...totals.values()].reduce((s, v) => s + v.amount, 0);
  const out: CategorySummary[] = [];
  for (const c of CATEGORIES) {
    if (c.id === "income") continue;
    const t = totals.get(c.id);
    if (!t || t.count === 0) continue;
    const avg = prev(avgMap, c.id);
    out.push({
      id: c.id,
      label: c.label,
      amount: t.amount,
      transactions: t.count,
      changePct: avg > 0 ? Math.round(((t.amount - avg) / avg) * 100) : null,
      color: c.color,
      avgTx: t.amount / t.count,
      share: total > 0 ? t.amount / total : 0,
    });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

export function merchantIntel(txs: Transaction[]): MerchantIntel[] {
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of expenses(txs)) {
    const arr = byMerchant.get(t.merchant) ?? [];
    arr.push(t);
    byMerchant.set(t.merchant, arr);
  }
  const keys = lastNMonths(txs, 3);
  const out: MerchantIntel[] = [];
  for (const [merchant, arr] of byMerchant) {
    const sorted = [...arr].sort((a, b) => (a.date < b.date ? 1 : -1));
    const total = arr.reduce((s, t) => s + t.amount, 0);
    const monthlyMap = new Map<string, number>();
    for (const t of arr) {
      const k = monthKey(t.date);
      monthlyMap.set(k, (monthlyMap.get(k) ?? 0) + t.amount);
    }
    const recent = keys.filter((k) => monthlyMap.has(k));
    const prev = keys.filter((k) => !monthlyMap.has(k));
    const recentAvg = recent.length ? recent.reduce((s, k) => s + monthlyMap.get(k)!, 0) / recent.length : 0;
    const prevAvg = prev.length ? prev.reduce((s, k) => s + monthlyMap.get(k)!, 0) / prev.length : 0;
    out.push({
      merchant,
      category: sorted[0].category,
      total,
      count: arr.length,
      avgTx: total / arr.length,
      first: sorted[sorted.length - 1].date,
      last: sorted[0].date,
      changePct: prevAvg > 0 ? Math.round(((recentAvg - prevAvg) / prevAvg) * 100) : null,
      monthly: keys.map((k) => ({ label: monthLabel(k), amount: monthlyMap.get(k) ?? 0 })),
      normalizedFrom: arr.some((t) => t.normalized) ? "UPI handle" : undefined,
    });
  }
  return out.sort((a, b) => b.total - a.total);
}

export function spendingHeatmap(txs: Transaction[]): { cells: HeatCell[]; total: number; avgPerDay: number; days: number } {
  const byDay = new Map<string, HeatCell>();
  for (const t of expenses(txs)) {
    const e = byDay.get(t.date) ?? { date: t.date, amount: 0, count: 0 };
    e.amount += t.amount;
    e.count++;
    byDay.set(t.date, e);
  }
  const cells = [...byDay.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  const total = cells.reduce((s, c) => s + c.amount, 0);
  return { cells, total, avgPerDay: total / Math.max(1, cells.length), days: cells.length };
}

const TIMES = [
  { label: "Morning", range: "6 AM – 12 PM", lo: 6, hi: 12 },
  { label: "Afternoon", range: "12 PM – 5 PM", lo: 12, hi: 17 },
  { label: "Evening", range: "5 PM – 9 PM", lo: 17, hi: 21 },
  { label: "Night", range: "9 PM – 6 AM", lo: 21, hi: 30 },
];

export function timeOfDay(txs: Transaction[]): TimeOfDay[] {
  const buckets = TIMES.map((t) => ({ ...t, amount: 0 }));
  for (const t of expenses(txs)) {
    const hr = hourOf(t);
    const b = buckets.find((b) => hr >= b.lo && hr < b.hi);
    if (b) b.amount += t.amount;
  }
  const total = buckets.reduce((s, b) => s + b.amount, 0);
  return buckets.map((b) => ({ label: b.label, range: b.range, amount: b.amount, share: total ? b.amount / total : 0 }));
}

/**
 * Hour of day for a transaction. When the data records the time (statement
 * imports, demo generator) we use it directly; otherwise we derive a stable
 * pseudo-hour from the description hash — keeps time-of-day analytics honest
 * (same tx always maps to the same bucket) without inventing randomness.
 */
export function hourOf(t: Transaction): number {
  if (t.hour !== undefined && t.hour >= 0 && t.hour <= 23) return t.hour;
  let h = 0;
  const str = `${t.id}|${t.merchant}|${t.description}`;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return (h % 24) + 1;
}

export function weekdayStats(txs: Transaction[]): { byDay: { day: string; amount: number; share: number }[]; weekendRatio: number } {
  // Recent window (last 3 months) — weekend-vs-weekday is a current-behavior
  // signal; a long history with a few outliers would dilute it to noise.
  const recentKeys = lastNMonths(txs, 3);
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const amounts = [0, 0, 0, 0, 0, 0, 0];
  for (const t of expenses(txs)) {
    if (!recentKeys.includes(monthKey(t.date))) continue;
    const d = new Date(`${t.date}T12:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    amounts[d.getDay()] += t.amount;
  }
  const total = amounts.reduce((s, a) => s + a, 0);
  const week = amounts.slice(1, 6).reduce((s, a) => s + a, 0) / 5;
  const weekend = (amounts[0] + amounts[6]) / 2;
  const weekendRatio = week > 0 ? weekend / week : 1;
  return {
    byDay: names.map((day, i) => ({ day, amount: amounts[i], share: total ? amounts[i] / total : 0 })),
    weekendRatio,
  };
}

export function transactionsBelow(txs: Transaction[], threshold: number) {
  return expenses(txs).filter((t) => t.amount <= threshold);
}

/** Categories where behavior (not bills) drives the pattern — used for the
 *  late-night and impulse-spending stories so rent/SIP/fee noise doesn't
 *  dilute them. */
export const DISCRETIONARY: CategoryId[] = ["food", "shopping", "entertainment", "transport", "other"];

/** Share of discretionary spending (recent 3 months) happening after 9 PM. */
export function discretionaryNightShare(txs: Transaction[]) {
  const recentKeys = lastNMonths(txs, 3);
  let discTotal = 0;
  let nightTotal = 0;
  for (const t of expenses(txs)) {
    if (!recentKeys.includes(monthKey(t.date))) continue;
    if (!DISCRETIONARY.includes(t.category)) continue;
    discTotal += t.amount;
    if (hourOf(t) >= 21) nightTotal += t.amount;
  }
  return { amount: nightTotal, share: discTotal > 0 ? nightTotal / discTotal : 0 };
}

export function categoryOf(t: Transaction): CategoryId {
  return t.category;
}

export function categoryLabel(id: CategoryId) {
  return categoryMeta(id).label;
}

export function topCategories(txs: Transaction[], key?: string, n = 5) {
  return categorySummaries(txs, key).slice(0, n);
}

export function pctChange(a: number, b: number) {
  if (b === 0) return null;
  return Math.round(((a - b) / b) * 100);
}
