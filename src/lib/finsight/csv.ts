// ─── CSV import / export + merchant & category normalization ────────────────
// Robust parser for Indian bank/UPI statements (works with missing fields,
// malformed dates, unknown merchants). Column auto-mapping, merchant
// normalization (UPI handles → names), keyword category inference.

import type { CategoryId, CsvParseResult, PaymentType, Transaction } from "./types";
import { CATEGORIES } from "./types";

// ── tiny CSV line parser (handles quoted fields, commas inside quotes) ──
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const normHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

function mapColumns(headers: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => {
    const n = normHeader(h);
    if (/(date|txndate|txndate|posted|valuedate)/.test(n) && idx.date === undefined) idx.date = i;
    if (/(narration|particulars|description|details|remarks|payee|merchant|transactiondetail)/.test(n) && idx.desc === undefined) idx.desc = i;
    if (/(amount|txnamount|value)/.test(n) && !/(debit|credit|withdraw|deposit)/.test(n) && idx.amount === undefined) idx.amount = i;
    if (/(^debit|debitamt|withdrawal|withdrawalamt)/.test(n)) idx.debit = i;
    if (/(^credit|creditamt|deposit|depositamt)/.test(n)) idx.credit = i;
    if (/(type|mode|txntype|transactiontype)/.test(n) && idx.type === undefined) idx.type = i;
    if (/(category)/.test(n) && idx.category === undefined) idx.category = i;
    if (/(paymentmethod|payment|channel|method|instrument)/.test(n) && idx.payment === undefined) idx.payment = i;
  });
  return idx;
}

export function parseDateToIso(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    // ambiguous d/m vs m/d: if first > 12 it's a day; Indian format is dd/mm
    if (parseInt(d, 10) > 12) {
      const t = d;
      d = mo;
      mo = t;
    }
    let yy = parseInt(y, 10);
    if (yy < 100) yy += yy > 40 ? 1900 : 2000;
    return `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return null;
}

export function parseAmountRaw(raw: string): number | null {
  const s = raw.trim().replace(/[₹,\s]/g, "");
  if (!s) return null;
  const n = parseFloat(s);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

// ── merchant normalization ──
const BRAND_ALIASES: [RegExp, string][] = [
  [/netflix/i, "Netflix"],
  [/spotify/i, "Spotify"],
  [/youtube premium|yt premium/i, "YouTube Premium"],
  [/amazon prime|prime video/i, "Amazon Prime"],
  [/icloud|apple\.com/i, "iCloud+"],
  [/coursera/i, "Coursera Plus"],
  [/udemy/i, "Udemy"],
  [/skillshare/i, "Skillshare"],
  [/swiggy/i, "Swiggy"],
  [/zomato/i, "Zomato"],
  [/dominos/i, "Dominos"],
  [/kfc/i, "KFC"],
  [/mcdonald/i, "McDonald's"],
  [/bigbasket/i, "BigBasket"],
  [/dmart/i, "DMart"],
  [/zepto/i, "Zepto"],
  [/instamart/i, "Instamart"],
  [/amazon/i, "Amazon"],
  [/flipkart/i, "Flipkart"],
  [/myntra/i, "Myntra"],
  [/ajio/i, "Ajio"],
  [/uber/i, "Uber"],
  [/ola/i, "Ola"],
  [/rapido/i, "Rapido"],
  [/metro card|metro/i, "Metro Card"],
  [/indian oil|iocl/i, "Indian Oil"],
  [/hp petrol|hpcl/i, "HP Petrol"],
  [/airtel/i, "Airtel"],
  [/jio/i, "Jio"],
  [/bescom/i, "BESCOM"],
  [/pvr/i, "PVR Cinemas"],
  [/bookmyshow/i, "BookMyShow"],
  [/steam/i, "Steam"],
  [/apollo/i, "Apollo Pharmacy"],
  [/netmeds/i, "Netmeds"],
  [/practo/i, "Practo"],
  [/paytm/i, "Paytm"],
  [/phonepe/i, "PhonePe"],
  [/mobikwik/i, "Mobikwik"],
  [/irctc/i, "IRCTC"],
  [/cult\.fit|cultfit/i, "Cult.fit"],
  [/hdfc/i, "HDFC Bank"],
  [/icici/i, "ICICI Bank"],
  [/sbi|state bank/i, "SBI"],
  [/axis/i, "Axis Bank"],
  [/rent/i, "Landlord — Rent"],
  [/salary/i, "ACME Solutions"],
];

export function normalizeMerchant(rawDesc: string): { merchant: string; normalized: boolean } {
  const desc = rawDesc.trim();
  if (!desc) return { merchant: "Unknown Merchant", normalized: false };
  for (const [re, name] of BRAND_ALIASES) {
    if (re.test(desc)) return { merchant: name, normalized: /upi|wallet|\/|@/i.test(desc) };
  }
  // UPI handle: UPI/123456/NAME@BANK or NAME@BANK
  const upi = desc.match(/UPI\/[^/]+\/([A-Za-z0-9._-]+@[A-Za-z]+)/i) || desc.match(/^([A-Za-z0-9._-]+@[A-Za-z]+)/i);
  if (upi) {
    const handle = upi[1].split("@")[0].replace(/[_.-]/g, " ");
    return { merchant: toTitleCase(handle), normalized: true };
  }
  // take first path segment
  const first = desc.split("/")[0].split(" ")[0];
  if (first && first.length >= 3) {
    return { merchant: toTitleCase(first.replace(/\.(COM|IN|NET|CO)$/i, "")), normalized: /[/@]/i.test(desc) };
  }
  return { merchant: toTitleCase(desc), normalized: false };
}

function toTitleCase(s: string) {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// ── category inference ──
const CATEGORY_KEYWORDS: [CategoryId, RegExp][] = [
  ["food", /(swiggy|zomato|dominos|kfc|mcdonald|foodpanda|chai|cafe|café|restaurant|eatery|hotel|biryani|tiffin|food|snack|dosa|paratha|ice ?cream|coffee)/i],
  ["groceries", /(bigbasket|dmart|zepto|instamart|grocery|kirana|supermarket|reliance ?fresh|vegetable|provision|ration)/i],
  ["shopping", /(amazon|flipkart|myntra|ajio|meesho|nykaa|order|emi|clothing|apparel|footwear|fashion|amazonpay)/i],
  ["transport", /(uber|ola|rapido|metro|fuel|petrol|indian ?oil|hpcl|iocl|toll|parking|auto|rickshaw|cab|bus|ev ?charge)/i],
  ["travel", /(irctc|train|flight|air ?india|indigo|oyo|goibibo|makemytrip|railway|airline|hotel booking)/i],
  ["bills", /(rent|landlord|society|maintenance|property)/i],
  ["utilities", /(bescom|electricity|water|airtel|jio|broadband|recharge|postpaid|gas|cylinder|wifi|mobile bill)/i],
  ["subscriptions", /(netflix|spotify|youtube ?premium|amazon ?prime|prime ?video|icloud|apple\.com|coursera|udemy|skillshare|cult\.fit|zomato ?gold|disney|hotstar|audible|gym|membership|subscription)/i],
  ["entertainment", /(pvr|inox|bookmyshow|steam|cinema|movie|concert|playstation|xbox|ott|game)/i],
  ["healthcare", /(apollo|netmeds|pharmacy|pharma|doctor|clinic|hospital|medicine|1mg|practo|health|dental|lab)/i],
  ["education", /(tuition|coaching|school|college|exam|class|course fee|books)/i],
  ["investments", /(sip|mutual|fund|zerodha|groww|stock|nps|shares?|etf)/i],
  ["savings", /(fixed deposit|recurring deposit|fd|rd|savings account|transfer to savings)/i],
  ["fees", /(bank charges|maintenance|debit card fee|sms charges|atm fee|penalty|service fee|charges|interest charged)/i],
  ["transfers", /(transfer|neft|imps|atm withdrawal|withdrawal|cash|self|wallet transfer)/i],
  ["income", /(salary|interest|refund|dividend|bonus|credit|payout|freelance)/i],
];

export function inferCategory(merchant: string, description: string): { category: CategoryId; confidence: number } {
  const hay = `${merchant} ${description}`;
  for (const [cat, re] of CATEGORY_KEYWORDS) {
    if (re.test(hay)) {
      return { category: cat, confidence: 88 };
    }
  }
  return { category: "other", confidence: 62 };
}

function inferPayment(desc: string, hint: string | undefined): PaymentType {
  const h = `${desc} ${hint ?? ""}`;
  if (/upi/i.test(h)) return "UPI";
  if (/neft/i.test(h)) return "NEFT";
  if (/imps/i.test(h)) return "IMPS";
  if (/atm/i.test(h)) return "ATM";
  if (/wallet|paytm|phonepe|mobikwik/i.test(h)) return "Wallet";
  if (/card|visa|mastercard|rupay/i.test(h)) return "Card";
  if (/cash/i.test(h)) return "Cash";
  if (/charge|fee|bank/i.test(h)) return "Bank Charge";
  return "UPI";
}

// ── main parser ──
export function parseCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const errors: string[] = [];
  if (lines.length < 2) {
    return { txs: [], skipped: 0, errors: ["File is empty or has no data rows."], detectedColumns: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const idx = mapColumns(headers);
  const detectedColumns = Object.entries(idx).map(([k]) => k);
  if (idx.date === undefined || (idx.amount === undefined && idx.debit === undefined)) {
    return {
      txs: [],
      skipped: Math.max(0, lines.length - 1),
      errors: ["Could not find Date and Amount columns. Expected at least: Date, Description, Amount."],
      detectedColumns: headers.map(normHeader),
    };
  }

  const txs: Transaction[] = [];
  let skipped = 0;
  let seq = 0;

  for (let li = 1; li < lines.length; li++) {
    const row = parseCsvLine(lines[li]);
    try {
      const dateRaw = row[idx.date] ?? "";
      const iso = parseDateToIso(dateRaw);
      if (!iso) {
        skipped++;
        continue;
      }
      const desc = (idx.desc !== undefined ? row[idx.desc] : "") || (idx.payment !== undefined ? row[idx.payment] : "") || "Unknown";
      const rawAmount =
        idx.amount !== undefined ? row[idx.amount] : idx.debit !== undefined ? row[idx.debit] : "";
      const rawCredit = idx.credit !== undefined ? row[idx.credit] : "";
      const amount = parseAmountRaw(rawAmount) ?? 0;
      const creditAmount = parseAmountRaw(rawCredit) ?? 0;

      const typeRaw = (idx.type !== undefined ? row[idx.type] : "") || "";
      const isCredit = /(credit|income|deposit|salary|refund)/i.test(typeRaw) || creditAmount > 0;
      const isDebit = /(debit|withdrawal|expense|payment|purchase|atm)/i.test(typeRaw);

      let kind: "expense" | "income";
      if (isCredit && !isDebit) kind = "income";
      else if (isDebit && !isCredit) kind = "expense";
      else kind = creditAmount > amount ? "income" : "expense";

      const effectiveAmount = kind === "income" ? Math.max(amount, creditAmount) : Math.max(amount, creditAmount > 0 ? creditAmount * 0 : amount);
      if (effectiveAmount <= 0) {
        skipped++;
        continue;
      }

      const { merchant, normalized } = normalizeMerchant(desc);
      const payment = inferPayment(desc, idx.payment !== undefined ? row[idx.payment] : undefined);

      const explicitCat = idx.category !== undefined ? row[idx.category] : "";
      let category: CategoryId;
      let confidence: number;
      if (explicitCat) {
        const match = CATEGORIES.find((c) => c.label.toLowerCase() === explicitCat.trim().toLowerCase());
        category = match ? match.id : inferCategory(merchant, desc).category;
        confidence = match ? 97 : 80;
      } else {
        const inferred = inferCategory(merchant, desc);
        category = inferred.category;
        confidence = inferred.confidence;
      }
      if (kind === "income") {
        category = "income";
        confidence = 97;
      }

      txs.push({
        id: `csv-${Date.now().toString(36)}-${seq++}`,
        date: iso,
        description: desc,
        merchant,
        amount: Math.round(effectiveAmount),
        kind,
        category,
        payment,
        status: /pending/i.test(typeRaw) ? "pending" : "settled",
        confidence,
        normalized,
      });
    } catch {
      skipped++;
      errors.push(`Row ${li + 1}: could not be parsed and was skipped.`);
    }
  }

  return {
    txs: txs.sort((a, b) => (a.date < b.date ? 1 : -1)),
    skipped,
    errors: errors.slice(0, 5),
    detectedColumns,
  };
}

// ── export ──
export function transactionsToCsv(txs: Transaction[]): string {
  const header = "Date,Description,Merchant,Amount,Type,Category,Payment Method,Status,Confidence";
  const rows = txs.map((t) =>
    [t.date, `"${t.description.replace(/"/g, '""')}"`, `"${t.merchant.replace(/"/g, '""')}"`, t.amount, t.kind, t.category, t.payment, t.status, t.confidence].join(","),
  );
  return [header, ...rows].join("\n");
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
