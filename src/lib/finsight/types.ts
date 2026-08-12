// ─── FinSight AI domain types ────────────────────────────────────────────────

export type TxKind = "expense" | "income";

export type PaymentType =
  | "UPI"
  | "Card"
  | "NEFT"
  | "IMPS"
  | "ATM"
  | "Wallet"
  | "Bank Charge"
  | "Cash";

export type TxStatus = "settled" | "pending" | "failed";

export type CategoryId =
  | "income"
  | "food"
  | "groceries"
  | "shopping"
  | "transport"
  | "travel"
  | "bills"
  | "utilities"
  | "entertainment"
  | "healthcare"
  | "education"
  | "subscriptions"
  | "investments"
  | "savings"
  | "fees"
  | "transfers"
  | "other";

export interface Transaction {
  id: string;
  /** ISO date (yyyy-mm-dd) */
  date: string;
  /** raw statement description */
  description: string;
  /** normalized merchant name */
  merchant: string;
  /** positive INR amount */
  amount: number;
  kind: TxKind;
  category: CategoryId;
  payment: PaymentType;
  status: TxStatus;
  /** 0-100 categorization confidence */
  confidence: number;
  /** true when detected as part of a recurring series */
  recurring?: boolean;
  /** true when the merchant normalized via UPI handle mapping */
  normalized?: boolean;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  current: number;
  monthlyTarget?: number;
  createdAt: string;
}

export interface Insight {
  id: string;
  severity: "high" | "medium" | "low";
  type:
    | "spending"
    | "duplicate"
    | "subscription"
    | "fee"
    | "micro"
    | "anomaly"
    | "prediction"
    | "opportunity"
    | "behavior";
  what: string;
  why: string;
  impact: string;
  confidence: number;
  action: string;
  /** evidence bullets behind the insight (explainable AI) */
  evidence: string[];
  /** classification: actual | inference | prediction | recommendation | potential saving */
  kind: "actual" | "inference" | "prediction" | "recommendation" | "potential saving";
}

export interface Alert {
  id: string;
  level: "critical" | "warning" | "info" | "success";
  title: string;
  detail: string;
  date: string;
  page: string;
}

export interface Subscription {
  id: string;
  merchant: string;
  amount: number;
  frequency: "monthly" | "quarterly" | "yearly";
  firstSeen: string;
  lastSeen: string;
  monthlyCost: number;
  annualCost: number;
  priceHistory: { month: string; amount: number }[];
  priceIncreasePct: number;
  unused: boolean;
  monthsActive: number;
  category: CategoryId;
}

export interface DuplicatePair {
  id: string;
  a: Transaction;
  b: Transaction;
  confidence: number;
  minutesApart: number;
  reason: string;
}

export interface Anomaly {
  id: string;
  tx: Transaction;
  score: number; // 0-100
  reasons: string[];
  baseline: number;
  multiple: number;
}

export interface Leak {
  id: string;
  kind: "subscription" | "fee" | "micro" | "price" | "spike" | "overspend";
  title: string;
  detail: string;
  monthly: number;
  annual: number;
  status?: "dismissed" | "useful" | "reminder";
  actions: { label: string; action: LeakAction }[];
  evidence: string[];
}

export type LeakAction = "investigate" | "mark-useful" | "reminder" | "dismiss";

export interface CategorySummary {
  id: CategoryId;
  label: string;
  amount: number;
  transactions: number;
  changePct: number | null; // vs 3-month average
  color: string;
  avgTx: number;
  share: number; // share of total expense 0-1
}

export interface MonthPoint {
  month: string; // "2026-03"
  label: string; // "Mar 26"
  income: number;
  spending: number;
  savings: number;
  subscriptions: number;
}

export interface MerchantIntel {
  merchant: string;
  category: CategoryId;
  total: number;
  count: number;
  avgTx: number;
  first: string;
  last: string;
  changePct: number | null;
  monthly: { label: string; amount: number }[];
  normalizedFrom?: string;
}

export interface HeatCell {
  date: string;
  amount: number;
  count: number;
}

export interface TimeOfDay {
  label: string;
  range: string;
  amount: number;
  share: number;
}

export interface TreeNode {
  label: string;
  value: string;
  detail?: string;
  children?: TreeNode[];
  level?: number;
  kind?: "root" | "branch" | "leaf";
}

export interface NetworkNode {
  id: string;
  label: string;
  value: number;
  severity: number; // 0-1
  group: string;
}
export interface NetworkLink {
  source: string;
  target: string;
  strength: number;
}

export interface BehaviorProfile {
  title: string;
  tagline: string;
  traits: { label: string; detail: string }[];
  blindSpots: { label: string; level: "HIGH" | "MEDIUM" | "LOW"; detail: string }[];
}

export interface ActionPlanItem {
  week: number;
  title: string;
  detail: string;
  monthly: number;
}
export interface ActionPlan {
  items: ActionPlanItem[];
  totalMonthly: number;
  totalAnnual: number;
}

export interface ForecastResult {
  nextMonthSpend: number;
  categoryForecasts: { category: CategoryId; label: string; expected: number; aboveAverage: number }[];
  subscriptionCharges: number;
  risk: "low" | "moderate" | "high";
  riskLabel: string;
  insights: string[];
  expectedSavings: number;
}

export interface ScenarioResult {
  monthly: number;
  annual: number;
  threeYear: number;
  byCategory: { category: CategoryId; label: string; current: number; target: number; saving: number }[];
  savingsRateAfter: number;
  newSavings: number;
}

export interface HealthBreakdown {
  id: string;
  label: string;
  score: number;
  weight: number;
  explanation: string;
}

// ─── Category metadata ───────────────────────────────────────────────────────

export const CATEGORIES: { id: CategoryId; label: string; color: string; emoji: string }[] = [
  { id: "income", label: "Income", color: "#34d399", emoji: "💵" },
  { id: "food", label: "Food", color: "#f59e0b", emoji: "🍜" },
  { id: "groceries", label: "Groceries", color: "#84cc16", emoji: "🛒" },
  { id: "shopping", label: "Shopping", color: "#a78bfa", emoji: "🛍️" },
  { id: "transport", label: "Transport", color: "#38bdf8", emoji: "🚕" },
  { id: "travel", label: "Travel", color: "#2dd4bf", emoji: "✈️" },
  { id: "bills", label: "Bills", color: "#fb7185", emoji: "🏠" },
  { id: "utilities", label: "Utilities", color: "#fbbf24", emoji: "⚡" },
  { id: "entertainment", label: "Entertainment", color: "#f472b6", emoji: "🎬" },
  { id: "healthcare", label: "Healthcare", color: "#4ade80", emoji: "💊" },
  { id: "education", label: "Education", color: "#c084fc", emoji: "🎓" },
  { id: "subscriptions", label: "Subscriptions", color: "#e879f9", emoji: "🔁" },
  { id: "investments", label: "Investments", color: "#22d3ee", emoji: "📈" },
  { id: "savings", label: "Savings", color: "#34d399", emoji: "🏦" },
  { id: "fees", label: "Fees", color: "#f87171", emoji: "🧾" },
  { id: "transfers", label: "Transfers", color: "#94a3b8", emoji: "🔁" },
  { id: "other", label: "Other", color: "#a8a29e", emoji: "📦" },
];

export const categoryMeta = (id: CategoryId) =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

export const categoryColor = (id: CategoryId) => categoryMeta(id).color;

/** Categories shown in the 3D financial universe */
export const UNIVERSE_CATEGORIES: CategoryId[] = [
  "food",
  "groceries",
  "shopping",
  "bills",
  "transport",
  "entertainment",
  "subscriptions",
  "investments",
  "savings",
  "fees",
  "other",
];

export function formatINR(n: number, opts: { compact?: boolean; sign?: boolean } = {}) {
  const abs = Math.abs(n);
  const sign = opts.sign && n < 0 ? "−" : "";
  if (opts.compact && abs >= 100000) {
    const v = abs / 100000;
    return `${sign}₹${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}L`;
  }
  if (opts.compact && abs >= 1000) {
    const v = abs / 1000;
    return `${sign}₹${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}k`;
  }
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
