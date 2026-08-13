// ─── FinSight Copilot ────────────────────────────────────────────────────────
// A deterministic, fully explainable assistant. Every answer is derived from
// the user's actual transaction data — no generic financial advice, and no
// fake API calls. When no rule matches, it summarizes the top insights.

import type { Analysis, CopilotAnswer } from "./types";
import { formatINR } from "./types";

export function answerCopilot(analysis: Analysis, rawQuestion: string): CopilotAnswer {
  const q = rawQuestion.toLowerCase().replace(/[?.!]/g, "").trim();
  const { leaks, potentialSavings, rootCause, profile, forecast, anomalies, merchants, categories, health, weekday, timeOfDay, insights, spending, income, savings } = analysis;
  const dups = analysis.duplicates;
  const subs = analysis.subscriptions;

  // ── where am I wasting / losing the most ──
  if (/(wast|los|leak|bleed|where.*(go|money)|burn)/.test(q) && /(most|biggest|where|top|much)/.test(q)) {
    const top = [...potentialSavings.breakdown].sort((a, b) => b.monthly - a.monthly).slice(0, 4);
    return {
      text: `Your money is leaking in these places, ranked by size:\n\n${top
        .map((b, i) => `${i + 1}. **${b.label}** — ${formatINR(b.monthly)}/month`)
        .join("\n")}\n\nTotal potential: **${formatINR(potentialSavings.monthly)}/month** (${formatINR(potentialSavings.annual)}/year).`,
      citations: leaks.filter((l) => l.monthly > 0).slice(0, 3).map((l) => l.title),
      nav: "leaks",
    };
  }

  // ── why did I spend more ──
  if (/(why|reason|explain).*(spend|increase|more|up|expensive)|why.*(more|higher)/.test(q) || q.includes("spend more")) {
    return {
      text: `**${rootCause.headline}**\n\nMonthly spending is **${rootCause.changePct >= 0 ? "+" : ""}${rootCause.changePct}%** vs your 3-month average, an excess of **${formatINR(rootCause.excess)}**.\n\n${treePathText(rootCause.root)}`,
      citations: rootCause.root.children?.map((c) => `${c.label} ${c.value}`) ?? [],
      nav: "root-cause",
    };
  }

  // ── how can I save ₹X ──
  const saveMatch = q.match(/save\s*₹?\s*([\d,]+)\s*(k|l)?/) ?? q.match(/₹?\s*([\d,]+)\s*(k|l)?\s*(save|per month|monthly)/);
  if (saveMatch || /how.*save|save.*how/.test(q)) {
    const target = parseAmount(saveMatch?.[1], saveMatch?.[2]);
    const ranked = [...potentialSavings.breakdown].sort((a, b) => b.monthly - a.monthly);
    if (target && target > 0) {
      const combo: string[] = [];
      let acc = 0;
      for (const b of ranked) {
        if (acc >= target) break;
        combo.push(`${b.label} (${formatINR(b.monthly)}/month)`);
        acc += b.monthly;
      }
      const feasible = acc >= target;
      return {
        text: feasible
          ? `To free up **${formatINR(target)}/month**, combine these:\n\n${combo.map((c) => `• ${c}`).join("\n")}\n\nThat reaches **${formatINR(acc)}/month** (${formatINR(acc * 12)}/year) — all potential savings found in your data.`
          : `Your data shows **${formatINR(potentialSavings.monthly)}/month** in potential savings:\n\n${ranked.slice(0, 4).map((b) => `• ${b.label} — ${formatINR(b.monthly)}/month`).join("\n")}\n\nThat's the realistic ceiling before cutting essentials.`,
        citations: ranked.slice(0, 4).map((b) => `${b.label}: ${formatINR(b.monthly)}/month`),
        nav: "whatif",
      };
    }
    return {
      text: `Here's the fastest path to more savings:\n\n${ranked.slice(0, 4).map((b, i) => `${i + 1}. ${b.label} — ${formatINR(b.monthly)}/month`).join("\n")}\n\nTotal: **${formatINR(potentialSavings.monthly)}/month** → ${formatINR(potentialSavings.annual)}/year. Open the What If? simulator to tune each one.`,
      citations: ranked.slice(0, 4).map((b) => `${b.label}: ${formatINR(b.monthly)}/month`),
      nav: "whatif",
    };
  }

  // ── subscriptions ──
  if (/(subscription|recurring|renew|membership|prime|netflix|spotify)/.test(q)) {
    const unused = subs.filter((s) => s.unused);
    const active = subs.filter((s) => !s.unused);
    const totalSubMonthly = Math.round(subs.reduce((a, s) => a + s.monthlyCost, 0));
    const totalSubAnnual = Math.round(subs.reduce((a, s) => a + s.annualCost, 0));
    const unusedAnnual = Math.round(unused.reduce((a, s) => a + s.annualCost, 0));
    return {
      text: `You have **${subs.length} recurring services** at **${formatINR(totalSubMonthly)}/month** (${formatINR(totalSubAnnual)}/year).\n\n${
        unused.length
          ? `⚠️ **${unused.length} look unused:** ${unused.map((s) => `${s.merchant} (${formatINR(s.monthlyCost)}/mo)`).join(", ")} — ${formatINR(unusedAnnual)}/year in potential savings.\n\n`
          : ""
      }Active: ${active.map((s) => s.merchant).join(", ") || "none"}.`,
      citations: unused.length ? unused.map((s) => `${s.merchant}: ${formatINR(s.annualCost)}/year`) : [],
      nav: "subscriptions",
    };
  }

  // ── blind spot ──
  if (/(blind|blindspot|weakness|personality|profile|trait)/.test(q)) {
    const top = profile.blindSpots[0];
    return {
      text: `**Your biggest financial blind spot: ${top.label} (${top.level})**\n\n${top.detail}\n\nYour profile is **"${profile.title}"** — ${profile.tagline}\n\nAll blind spots:\n${profile.blindSpots.map((b) => `• ${b.label} — ${b.level}: ${b.detail}`).join("\n")}`,
      citations: profile.blindSpots.slice(0, 3).map((b) => `${b.label} (${b.level})`),
      nav: "insights",
    };
  }

  // ── which merchant costs most ──
  if (/(merchant|vendor|store|shop.*cost|spend.*merchant)/.test(q) && /(most|top|biggest|cost)/.test(q)) {
    const top = merchants.slice(0, 5);
    return {
      text: `Your top merchants by total spend:\n\n${top.map((m, i) => `${i + 1}. **${m.merchant}** — ${formatINR(m.total)} across ${m.count} transactions${m.normalizedFrom ? " (normalized from UPI handle)" : ""}`).join("\n")}`,
      citations: top.slice(0, 3).map((m) => `${m.merchant}: ${formatINR(m.total)}`),
      nav: "transactions",
    };
  }

  // ── what will happen if spending continues ──
  if (/(what will happen|if.*(continue|keep|stays?)|projection|future|forecast|next month)/.test(q)) {
    return {
      text: `**Projected next-month spending: ${formatINR(forecast.nextMonthSpend)}** (risk: ${forecast.riskLabel.toLowerCase()})\n\n${forecast.insights.map((i) => `• ${i}`).join("\n")}\n\nExpected savings at current income: **${formatINR(forecast.expectedSavings)}/month**.`,
      citations: forecast.insights.slice(0, 3),
      nav: "forecast",
    };
  }

  // ── how much can I save this year ──
  if (/(this year|per year|annually|annual|yearly)/.test(q) && /(save|saving)/.test(q)) {
    return {
      text: `**Potential savings this year: ${formatINR(potentialSavings.annual)}** (${formatINR(potentialSavings.monthly)}/month).\n\nTop contributors:\n${potentialSavings.breakdown.slice(0, 4).map((b) => `• ${b.label} — ${formatINR(b.monthly)}/month (${formatINR(b.monthly * 12)}/year)`).join("\n")}\n\nThese are *potential* savings based on detected leaks — not guarantees.`,
      citations: potentialSavings.breakdown.slice(0, 4).map((b) => `${b.label}: ${formatINR(b.monthly * 12)}/year`),
      nav: "leaks",
    };
  }

  // ── unusual transactions ──
  if (/(unusual|anomal|suspicious|weird|strange|odd)/.test(q)) {
    if (!anomalies.length) {
      return { text: "No unusual transactions detected in your history — spending sizes look consistent with your patterns.", citations: [], nav: "anomalies" };
    }
    return {
      text: `${anomalies.length} unusual transaction${anomalies.length > 1 ? "s" : ""} detected:\n\n${anomalies.slice(0, 4).map((a) => `• **${formatINR(a.tx.amount)}** at ${a.tx.merchant} on ${a.tx.date} — ${a.multiple.toFixed(1)}× your typical ${formatINR(a.baseline)} (score ${a.score}/100)`).join("\n")}`,
      citations: anomalies.slice(0, 3).map((a) => `${a.tx.merchant}: ${formatINR(a.tx.amount)} (${a.score}/100)`),
      nav: "anomalies",
    };
  }

  // ── duplicate payments ──
  if (/(duplicate|twice|double|same.*twice)/.test(q)) {
    if (!dups.length) {
      return { text: "No duplicate payments detected. Every matched merchant+amount pair has been cross-checked.", citations: [], nav: "anomalies" };
    }
    const dupText = `**Possible duplicate detected:** ${formatINR(dups[0].a.amount)} charged twice at ${dups[0].a.merchant} (${dups[0].minutesApart} minutes apart) — ${dups[0].confidence}% confidence.`;
    const extra = dups.slice(1, 4).map((d) => `• ${d.a.merchant}: ${formatINR(d.a.amount)} ×2 (${d.confidence}% confidence)`).join("\n");
    return {
      text: `${dupText}\n\n${extra}`,
      citations: dups.slice(0, 3).map((d) => `${d.a.merchant} ${formatINR(d.a.amount)} ${d.confidence}%`),
      nav: "anomalies",
    };
  }

  // ── explain health score ──
  if (/(health|score|how am i doing|financial shape)/.test(q)) {
    return {
      text: `Your financial health score is **${health.score}/100** — ${health.level}.\n\n${health.breakdown.map((b) => `• ${b.label}: ${b.score}/100 (weight ${Math.round(b.weight * 100)}%) — ${b.explanation}`).join("\n")}`,
      citations: health.breakdown.slice(0, 4).map((b) => `${b.label}: ${b.score}/100`),
      nav: "overview",
    };
  }

  // ── weekend spending ──
  if (/(weekend|saturday|sunday|friday)/.test(q)) {
    return {
      text: `Your weekend days average **${(weekday.weekendRatio * 100).toFixed(0)}%** of weekday spending per day${weekday.weekendRatio > 1.2 ? " — noticeably higher" : ""}.\n\nDaily breakdown:\n${weekday.byDay.map((d) => `${d.day}: ${formatINR(d.amount)} (${Math.round(d.share * 100)}%)`).join("\n")}`,
      citations: [`Weekend/weekday ratio: ${weekday.weekendRatio.toFixed(2)}×`],
      nav: "forecast",
    };
  }

  // ── night spending ──
  if (/(night|9 ?pm|late|after 9|evening)/.test(q)) {
    const night = timeOfDay.find((t) => t.label === "Night");
    return {
      text: `${night ? `${Math.round(night.share * 100)}% of your spending happens after 9 PM (${formatINR(Math.round(night.amount))}). ` : ""}Time-of-day split:\n${timeOfDay.map((t) => `• ${t.label} (${t.range}): ${formatINR(t.amount)} — ${Math.round(t.share * 100)}%`).join("\n")}`,
      citations: timeOfDay.filter((t) => t.share > 0.15).map((t) => `${t.label}: ${Math.round(t.share * 100)}%`),
      nav: "root-cause",
    };
  }

  // ── micro spending ──
  if (/(micro|small|chai|snack|under 200|below 200)/.test(q)) {
    const micro = analysis.txs.filter((t) => t.kind === "expense" && t.amount <= 200);
    const total = micro.reduce((s, t) => s + t.amount, 0);
    const spendAll = analysis.monthlySeries.reduce((s, m) => s + m.spending, 0) || 1;
    return {
      text: `**${micro.length} transactions under ₹200** totalling **${formatINR(Math.round(total))}** — that's ${Math.round((total / spendAll) * 100)}% of all spending.\n\nTop micro merchants: ${[...new Set(micro.map((t) => t.merchant))].slice(0, 4).join(", ")}.`,
      citations: [`${micro.length} transactions ≤ ₹200`, `${formatINR(Math.round(total))} cumulative`],
      nav: "leaks",
    };
  }

  // ── fees ──
  if (/(fee|charge|bank charge|maintenance|penalty)/.test(q)) {
    const fee = leaks.find((l) => l.kind === "fee");
    if (!fee) {
      return { text: "No significant bank or service fees detected in your data.", citations: [], nav: "leaks" };
    }
    return { text: `**${fee.title}**\n\n${fee.detail}\n\nPotential saving: ${formatINR(fee.annual)}/year.`, citations: fee.evidence.slice(0, 3), nav: "leaks" };
  }

  // ── income / salary ──
  if (/(income|salary|earn|credit)/.test(q)) {
    return {
      text: `Your monthly income is **${formatINR(income)}**, spending is **${formatINR(spending)}**, leaving **${formatINR(Math.max(0, savings))}** (${Math.round((income > 0 ? savings / income : 0) * 100)}% savings rate).`,
      citations: [`Income: ${formatINR(income)}`, `Spending: ${formatINR(spending)}`],
      nav: "overview",
    };
  }

  // ── categories ──
  if (/(category|categories|where.*spend)/.test(q)) {
    return {
      text: `This month's spending by category:\n\n${categories.slice(0, 6).map((c, i) => `${i + 1}. **${c.label}** — ${formatINR(c.amount)} (${Math.round(c.share * 100)}%${c.changePct !== null ? `, ${c.changePct > 0 ? "+" : ""}${c.changePct}%` : ""})`).join("\n")}`,
      citations: categories.slice(0, 3).map((c) => `${c.label}: ${formatINR(c.amount)}`),
      nav: "transactions",
    };
  }

  // ── top insights fallback ──
  return {
    text: `Here's what stands out in your data right now:\n\n${insights.slice(0, 3).map((i, n) => `${n + 1}. **${i.what}**\n   ${i.why}\n   ${i.impact}\n   Confidence: ${i.confidence}%`).join("\n\n")}\n\nAsk me things like "where am I wasting the most money?", "why did I spend more this month?", or "how can I save ₹5,000?".`,
    citations: insights.slice(0, 3).map((i) => i.what),
    nav: "insights",
  };
}

function treePathText(root: { label: string; value: string; children?: { label: string; value: string; children?: { label: string; value: string }[] }[] }) {
  const lines: string[] = [`${root.label}: ${root.value}`];
  for (const c of root.children ?? []) {
    lines.push(`  └─ ${c.label}: ${c.value}`);
    for (const g of c.children ?? []) {
      lines.push(`     └─ ${g.label}: ${g.value}`);
    }
  }
  return lines.join("\n");
}

function parseAmount(raw: string | undefined, suffix?: string) {
  if (!raw) return 0;
  const n = parseInt(raw.replace(/,/g, ""), 10);
  if (Number.isNaN(n)) return 0;
  if (suffix === "k") return n * 1000;
  if (suffix === "l") return n * 100000;
  return n;
}

export const QUICK_PROMPTS = [
  "Where am I wasting the most money?",
  "Why did I spend more this month?",
  "How can I save ₹5,000?",
  "What subscriptions should I review?",
  "What is my biggest financial blind spot?",
  "Which merchant costs me the most?",
  "What will happen if my spending continues?",
  "How much can I save this year?",
  "Show me unusual transactions",
  "Explain my financial health score",
];

export { formatINR };
