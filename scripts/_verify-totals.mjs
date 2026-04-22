import fs from "node:fs";
import { parse } from "csv-parse/sync";

const DIR = "/Users/pilitdp/Downloads/Content 2022-04-27_2026-04-22 The Design Project";

const totals = parse(fs.readFileSync(`${DIR}/Totals.csv`, "utf8"), { columns: true });
const chart = parse(fs.readFileSync(`${DIR}/Chart data.csv`, "utf8"), { columns: true });

// Pick Dec 2025 — that's where numbers diverged most.
function isInDec2025(dateStr) {
  const d = new Date(dateStr);
  return d.getUTCFullYear() === 2025 && d.getUTCMonth() === 11;
}

// Totals: daily sum for Dec 2025
const totalDec = totals
  .filter((r) => isInDec2025(r.Date))
  .reduce((s, r) => s + Number(r.Views || 0), 0);

// Chart: per-video-per-day; split by duration (shorts if ≤180s)
let longDec = 0, shortDec = 0;
for (const r of chart) {
  if (!isInDec2025(r.Date)) continue;
  const dur = Number(r.Duration || 0);
  const v = Number(r.Views || 0);
  if (dur > 0 && dur <= 180) shortDec += v;
  else longDec += v;
}

console.log(`Dec 2025 breakdown:`);
console.log(`  Totals.csv:           ${totalDec.toLocaleString()}`);
console.log(`  Chart long-form:      ${longDec.toLocaleString()}`);
console.log(`  Chart shorts:         ${shortDec.toLocaleString()}`);
console.log(`  Chart long+short:     ${(longDec + shortDec).toLocaleString()}`);
console.log(`  Chart — Totals diff:  ${(longDec + shortDec - totalDec).toLocaleString()} (missing = live/premieres/etc.)`);
