// ─── Demo data generator ─────────────────────────────────────────────────────
// Deterministic (seeded) generator that produces a realistic 6-month Indian
// transaction history for a ₹52k/month earner, deliberately planted with the
// problems the product is built to surface:
//   duplicate payment, subscription price increase, unused subscription,
//   spending spike, micro-spending, weekend-heavy + late-night spending,
//   bank fees, unusual transaction, recurring payments, UPI normalization.

import type { CategoryId, PaymentType, Transaction } from "./types";

// --- tiny deterministic PRNG (mulberry32) ---
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS_BACK = 6;

function monthOffsetDate(monthsBack: number, day: number, hour = 11, minute = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, day, hour, minute);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  return { iso, weekday: d.getDay(), hours: hour };
}

interface TxSpec {
  desc: string;
  merchant: string;
  /** number or per-month array (indexed by position in `months`) */
  amount: number | number[];
  category: CategoryId;
  payment: PaymentType;
  day: number;
  /** per-month day-of-month override (indexed by `months`) — lets fixed bills
   *  drift naturally so they don't systematically skew weekday/weekend stats */
  days?: number[];
  hour?: number;
  minute?: number;
  months?: number[]; // which months back (default all)
  status?: Transaction["status"];
  confidence?: number;
  recurring?: boolean;
  kind?: Transaction["kind"];
}

let seq = 0;
function tx(spec: TxSpec, rng?: () => number): Transaction[] {
  // Deterministic fallback so fixed-amount specs can be declared without a PRNG.
  const r = rng ?? (() => 0.5);
  const months = spec.months ?? [0, 1, 2, 3, 4, 5];
  const out: Transaction[] = [];
  for (let mi = 0; mi < months.length; mi++) {
    const m = months[mi];
    const day = spec.days?.[mi] ?? spec.day;
    const { iso } = monthOffsetDate(m, day, spec.hour ?? 11, spec.minute ?? 0);
    const baseAmount = Array.isArray(spec.amount) ? spec.amount[mi] : spec.amount;
    const amount =
      typeof baseAmount === "number"
        ? baseAmount
        : Math.round(baseAmount * (0.9 + r() * 0.2));
    const pending = spec.payment === "Card" && r() < 0.06;
    out.push({
      id: `demo-${seq++}`,
      date: iso,
      description: spec.desc,
      merchant: spec.merchant,
      amount,
      kind: spec.kind ?? "expense",
      category: spec.category,
      payment: spec.payment,
      status: pending ? "pending" : spec.status ?? "settled",
      confidence: spec.confidence ?? Math.round(72 + r() * 27),
      recurring: spec.recurring,
      normalized: false,
      hour: spec.hour,
    });
  }
  return out;
}

/** Weekend bias: transactions landing on Sat/Sun get a ~50-75% spend boost,
 *  which powers the weekend-spending insight and root-cause analysis. */
function weekendBoost(rng: () => number, iso: string, amount: number) {
  const wd = new Date(`${iso}T12:00:00`).getDay();
  if (wd === 0 || wd === 6) return Math.round(amount * (1.5 + rng() * 0.25));
  return amount;
}

/** Mild weekend preference for discretionary spending: ~34% of picks land on
 *  Sat/Sun (vs the natural ~29%), which combines with the boost to push the
 *  weekend/weekday ratio clearly above 1. */
function discretionaryDay(rng: () => number, monthsBack: number) {
  for (let i = 0; i < 12; i++) {
    const day = 1 + Math.floor(rng() * 28);
    const wd = monthOffsetDate(monthsBack, day, 12).weekday;
    const isWeekend = wd === 0 || wd === 6;
    if (isWeekend || rng() >= 0.07) return day;
  }
  return 1 + Math.floor(rng() * 28);
}

// Repeated small transactions (micro-spending) — deterministic spread.
function microTx(
  base: string,
  merchants: string[],
  count: number,
  min: number,
  max: number,
  category: CategoryId,
  payment: PaymentType,
  rng: () => number,
): Transaction[] {
  const out: Transaction[] = [];
  for (let i = 0; i < count; i++) {
    const m = i % 6; // months back
    const merchant = merchants[i % merchants.length];
    const day = discretionaryDay(rng, m);
    const hour = rng() < 0.42 ? 21 + Math.floor(rng() * 3) : 8 + Math.floor(rng() * 12);
    const { iso } = monthOffsetDate(m, day, hour, Math.floor(rng() * 60));
    const amount = weekendBoost(rng, iso, Math.round((min + rng() * (max - min)) / 5) * 5);
    out.push({
      id: `demo-${seq++}`,
      date: iso,
      description: `${base}/${Math.floor(rng() * 9000000)}/${merchant.toUpperCase().replace(/\s/g, "")}`,
      merchant,
      amount,
      kind: "expense",
      category,
      payment,
      status: "settled",
      confidence: Math.round(70 + rng() * 25),
      normalized: payment === "UPI",
      hour,
    });
  }
  return out;
}

export function generateDemoTransactions(): Transaction[] {
  const rng = mulberry32(20260812);
  seq = 0;
  const all: Transaction[] = [];

  // ── Income ──
  all.push(...tx({ desc: "SALARY/ACME SOLUTIONS PVT LTD/NEFT", merchant: "ACME Solutions", amount: 52000, category: "income", payment: "NEFT", day: 1, hour: 9, confidence: 99, kind: "income" }));
  all.push(...tx({ desc: "INTEREST/SAVINGS ACCOUNT", merchant: "Bank Interest", amount: 620, category: "income", payment: "NEFT", day: 28, hour: 9, confidence: 99, kind: "income" }));

  // ── Rent / bills ──
  // Rent drifts across the 1st-7th (as real rent payments do) so the fixed bill
  // doesn't systematically land on weekdays and drown the weekend story.
  all.push(...tx({ desc: "RENT/FLAT 3B KORAMANGALA", merchant: "Landlord — Rent", amount: 11000, category: "bills", payment: "UPI", day: 3, days: [2, 6, 4, 7, 3, 5], hour: 10, confidence: 97, recurring: true }));
  all.push(...tx({ desc: "BESCOM/ELECTRICITY BILL", merchant: "BESCOM", amount: [1240, 1310, 1180, 1490, 1520, 1640], category: "utilities", payment: "UPI", day: 8, hour: 12, confidence: 94, recurring: true, months: [0, 1, 2, 3, 4, 5] }));
  all.push(...tx({ desc: "AIRTEL FIBER/BILL PAY", merchant: "Airtel Broadband", amount: 799, category: "utilities", payment: "UPI", day: 12, hour: 11, confidence: 96, recurring: true }));
  all.push(...tx({ desc: "JIO PREPAID RECHARGE", merchant: "Jio Recharge", amount: 299, category: "utilities", payment: "Wallet", day: 15, hour: 10, confidence: 95, recurring: true }));

  // ── Subscriptions ──
  // Netflix: price increase from ₹649 → ₹749 in the most recent months
  all.push(...tx({ desc: "NETFLIX.COM/MEMBERSHIP", merchant: "Netflix", amount: 749, category: "subscriptions", payment: "Card", day: 5, hour: 6, confidence: 99, recurring: true, months: [0, 1] }));
  all.push(...tx({ desc: "NETFLIX.COM/MEMBERSHIP", merchant: "Netflix", amount: 649, category: "subscriptions", payment: "Card", day: 5, hour: 6, confidence: 99, recurring: true, months: [2, 3, 4, 5] }));
  all.push(...tx({ desc: "SPOTIFY PREMIUM", merchant: "Spotify", amount: 119, category: "subscriptions", payment: "Card", day: 9, hour: 5, confidence: 99, recurring: true }));
  all.push(...tx({ desc: "AMAZON PRIME MEMBERSHIP", merchant: "Amazon Prime", amount: 299, category: "subscriptions", payment: "Card", day: 18, hour: 4, confidence: 99, recurring: true }));
  all.push(...tx({ desc: "YOUTUBE PREMIUM", merchant: "YouTube Premium", amount: 149, category: "subscriptions", payment: "UPI", day: 11, hour: 8, confidence: 98, recurring: true }));
  all.push(...tx({ desc: "ICLOUD+ STORAGE", merchant: "iCloud+", amount: 75, category: "subscriptions", payment: "Card", day: 20, hour: 3, confidence: 98, recurring: true }));
  // Unused subscription (leak): Coursera Plus, no usage elsewhere
  all.push(...tx({ desc: "COURSERA PLUS SUBSCRIPTION", merchant: "Coursera Plus", amount: 799, category: "subscriptions", payment: "Card", day: 7, hour: 6, confidence: 99, recurring: true, months: [0, 1, 2, 3] }));
  all.push(...tx({ desc: "CULT.FIT MEMBERSHIP", merchant: "Cult.fit", amount: 999, category: "subscriptions", payment: "UPI", day: 14, hour: 9, confidence: 98, recurring: true }));

  // ── Food delivery — clear late-night surge in the most recent month ──
  const foodMerchants = ["Swiggy", "Zomato", "Dominos", "KFC", "McDonald's"];
  const surge = (m: number) => m === 0;
  for (let i = 0; i < 42; i++) {
    const m = i % 6;
    const merchant = foodMerchants[i % foodMerchants.length];
    const day = discretionaryDay(rng, m);
    const lateNight = surge(m) ? rng() < 0.7 : rng() < 0.16;
    const hour = lateNight ? 22 + Math.floor(rng() * 2) : 12 + Math.floor(rng() * 9);
    const { iso } = monthOffsetDate(m, day, hour, Math.floor(rng() * 60));
    const base = surge(m) ? 320 + rng() * 220 : 240 + rng() * 140;
    const amount = weekendBoost(rng, iso, Math.round((base + rng() * 120) / 5) * 5);
    all.push({
      id: `demo-${seq++}`,
      date: iso,
      description: `UPI/${Math.floor(rng() * 9000000)}/${merchant.toUpperCase()}@OK${merchant === "Swiggy" || merchant === "Zomato" ? "HDFC" : "AXIS"}`,
      merchant,
      amount,
      kind: "expense",
      category: "food",
      payment: "UPI",
      status: "settled",
      confidence: Math.round(74 + rng() * 24),
      normalized: true,
      hour,
    });
  }

  // ── Groceries ──
  const groceryMerchants = ["BigBasket", "Zepto", "DMart", "Instamart"];
  for (let i = 0; i < 24; i++) {
    const m = i % 6;
    const merchant = groceryMerchants[i % groceryMerchants.length];
    const day = discretionaryDay(rng, m);
    const hour = 9 + Math.floor(rng() * 9);
    const { iso } = monthOffsetDate(m, day, hour, Math.floor(rng() * 60));
    const amount = weekendBoost(rng, iso, Math.round((180 + rng() * 420) / 10) * 10);
    all.push({
      id: `demo-${seq++}`,
      date: iso,
      description: `${merchant.toUpperCase()}/GROCERY/${Math.floor(rng() * 900000)}`,
      merchant,
      amount,
      kind: "expense",
      category: "groceries",
      payment: rng() < 0.5 ? "UPI" : "Card",
      status: "settled",
      confidence: Math.round(80 + rng() * 19),
    });
  }

  // ── Shopping (festive spike in the most recent month) ──
  const shopMerchants = ["Amazon", "Flipkart", "Myntra", "Ajio"];
  for (let i = 0; i < 14; i++) {
    const m = i % 6;
    const merchant = shopMerchants[i % shopMerchants.length];
    const day = discretionaryDay(rng, m);
    const hour = 13 + Math.floor(rng() * 8);
    const { iso } = monthOffsetDate(m, day, hour, Math.floor(rng() * 60));
    const spike = m === 0 ? rng() < 0.4 : false; // festive spike month
    const amount = weekendBoost(rng, iso, spike ? Math.round((900 + rng() * 1000) / 10) * 10 : Math.round((400 + rng() * 900) / 10) * 10);
    all.push({
      id: `demo-${seq++}`,
      date: iso,
      description: `${merchant.toUpperCase()}/ORDER/${Math.floor(rng() * 90000000)}`,
      merchant,
      amount,
      kind: "expense",
      category: "shopping",
      payment: merchant === "Amazon" ? "Card" : "UPI",
      status: "settled",
      confidence: Math.round(78 + rng() * 21),
    });
  }

  // ── Deliberate problems ──
  // 1. Unusual transaction: ₹6,900 Amazon purchase (≈5.8× the typical Amazon order)
  const { iso: anomalyIso } = monthOffsetDate(0, 22, 21, 40);
  all.push({
    id: `demo-${seq++}`,
    date: anomalyIso,
    description: "AMAZON/ORDER/89001234567/DELL LAPTOP",
    merchant: "Amazon",
    amount: 6900,
    kind: "expense",
    category: "shopping",
    payment: "Card",
    status: "settled",
    confidence: 82,
    hour: 21,
  });
  // 2. Duplicate payment: ₹1,299 twice, 4 minutes apart
  const { iso: dupIso } = monthOffsetDate(0, 17, 18, 22);
  const { iso: dupIso2 } = monthOffsetDate(0, 17, 18, 26);
  all.push({ id: `demo-${seq++}`, date: dupIso, description: "AMAZON/ORDER/7788991122/AMAZON PAY", merchant: "Amazon", amount: 1299, kind: "expense", category: "shopping", payment: "UPI", status: "settled", confidence: 96, hour: 18 });
  all.push({ id: `demo-${seq++}`, date: dupIso2, description: "AMAZON/ORDER/7788991123/AMAZON PAY", merchant: "Amazon", amount: 1299, kind: "expense", category: "shopping", payment: "UPI", status: "settled", confidence: 96, hour: 18 });
  // 3. UPI merchant normalization target
  const { iso: upiIso } = monthOffsetDate(0, 13, 20, 10);
  all.push({ id: `demo-${seq++}`, date: upiIso, description: "UPI/9283728/RAHULKUMAR@YBL", merchant: "Rahul Kumar", amount: 450, kind: "expense", category: "food", payment: "UPI", status: "settled", confidence: 77, normalized: true, hour: 20 });

  // ── Transport ──
  const transportMerchants = ["Uber", "Ola", "Metro Card", "Indian Oil"];
  for (let i = 0; i < 24; i++) {
    const m = i % 6;
    const merchant = transportMerchants[i % transportMerchants.length];
    const day = discretionaryDay(rng, m);
    const hour = 8 + Math.floor(rng() * 11);
    const { iso } = monthOffsetDate(m, day, hour, Math.floor(rng() * 60));
    const raw =
      merchant === "Indian Oil"
        ? Math.round((900 + rng() * 500) / 10) * 10
        : merchant === "Metro Card"
          ? Math.round((60 + rng() * 120) / 5) * 5
          : Math.round((80 + rng() * 260) / 5) * 5;
    const amount = weekendBoost(rng, iso, raw);
    all.push({
      id: `demo-${seq++}`,
      date: iso,
      description: `${merchant.toUpperCase()}/${merchant === "Indian Oil" ? "FUEL" : "TRIP"}/${Math.floor(rng() * 900000)}`,
      merchant,
      amount,
      kind: "expense",
      category: "transport",
      payment: rng() < 0.6 ? "UPI" : "Card",
      status: "settled",
      confidence: Math.round(76 + rng() * 23),
    });
  }

  // ── Entertainment ──
  const entMerchants = ["PVR Cinemas", "BookMyShow", "Steam"];
  for (let i = 0; i < 9; i++) {
    const m = i % 6;
    const merchant = entMerchants[i % entMerchants.length];
    const day = discretionaryDay(rng, m);
    const hour = 11 + Math.floor(rng() * 10);
    const { iso } = monthOffsetDate(m, day, hour, Math.floor(rng() * 60));
    const amount = weekendBoost(rng, iso, Math.round((180 + rng() * 700) / 10) * 10);
    all.push({
      id: `demo-${seq++}`,
      date: iso,
      description: `${merchant.toUpperCase()}/${merchant === "PVR Cinemas" ? "TICKET" : "PAYMENT"}/${Math.floor(rng() * 900000)}`,
      merchant,
      amount,
      kind: "expense",
      category: "entertainment",
      payment: rng() < 0.5 ? "UPI" : "Card",
      status: "settled",
      confidence: Math.round(78 + rng() * 21),
    });
  }

  // ── Healthcare ──
  all.push(...tx({ desc: "APOLLO PHARMACY/MEDICINE", merchant: "Apollo Pharmacy", amount: 420, category: "healthcare", payment: "UPI", day: 6, hour: 18, confidence: 93 }));
  all.push(...tx({ desc: "NETMEDS/ORDER", merchant: "Netmeds", amount: 540, category: "healthcare", payment: "Card", day: 21, hour: 13, confidence: 91 }));
  all.push(...tx({ desc: "DOCTOR VISIT/CLINIC", merchant: "City Clinic", amount: 800, category: "healthcare", payment: "UPI", day: 16, hour: 10, confidence: 90 }));

  // ── Banking fees ──
  all.push(...tx({ desc: "BANK CHARGES/ACCOUNT MAINTENANCE", merchant: "HDFC Bank", amount: 300, category: "fees", payment: "Bank Charge", day: 2, hour: 1, confidence: 99, months: [0] }));
  all.push(...tx({ desc: "BANK CHARGES/DEBIT CARD FEE", merchant: "HDFC Bank", amount: 150, category: "fees", payment: "Bank Charge", day: 2, hour: 1, confidence: 99, months: [0, 1, 2, 3, 4] }));
  all.push(...tx({ desc: "ATM/OTHER BANK/WITHDRAWAL FEE", merchant: "Other Bank ATM", amount: 21, category: "fees", payment: "ATM", day: 11, hour: 12, confidence: 88, months: [0, 2, 4] }));
  all.push(...tx({ desc: "BANK CHARGES/SMS CHARGES", merchant: "HDFC Bank", amount: 60, category: "fees", payment: "Bank Charge", day: 2, hour: 1, confidence: 99, months: [1, 3, 5] }));

  // ── Savings / investments / transfers ──
  all.push(...tx({ desc: "TRANSFER TO SAVINGS ACCOUNT", merchant: "Self Transfer — Savings", amount: 10000, category: "savings", payment: "NEFT", day: 2, hour: 11, confidence: 99, recurring: true }));
  all.push(...tx({ desc: "SIP/MUTUAL FUND/NIFTY 50 INDEX", merchant: "SIP — Nifty 50 Index", amount: 2000, category: "investments", payment: "NEFT", day: 6, hour: 10, confidence: 99, recurring: true }));
  all.push(...tx({ desc: "SIP/MUTUAL FUND/PARAG PARIKH", merchant: "SIP — Parag Parikh", amount: 1000, category: "investments", payment: "NEFT", day: 10, hour: 10, confidence: 99, recurring: true }));
  // ATM cash
  for (let i = 0; i < 12; i++) {
    const m = i % 6;
    const day = 1 + Math.floor(rng() * 28);
    const { iso } = monthOffsetDate(m, day, 9 + Math.floor(rng() * 10), Math.floor(rng() * 60));
    all.push({
      id: `demo-${seq++}`,
      date: iso,
      description: "ATM/HDFC BANK/WITHDRAWAL",
      merchant: "HDFC Bank ATM",
      amount: Math.round((500 + rng() * 1500) / 100) * 100,
      kind: "expense",
      category: "transfers",
      payment: "ATM",
      status: "settled",
      confidence: 95,
    });
  }

  // ── Micro-spending: tea, chai, kirana, parking, recharges (mostly < ₹200) ──
  const microMerchants = [
    "Chai Point",
    "Chai Point",
    "Tea Stall",
    "Kirana Store",
    "Parking",
    "Paytm Wallet",
    "PhonePe",
    "Chai Point",
    "Metro",
    "Tea Stall",
  ];
  all.push(...microTx("UPI", microMerchants, 100, 15, 190, "food", "UPI", rng));
  all.push(...microTx("WALLET", ["Paytm", "PhonePe", "Mobikwik"], 26, 50, 250, "other", "Wallet", rng));

  // ── Misc ──
  all.push(...tx({ desc: "BOOKMYSHOW/MOVIE", merchant: "BookMyShow", amount: 480, category: "entertainment", payment: "UPI", day: 24, hour: 17, confidence: 92, months: [1, 3, 5] }));
  all.push(...tx({ desc: "IRCTC/TRAIN TICKET", merchant: "IRCTC", amount: 1180, category: "travel", payment: "UPI", day: 19, hour: 10, confidence: 94, months: [2, 4] }));
  all.push(...tx({ desc: "ZOMATO GOLD/MONTHLY", merchant: "Zomato Gold", amount: 99, category: "subscriptions", payment: "UPI", day: 13, hour: 10, confidence: 90, months: [0, 1] }));

  // Sort newest first for display consistency
  return all.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const DEMO_SUMMARY = {
  description:
    "6 months of realistic Indian transactions: UPI, cards, NEFT, ATM, bank fees, subscriptions, SIPs and salary. Planted with a duplicate payment, a subscription price increase, an unused subscription, an unusual ₹6,900 charge, micro-spending and a late-night food-delivery surge.",
};
