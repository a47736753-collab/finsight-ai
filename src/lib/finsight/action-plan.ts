// ─── 30-day money recovery action plan ───────────────────────────────────────
// Four weekly actions derived from the actual leak list, with per-week
// potential savings. Total = potential, not guaranteed.

import type { ActionPlan, Leak } from "./types";
import { formatINR } from "./types";

export function buildActionPlan(leaks: Leak[]): ActionPlan {
  const items: ActionPlan["items"] = [];

  const subLeak = leaks.find((l) => l.kind === "subscription");
  if (subLeak) {
    items.push({
      week: 1,
      title: "Review unused subscriptions",
      detail: subLeak.title,
      monthly: subLeak.monthly,
    });
  }

  const nightLeak = leaks.find((l) => l.kind === "spike");
  if (nightLeak) {
    items.push({
      week: 2,
      title: "Cut the late-night spending spike",
      detail: nightLeak.title,
      monthly: nightLeak.monthly,
    });
  } else {
    const overspend = leaks.find((l) => l.kind === "overspend");
    if (overspend) {
      items.push({
        week: 2,
        title: `Rein in ${overspend.title.split(" ")[0]} overspending`,
        detail: overspend.detail,
        monthly: overspend.monthly,
      });
    }
  }

  const feeLeak = leaks.find((l) => l.kind === "fee");
  if (feeLeak) {
    items.push({
      week: 3,
      title: "Review banking fees",
      detail: feeLeak.detail,
      monthly: feeLeak.monthly,
    });
  } else {
    const priceLeak = leaks.find((l) => l.kind === "price");
    if (priceLeak) {
      items.push({
        week: 3,
        title: "Negotiate or switch after price increases",
        detail: priceLeak.title,
        monthly: priceLeak.monthly,
      });
    }
  }

  const microLeak = leaks.find((l) => l.kind === "micro");
  const overspend = leaks.find((l) => l.kind === "overspend");
  if (microLeak) {
    items.push({
      week: 4,
      title: "Set micro-spending limits",
      detail: microLeak.title,
      monthly: microLeak.monthly,
    });
  } else if (overspend && !items.some((i) => i.week === 2)) {
    items.push({
      week: 4,
      title: "Set category spending limits",
      detail: overspend.title,
      monthly: overspend.monthly,
    });
  } else {
    const priceLeak = leaks.find((l) => l.kind === "price");
    if (priceLeak) {
      items.push({
        week: 4,
        title: "Audit price-increased subscriptions",
        detail: priceLeak.title,
        monthly: priceLeak.monthly,
      });
    }
  }

  // fallback: if nothing was found, build from top leaks anyway
  if (!items.length) {
    leaks.slice(0, 4).forEach((l, i) => {
      items.push({ week: i + 1, title: l.title, detail: l.detail, monthly: l.monthly });
    });
  }

  const totalMonthly = items.reduce((s, i) => s + i.monthly, 0);

  return {
    items,
    totalMonthly,
    totalAnnual: totalMonthly * 12,
  };
}

export function planHeadline(totalMonthly: number) {
  return `Your 30-day money recovery plan targets ${formatINR(totalMonthly)}/month in potential savings.`;
}

export function goalAcceleration(totalMonthlyPotential: number, goalTarget: number, goalMonthly: number | undefined) {
  // months saved if the user redirects potential savings into the goal
  if (!goalMonthly || goalMonthly <= 0) return null;
  const currentMonths = goalTarget / goalMonthly;
  const fasterMonths = goalTarget / (goalMonthly + totalMonthlyPotential * 0.5);
  const saved = Math.max(0, Math.round(currentMonths - fasterMonths));
  return saved > 0 ? saved : null;
}
