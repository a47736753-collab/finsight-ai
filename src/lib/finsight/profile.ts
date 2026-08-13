// ─── Financial behavior profile ──────────────────────────────────────────────
// A data-backed personality + blind-spot assessment. Labels describe spending
// patterns from this account's data — they are not medical or psychological
// diagnoses.

import { discretionaryNightShare, expenses, hourOf, monthKey, totalSpend } from "./aggregate";
import { currentMonthKey } from "./detect";
import type { BehaviorProfile, Subscription, Transaction } from "./types";
import { formatINR } from "./types";

export function buildProfile(txs: Transaction[], subs: Subscription[]): BehaviorProfile {
  const current = currentMonthKey(txs);
  const spend = totalSpend(txs, current) || totalSpend(txs);
  // shares use the same accounting period on both sides: cumulative micro
  // spend vs cumulative spend, so a 6-month history isn't compared to one month.
  const spendAll = totalSpend(txs) || 1;

  const micro = expenses(txs).filter((t) => t.amount <= 200);
  const microTotal = micro.reduce((s, t) => s + t.amount, 0);
  const microShare = microTotal / spendAll;

  // Late-night is a discretionary behavior (delivery, impulse buys) — rent and
  // bills paid at 9 AM shouldn't count against the night story.
  const night = discretionaryNightShare(txs);
  const lateTotal = night.amount;
  const lateShare = night.share;

  const subTotal = subs.reduce((s, x) => s + x.monthlyCost, 0);
  const subShare = subTotal / spendAll;
  const unusedCount = subs.filter((s) => s.unused).length;

  const fees = expenses(txs).filter((t) => t.category === "fees");
  const feeTotal = fees.reduce((s, t) => s + t.amount, 0);

  const weekend = weekendShare(txs);

  // ── archetype ──
  let title = "The Balanced Builder";
  let tagline = "A steady mix of essentials, wants and savings — with room to optimize.";
  if (micro.length >= 30 && microShare > 0.06) {
    title = "The Micro-Spender";
    tagline = "Frequent small purchases with a high cumulative impact.";
  } else if (lateShare > 0.18) {
    title = "The Night Owl";
    tagline = "A meaningful share of spending happens after 9 PM.";
  } else if (subShare > 0.1 || unusedCount >= 2) {
    title = "The Subscription Sleeper";
    tagline = "Recurring charges quietly compound in the background.";
  } else if (weekend > 1.25) {
    title = "The Weekend Spender";
    tagline = "Most discretionary money flows on Saturdays and Sundays.";
  }

  // ── traits ──
  const traits: { label: string; detail: string }[] = [];
  traits.push({
    label: "Transaction frequency",
    detail: `${expenses(txs).length} expenses over ${txs.length ? [...new Set(txs.map((t) => t.date.slice(0, 7)))].length : 0} months.`,
  });
  traits.push({
    label: "Average transaction",
    detail: `${formatINR(Math.round(expenses(txs).reduce((s, t) => s + t.amount, 0) / Math.max(1, expenses(txs).length)))} per expense.`,
  });
  traits.push({
    label: "Micro-spending weight",
    detail: `${micro.length} transactions under ₹200 = ${formatINR(Math.round(microTotal))} (${Math.round(microShare * 100)}% of spend).`,
  });
  traits.push({
    label: "Late-night share",
    detail: `${formatINR(Math.round(lateTotal))} (${Math.round(lateShare * 100)}%) occurs after 9 PM.`,
  });
  traits.push({
    label: "Recurring load",
    detail: `${subs.length} subscriptions = ${formatINR(Math.round(subTotal))}/month (${formatINR(Math.round(subTotal * 12))}/year).`,
  });

  // ── blind spots ──
  const blindSpots: { label: string; level: "HIGH" | "MEDIUM" | "LOW"; detail: string }[] = [];
  if (microShare > 0.03) {
    blindSpots.push({
      label: "Micro-spending",
      level: microShare > 0.06 ? "HIGH" : "MEDIUM",
      detail: `${micro.length} transactions under ₹200 add up to ${formatINR(Math.round(microTotal))} (${Math.round(microShare * 100)}% of total spend).`,
    });
  }
  if (subShare > 0.05 || unusedCount > 0) {
    blindSpots.push({
      label: "Subscriptions",
      level: unusedCount >= 2 || subShare > 0.12 ? "MEDIUM" : "LOW",
      detail: `${subs.length} recurring services; ${unusedCount} possibly unused (${formatINR(Math.round(subTotal))}/month total).`,
    });
  }
  if (lateShare > 0.15) {
    blindSpots.push({
      label: "Late-night spending",
      level: lateShare > 0.28 ? "HIGH" : "MEDIUM",
      detail: `${Math.round(lateShare * 100)}% of discretionary spending happens after 9 PM — mostly delivery and impulse buys.`,
    });
  }
  if (feeTotal > 0) {
    blindSpots.push({
      label: "Bank fees",
      level: feeTotal > 500 ? "MEDIUM" : "LOW",
      detail: `${fees.length} fee transactions totalling ${formatINR(Math.round(feeTotal))}.`,
    });
  }
  if (weekend > 1.2) {
    blindSpots.push({
      label: "Weekend spending",
      level: weekend > 1.4 ? "MEDIUM" : "LOW",
      detail: `Weekend days average ${Math.round((weekend - 1) * 100)}% more spending than weekdays.`,
    });
  }
  if (!blindSpots.length) {
    blindSpots.push({
      label: "No major blind spots",
      level: "LOW",
      detail: "Your spending patterns look balanced. Keep tracking to catch new leaks early.",
    });
  }
  // keep max 5, ordered HIGH → LOW
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  blindSpots.sort((a, b) => order[a.level] - order[b.level]);

  return { title, tagline, traits, blindSpots: blindSpots.slice(0, 5) };
}

function weekendShare(txs: Transaction[]) {
  let weekend = 0;
  let weekdays = 0;
  let weekendDays = 0;
  let weekdayDays = 0;
  for (const t of expenses(txs)) {
    const d = new Date(`${t.date}T12:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    const day = d.getDay();
    if (day === 0 || day === 6) {
      weekend += t.amount;
      weekendDays++;
    } else {
      weekdays += t.amount;
      weekdayDays++;
    }
  }
  const wAvg = weekendDays ? weekend / weekendDays : 0;
  const dAvg = weekdayDays ? weekdays / weekdayDays : 0;
  return dAvg > 0 ? wAvg / dAvg : 1;
}
