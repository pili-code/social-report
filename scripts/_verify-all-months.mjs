import fs from "node:fs";
import { parse } from "csv-parse/sync";

const DIR = "/Users/pilitdp/Downloads/Content 2022-04-27_2026-04-22 The Design Project";

const totals = parse(fs.readFileSync(`${DIR}/Totals.csv`, "utf8"), { columns: true });
const chart = parse(fs.readFileSync(`${DIR}/Chart data.csv`, "utf8"), { columns: true });

const months = [
  ["Oct 2025", 2025, 9, 31],
  ["Nov 2025", 2025, 10, 30],
  ["Dec 2025", 2025, 11, 31],
  ["Jan 2026", 2026, 0, 31],
  ["Feb 2026", 2026, 1, 28],
  ["Mar 2026", 2026, 2, 31],
  ["Apr 2026", 2026, 3, 22], // up to Apr 22
];

// Authoritative numbers from commit 091a097 (Apr 15 snapshot) for comparison
const authoritative = {
  "Dec 2025": { daily: 1654, views: 51268 },
  "Jan 2026": { daily: 2788, views: 86440 },
  "Feb 2026": { daily: 3007, views: 84193 },
  "Mar 2026": { daily: 3854, views: 119474 },
};

console.log("Month      | Totals.csv  | Chart long  | Chart shorts | long+short  | auth old views | diff from Totals");
console.log("-".repeat(105));

for (const [name, year, mi, days] of months) {
  const inMonth = (r) => { const d = new Date(r.Date); return d.getUTCFullYear() === year && d.getUTCMonth() === mi; };
  const totalV = totals.filter(inMonth).reduce((s, r) => s + Number(r.Views || 0), 0);
  let longV = 0, shortV = 0;
  for (const r of chart) {
    if (!inMonth(r)) continue;
    const dur = Number(r.Duration || 0);
    const v = Number(r.Views || 0);
    if (dur > 0 && dur <= 180) shortV += v; else longV += v;
  }
  const auth = authoritative[name];
  const authStr = auth ? auth.views.toLocaleString().padStart(8) : "       —";
  const diffAuth = auth ? (totalV - auth.views).toLocaleString() : "—";
  console.log(`${name}   | ${totalV.toString().padStart(10)}  | ${longV.toString().padStart(10)}  | ${shortV.toString().padStart(11)}  | ${(longV + shortV).toString().padStart(10)}  | ${authStr}      | ${diffAuth}`);
}
