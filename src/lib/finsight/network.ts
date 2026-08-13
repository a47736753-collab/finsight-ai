// ─── Financial leak network ──────────────────────────────────────────────────
// An interactive graph showing how spending behaviors cascade into outcomes:
//   late-night usage → food delivery → monthly spending → lower savings
//   → credit utilization → potential interest cost

import { expenses, hourOf, lastNMonths, monthKey, spendInMonth, totalSpend } from "./aggregate";
import { currentMonthKey } from "./detect";
import type {
  Anomaly,
  CategorySummary,
  DuplicatePair,
  NetworkLink,
  NetworkNode,
  NetworkResult,
  Subscription,
  Transaction,
} from "./types";
import { formatINR } from "./types";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function buildNetwork(
  txs: Transaction[],
  categories: CategorySummary[],
  subs: Subscription[],
  anomalies: Anomaly[],
  dups: DuplicatePair[],
): NetworkResult {
  const current = currentMonthKey(txs);
  const spend = spendInMonth(txs, current) || totalSpend(txs);
  const avgKeys = lastNMonths(txs, 3).filter((k) => k !== current);
  const avg = avgKeys.length ? avgKeys.reduce((s, k) => s + spendInMonth(txs, k), 0) / avgKeys.length : 0;

  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  const byId = new Map<string, NetworkNode>();

  const addNode = (id: string, label: string, value: number, severity: number, group: string) => {
    if (byId.has(id)) return byId.get(id)!;
    const node: NetworkNode = { id, label, value, severity: clamp01(severity), group };
    nodes.push(node);
    byId.set(id, node);
    return node;
  };
  const addLink = (source: string, target: string, strength: number) => {
    links.push({ source, target, strength: clamp01(strength) });
  };

  // ── root: monthly spending ──
  const spendChange = avg > 0 ? (spend - avg) / avg : 0;
  const monthly = addNode("monthlySpending", "Monthly Spending", spend, 0.25 + clamp01(spendChange) * 0.6, "spending");

  // ── behavior nodes ──
  const late = expenses(txs).filter((t) => hourOf(t) >= 21);
  const lateTotal = late.reduce((s, t) => s + t.amount, 0);
  const lateNode = late.length >= 6 ? addNode("lateNight", "Late-night Usage", lateTotal, lateTotal / Math.max(1, spend), "behavior") : null;

  const micro = expenses(txs).filter((t) => t.amount <= 200);
  const microTotal = micro.reduce((s, t) => s + t.amount, 0);
  const microNode = micro.length >= 20 ? addNode("micro", "Micro-transactions", microTotal, microTotal / Math.max(1, spend), "behavior") : null;

  const subTotal = subs.reduce((s, x) => s + x.monthlyCost, 0);
  const subNode = subs.length ? addNode("subscriptions", "Subscriptions", subTotal, subTotal / Math.max(1, spend), "behavior") : null;

  const feeTotal = expenses(txs).filter((t) => t.category === "fees").reduce((s, t) => s + t.amount, 0);
  const feeNode = feeTotal > 0 ? addNode("fees", "Bank & Service Fees", feeTotal, feeTotal / Math.max(1, spend), "behavior") : null;

  const dupNode = dups.length ? addNode("duplicates", "Duplicate Payments", dups.reduce((s, d) => s + d.a.amount, 0), Math.min(1, dups.length * 0.3), "behavior") : null;
  const anomNode = anomalies.length ? addNode("anomalies", "Unusual Charges", anomalies.reduce((s, a) => s + a.tx.amount, 0), Math.min(1, anomalies.length * 0.25), "behavior") : null;

  // ── consequence chain ──
  const savingsNode = addNode("lowerSavings", "Lower Savings", Math.max(0, spend - avg), clamp01(spendChange), "consequence");
  const creditNode = addNode("creditUtilization", "Higher Credit Utilization", 0, 0.3 + clamp01(spendChange) * 0.5, "consequence");
  const interestNode = addNode("interestCost", "Potential Interest Cost", 0, 0.35 + clamp01(spendChange) * 0.55, "consequence");

  // ── category nodes (top 5 by current-month spend) ──
  const topCats = categories.slice(0, 5);
  for (const c of topCats) {
    addNode(`cat-${c.id}`, c.label, c.amount, Math.max(0.15, (c.changePct ?? 0) / 80), "category");
  }

  // ── links ──
  if (lateNode) {
    addLink("lateNight", "cat-food", 0.9);
    addLink("lateNight", "monthlySpending", 0.75);
  }
  if (microNode) addLink("micro", "monthlySpending", 0.6);
  if (subNode) addLink("subscriptions", "monthlySpending", 0.7);
  if (feeNode) addLink("fees", "monthlySpending", 0.5);
  if (dupNode) addLink("duplicates", "monthlySpending", 0.55);
  if (anomNode) addLink("anomalies", "monthlySpending", 0.55);

  for (const c of topCats) addLink(`cat-${c.id}`, "monthlySpending", 0.5 + (c.share ?? 0));

  addLink("monthlySpending", "lowerSavings", 0.8);
  addLink("lowerSavings", "creditUtilization", 0.7);
  addLink("creditUtilization", "interestCost", 0.8);

  // remove dangling category links (node may not exist if category not present)
  const cleanLinks = links.filter((l) => byId.has(l.source) && byId.has(l.target));

  let headline = "No major leak cascade detected — spending is under control.";
  if (lateNode && microNode) {
    headline = `Late-night usage and micro-transactions are the top of your leak cascade.`;
  } else if (lateNode) {
    headline = "Late-night usage sits at the top of your leak cascade.";
  } else if (subNode && subNode.severity > 0.2) {
    headline = "Subscription drag is your most connected leak.";
  } else if (spendChange > 0.1) {
    headline = `Monthly spending (+${Math.round(spendChange * 100)}%) is feeding into lower savings.`;
  }

  return { nodes, links: cleanLinks, headline };
}

export function networkNodeDetail(id: string, ctx: {
  categories: CategorySummary[];
  subs: Subscription[];
  anomalies: Anomaly[];
  dups: DuplicatePair[];
  txs: Transaction[];
}): { title: string; lines: string[] } | null {
  const { categories, subs, anomalies, dups, txs } = ctx;
  const cat = categories.find((c) => `cat-${c.id}` === id);
  if (cat) {
    return {
      title: cat.label,
      lines: [
        `${formatINR(cat.amount)} this month across ${cat.transactions} transactions`,
        cat.changePct !== null ? `${cat.changePct > 0 ? "+" : ""}${cat.changePct}% vs 3-month average` : "No prior baseline",
        `Average transaction: ${formatINR(Math.round(cat.avgTx))}`,
        `${Math.round((cat.share ?? 0) * 100)}% of monthly spending`,
      ],
    };
  }
  if (id === "lateNight") {
    const late = expenses(txs).filter((t) => hourOf(t) >= 21);
    const total = late.reduce((s, t) => s + t.amount, 0);
    return {
      title: "Late-night Usage",
      lines: [
        `${late.length} transactions after 9 PM totalling ${formatINR(Math.round(total))}`,
        "Feeds food delivery and impulse purchases",
        "Disproportionately avoidable",
      ],
    };
  }
  if (id === "micro") {
    const micro = expenses(txs).filter((t) => t.amount <= 200);
    const total = micro.reduce((s, t) => s + t.amount, 0);
    return {
      title: "Micro-transactions",
      lines: [
        `${micro.length} transactions under ₹200`,
        `Cumulative: ${formatINR(Math.round(total))}`,
        "Individually tiny, collectively significant",
      ],
    };
  }
  if (id === "subscriptions") {
    return {
      title: "Subscriptions",
      lines: [
        `${subs.length} recurring services, ${formatINR(Math.round(subs.reduce((s, x) => s + x.monthlyCost, 0)))}/month`,
        `${subs.filter((s) => s.unused).length} possibly unused`,
        `${formatINR(Math.round(subs.reduce((s, x) => s + x.annualCost, 0)))}/year total`,
      ],
    };
  }
  if (id === "fees") {
    const fees = expenses(txs).filter((t) => t.category === "fees");
    return {
      title: "Bank & Service Fees",
      lines: [
        `${fees.length} fee transactions, ${formatINR(Math.round(fees.reduce((s, t) => s + t.amount, 0)))} total`,
        "Pure leakage — no value received",
        "Often avoidable with the right account",
      ],
    };
  }
  if (id === "duplicates") {
    return {
      title: "Duplicate Payments",
      lines: dups.slice(0, 3).map((d) => `${formatINR(d.a.amount)} charged twice at ${d.a.merchant}`),
    };
  }
  if (id === "anomalies") {
    return {
      title: "Unusual Charges",
      lines: anomalies.slice(0, 3).map((a) => `${formatINR(a.tx.amount)} at ${a.tx.merchant} (${a.score}/100)`),
    };
  }
  if (id === "monthlySpending") {
    return { title: "Monthly Spending", lines: ["Total expenses for the current month", "Everything else cascades from here"] };
  }
  if (id === "lowerSavings") return { title: "Lower Savings", lines: ["Spending growth eats into what you keep", "Compounding cost over time"] };
  if (id === "creditUtilization") return { title: "Higher Credit Utilization", lines: ["More spend → more revolving balance", "Hurts your credit score"] };
  if (id === "interestCost") return { title: "Potential Interest Cost", lines: ["Carried balances accrue ~30-42% p.a. interest", "The end of the leak cascade"] };
  return null;
}
