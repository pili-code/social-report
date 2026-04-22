import fs from "node:fs";
import { parse } from "csv-parse/sync";

const exports_ = {
  "4-year export (2022→Apr22,2026)": "/Users/pilitdp/Downloads/Content 2022-04-27_2026-04-22 The Design Project",
  "1-year export (Apr22,2025→Apr22,2026)": "/tmp/yt-1yr",
};

const months = [
  ["Oct 2025", 2025, 9, 31],
  ["Nov 2025", 2025, 10, 30],
  ["Dec 2025", 2025, 11, 31],
  ["Jan 2026", 2026, 0, 31],
  ["Feb 2026", 2026, 1, 28],
  ["Mar 2026", 2026, 2, 31],
  ["Apr 2026", 2026, 3, 22],
];

for (const [label, dir] of Object.entries(exports_)) {
  console.log(`\n=== ${label} ===`);
  const totals = parse(fs.readFileSync(`${dir}/Totals.csv`, "utf8"), { columns: true });
  const chart = parse(fs.readFileSync(`${dir}/Chart data.csv`, "utf8"), { columns: true });
  console.log(`Totals.csv rows: ${totals.length}, Chart data.csv rows: ${chart.length}`);

  console.log(`${"Month".padEnd(10)} | ${"Totals".padStart(10)} | ${"Chart long".padStart(10)} | ${"Chart shorts".padStart(12)}`);
  for (const [name, year, mi] of months) {
    const inMonth = (r) => { const d = new Date(r.Date); return d.getUTCFullYear() === year && d.getUTCMonth() === mi; };
    const totalV = totals.filter(inMonth).reduce((s, r) => s + Number(r.Views || 0), 0);
    let longV = 0, shortV = 0;
    for (const r of chart) {
      if (!inMonth(r)) continue;
      const dur = Number(r.Duration || 0);
      const v = Number(r.Views || 0);
      if (dur > 0 && dur <= 180) shortV += v; else longV += v;
    }
    console.log(`${name.padEnd(10)} | ${totalV.toString().padStart(10)} | ${longV.toString().padStart(10)} | ${shortV.toString().padStart(12)}`);
  }
}
