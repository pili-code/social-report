import fs from "node:fs";
import { parse } from "csv-parse/sync";

const raw = fs.readFileSync("/Users/pilitdp/Downloads/20240201-TDP-SaaS-Metrics - events (2).csv", "utf8");
const rows = parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });

const toNum = (s) => {
  if (!s) return 0;
  const m = String(s).replace(/[^\d.()-]/g, "");
  if (!m) return 0;
  const neg = /\(.*\)/.test(String(s));
  const n = Number(m.replace(/[()]/g, ""));
  return neg ? -Math.abs(n) : n;
};

const MONTHS_ORDER = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12,
  January:1, February:2, March:3, April:4, June:6, July:7, August:8, September:9, October:10, November:11, December:12 };

function parseDate(s) {
  if (!s) return null;
  const [m, y] = String(s).trim().split(/\s+/);
  return { y: parseInt(y), m: MONTHS_ORDER[m] ?? 0 };
}

const parsed = rows.map((r) => ({
  date: parseDate(r.Date),
  event: r.Event,
  customer: r.Customer,
  mrr: toNum(r[" MRR change "] ?? r["MRR change"]),
  raw: r.Date,
})).filter((r) => r.date && r.date.y);

parsed.sort((a, b) => (a.date.y - b.date.y) * 100 + (a.date.m - b.date.m));

let mrr = 0;
const monthly = [];
let curKey = null;
let monthStart = 0;
for (const r of parsed) {
  if (r.event !== "customer - new" && r.event !== "customer - churn" && r.event !== "MRR - expansion" && r.event !== "MRR - churn") continue;
  const key = `${r.date.y}-${String(r.date.m).padStart(2, "0")}`;
  if (key !== curKey) {
    if (curKey) monthly.push({ month: curKey, startMRR: monthStart, endMRR: mrr, delta: mrr - monthStart });
    curKey = key;
    monthStart = mrr;
  }
  mrr += r.mrr;
}
if (curKey) monthly.push({ month: curKey, startMRR: monthStart, endMRR: mrr, delta: mrr - monthStart });

console.log("Month     | Start MRR    | End MRR      | Delta");
console.log("-".repeat(55));
for (const m of monthly.slice(-18)) {
  const sign = m.delta >= 0 ? "+" : "";
  console.log(`${m.month.padEnd(10)}| $${m.startMRR.toFixed(2).padStart(11)} | $${m.endMRR.toFixed(2).padStart(11)} | ${sign}$${m.delta.toFixed(2)}`);
}
console.log(`\nCurrent MRR: $${mrr.toFixed(2)}`);
console.log(`Current ARR: $${(mrr * 12).toFixed(2)}`);
