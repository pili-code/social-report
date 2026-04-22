import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: "/Users/pilitdp/programacion/gtm-app/.env.local" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

for (const table of ["youtube_weekly", "youtube_monthly", "youtube_videos", "shorts_weekly"]) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) { console.log(table, "ERROR:", error.message); continue; }
  console.log(`\n=== ${table} (${data.length} rows) ===`);
  for (const r of data.slice(0, 100)) {
    if (table === "youtube_weekly") console.log(`  week="${r.week}"  month="${r.month}"  views=${r.views}  days=${r.days}`);
    else if (table === "youtube_monthly") console.log(`  month="${r.month}"  views=${r.views}  daily_avg=${r.daily_avg}  partial=${r.partial}`);
    else if (table === "youtube_videos") console.log(`  published="${r.published}"  title="${(r.title || "").slice(0, 60)}"  views=${r.views}`);
    else if (table === "shorts_weekly") console.log(`  week="${r.week}"  clips=${r.clips}  views=${r.total_views}`);
  }
}
