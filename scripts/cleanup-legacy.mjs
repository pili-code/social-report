import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// 1. Remove bogus 2001 rows from linkedin_dianne_monthly
const badMonths = ["Jan 2001", "Feb 2001", "Mar 2001", "Apr 2001", "Dec 2001"];
const { error: e1, count: c1 } = await sb.from("linkedin_dianne_monthly").delete({ count: "exact" }).in("month", badMonths);
if (e1) console.error("monthly delete:", e1.message); else console.log(`Deleted ${c1} garbage monthly rows`);

// 2. Find duplicate Dianne posts — same week but one has short date ("Apr 1") and one has ISO ("2026-04-01")
const { data: posts } = await sb.from("linkedin_dianne_posts").select("*").order("week", { ascending: true });
const byWeek = new Map();
for (const p of posts) {
  const arr = byWeek.get(p.week) ?? [];
  arr.push(p);
  byWeek.set(p.week, arr);
}
const toDelete = [];
for (const [, rows] of byWeek) {
  if (rows.length < 2) continue;
  // If we have an ISO-format date AND a short-format date for same week → delete the short one
  const hasIso = rows.find((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date));
  if (!hasIso) continue;
  for (const r of rows) {
    if (r !== hasIso && !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) toDelete.push(r.id);
  }
}
if (toDelete.length > 0) {
  const { error: e2, count: c2 } = await sb.from("linkedin_dianne_posts").delete({ count: "exact" }).in("id", toDelete);
  if (e2) console.error("posts delete:", e2.message); else console.log(`Deleted ${c2} duplicate legacy Dianne posts`);
} else {
  console.log("No duplicate Dianne posts to clean");
}

console.log("Cleanup done.");
