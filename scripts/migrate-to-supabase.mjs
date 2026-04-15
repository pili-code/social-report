import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const UNIQUE_KEYS = {
  youtube_weekly: ["week"],
  youtube_monthly: ["month"],
  youtube_videos: ["title"],
  shorts_weekly: ["week"],
  linkedin_dianne_posts: ["week", "date"],
  linkedin_dianne_monthly: ["month"],
  linkedin_tdp_weekly: ["week"],
  cold_email_campaigns: ["campaign"],
};

const raw = fs.readFileSync(path.join(__dirname, "..", "gtm-data.json"), "utf8");
const data = JSON.parse(raw);

for (const [table, rows] of Object.entries(data)) {
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`${table}: skipped (empty)`);
    continue;
  }
  const keys = UNIQUE_KEYS[table];
  if (!keys) {
    console.log(`${table}: skipped (no unique key config)`);
    continue;
  }
  const cleaned = rows.map(({ id, ...rest }) => rest);
  const { error } = await supabase
    .from(table)
    .upsert(cleaned, { onConflict: keys.join(",") });
  if (error) {
    console.error(`${table}: FAILED — ${error.message}`);
    process.exit(1);
  }
  console.log(`${table}: ${rows.length} rows upserted`);
}

console.log("\nMigration complete.");
