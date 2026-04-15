import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Aggregate linkedin_dianne_posts → linkedin_dianne_monthly
const { data: posts } = await supabase.from("linkedin_dianne_posts").select("*");
const { data: existing } = await supabase.from("linkedin_dianne_monthly").select("*");
const priorBy = new Map(existing.map((r) => [r.month, r]));

const buckets = new Map();
for (const p of posts) {
  const d = new Date(p.date);
  if (isNaN(d.getTime())) continue;
  if (d.getUTCFullYear() < 2020) continue; // skip legacy rows with unparseable dates
  const month = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const b = buckets.get(month) ?? { impressions: 0, saves: 0, posts: 0 };
  b.impressions += Number(p.impressions) || 0;
  b.saves += Number(p.saves) || 0;
  b.posts += 1;
  buckets.set(month, b);
}

function monthKey(m) {
  const [name, year] = m.split(" ");
  return parseInt(year) * 12 + MONTHS.indexOf(name);
}
const sorted = [...buckets.entries()].sort(([a], [b]) => monthKey(a) - monthKey(b));

const rows = sorted.map(([month, b], i) => {
  const prev = i > 0 ? sorted[i - 1][1] : null;
  const momImp = prev && prev.impressions > 0 ? ((b.impressions - prev.impressions) / prev.impressions) * 100 : null;
  const momSaves = prev && prev.saves > 0 ? ((b.saves - prev.saves) / prev.saves) * 100 : null;
  const prior = priorBy.get(month) ?? {};
  return {
    month,
    impressions: b.impressions,
    saves: b.saves,
    posts: b.posts,
    mom_imp: momImp !== null ? Math.round(momImp * 10) / 10 : null,
    mom_saves: momSaves !== null ? Math.round(momSaves * 10) / 10 : null,
    partial: prior.partial ?? 0,
    note: prior.note ?? "",
  };
});

console.log(`linkedin_dianne_monthly: rebuilding ${rows.length} months from ${posts.length} posts`);
rows.forEach((r) => console.log(`  ${r.month}: imp=${r.impressions}, saves=${r.saves}, posts=${r.posts}`));

const { error } = await supabase.from("linkedin_dianne_monthly").upsert(rows, { onConflict: "month" });
if (error) {
  console.error("Upsert failed:", error.message);
  process.exit(1);
}
console.log(`\n${rows.length} rows upserted.`);
