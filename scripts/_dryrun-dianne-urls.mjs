import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const DL = "/Users/pilitdp/Downloads";
const files = fs.readdirSync(DL).filter((f) => /^PostAnalytics_DianneAlter_.*\.xlsx$/.test(f));

const byDate = new Map();
for (const f of files) {
  const wb = XLSX.read(fs.readFileSync(path.join(DL, f)));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["PERFORMANCE"], { header: 1, raw: false, defval: null });
  const kv = new Map();
  for (const r of rows) if (r?.[0]) kv.set(String(r[0]).trim(), r[1]);
  const url = kv.get("Post URL");
  const dateStr = kv.get("Post Date");
  if (!url || !dateStr) continue;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) continue;
  const dateIso = d.toISOString().slice(0, 10);
  const mtime = fs.statSync(path.join(DL, f)).mtimeMs;
  if (!byDate.get(dateIso) || mtime > byDate.get(dateIso).mtime) {
    byDate.set(dateIso, { url, date: dateIso, file: f, mtime });
  }
}

const { data: rows } = await sb.from("linkedin_dianne_posts").select("id, date, impressions, note").order("date");

console.log(`\nDB rows (${rows.length}) and matching xlsx URLs:\n`);
for (const r of rows) {
  const m = byDate.get(r.date);
  const noteShort = (r.note || "").slice(0, 35);
  console.log(`  ${r.date}  imp=${String(r.impressions).padStart(6)}  note="${noteShort}"`);
  console.log(`    → ${m ? m.url : "❌ no xlsx found"}`);
}

const matchedDates = new Set(rows.map((r) => r.date).filter((d) => byDate.has(d)));
console.log(`\nxlsx orphans (no DB row):`);
for (const [d, m] of byDate) {
  if (!matchedDates.has(d)) console.log(`  ${d}  → ${m.file}`);
}
