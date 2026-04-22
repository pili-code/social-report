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

const TABLES = ["youtube_weekly", "shorts_weekly", "youtube_videos", "youtube_monthly"];
for (const t of TABLES) {
  const { error, count } = await sb.from(t).delete({ count: "exact" }).neq("id", -1);
  if (error) { console.error(`${t}: ${error.message}`); process.exit(1); }
  console.log(`${t}: deleted ${count ?? "?"} rows`);
}
