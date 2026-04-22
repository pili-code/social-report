import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

for (const t of ["linkedin_dianne_posts", "linkedin_dianne_monthly", "twitter_weekly", "cold_email_campaigns"]) {
  const { data, error } = await sb.from(t).select("*");
  if (error) { console.log(t, "ERR", error.message); continue; }
  console.log(`\n=== ${t} (${data.length}) ===`);
  for (const r of data) {
    const { id, created_at, ...rest } = r;
    console.log(" ", rest);
  }
}
