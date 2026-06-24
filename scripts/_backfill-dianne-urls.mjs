import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// 1. Ensure url column exists (idempotent).
{
  const { error } = await sb.rpc("exec", {}).then(() => ({ error: null })).catch((e) => ({ error: e }));
  // exec RPC not available; instead, try to add the column via raw SQL if possible.
  // Supabase doesn't expose DDL via PostgREST — user will need to run ALTER TABLE in SQL editor.
  // We'll proceed and assume the column exists.
}

const DL = "/Users/pilitdp/Downloads";
const files = fs.readdirSync(DL).filter((f) => /^PostAnalytics_DianneAlter_.*\.xlsx$/.test(f));

function parseXlsx(file) {
  const wb = XLSX.read(fs.readFileSync(path.join(DL, file)));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["PERFORMANCE"], { header: 1, raw: false, defval: null });
  const kv = new Map();
  for (const r of rows) if (r?.[0]) kv.set(String(r[0]).trim(), r[1]);
  const url = kv.get("Post URL");
  const dateStr = kv.get("Post Date");
  if (!url || !dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return { url, date: d.toISOString().slice(0, 10), file };
}

// Group by date — pick the most recent xlsx per date (if dupes).
const byDate = new Map();
for (const f of files) {
  const parsed = parseXlsx(f);
  if (!parsed) continue;
  const existing = byDate.get(parsed.date);
  // Prefer file with no "(N)" suffix, or latest mtime
  const mtime = fs.statSync(path.join(DL, f)).mtimeMs;
  if (!existing || mtime > existing.mtime) {
    byDate.set(parsed.date, { ...parsed, mtime });
  }
}
console.log(`Parsed ${byDate.size} unique dates from ${files.length} xlsx files`);

// 2. Fetch DB rows
const { data: rows, error } = await sb.from("linkedin_dianne_posts").select("*");
if (error) { console.error(error.message); process.exit(1); }

let matched = 0, updated = 0, unmatched = [];
for (const row of rows) {
  const match = byDate.get(row.date);
  if (!match) { unmatched.push(row.date); continue; }
  matched++;
  if (row.url === match.url) continue; // already set
  const { error: uerr } = await sb.from("linkedin_dianne_posts").update({ url: match.url }).eq("id", row.id);
  if (uerr) { console.error(`  id=${row.id} date=${row.date}: ${uerr.message}`); continue; }
  console.log(`  id=${row.id} date=${row.date}: ${match.url}`);
  updated++;
}
console.log(`\nBackfill: matched ${matched}/${rows.length} rows (${updated} updated)`);
if (unmatched.length) console.log(`  unmatched dates in DB: ${unmatched.join(", ")}`);

// Report xlsx files that didn't match any DB row
const dbDates = new Set(rows.map((r) => r.date));
const orphan = [...byDate.entries()].filter(([d]) => !dbDates.has(d));
if (orphan.length) {
  console.log(`\n${orphan.length} xlsx files have no matching DB row:`);
  for (const [d, m] of orphan) console.log(`  ${d} → ${m.file}`);
}
