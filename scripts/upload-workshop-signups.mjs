import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CSV_FILE =
  "/Users/pilitdp/Downloads/Sign up for our design-to-code workshop!_Submissions_2026-06-24.csv";

// utm_content slug → YouTube video title (exact match against youtube_videos.title).
const VIDEO_SLUGS = {
  design_system_4_hours: "I Built My Entire Design System in 4 Hours With AI. Full Tutorial (Claude + Cursor + Figma)",
  component_library_2_days: "How I Build a Component Library in 2 days (Figma to Claude Code to Storybook)",
  codebase_audit_component_library: "Audit Your Codebase & Build a Component Library in a Day (Claude Code Tutorial)",
  is_ui_design_dead: "Is UI Design Dead?",
  claude_cursor_github_setup: "Claude Code + Cursor + GitHub: The New AI environment setup",
  figma_to_code_8min: "Stop Wasting Dev Time on Frontend: Figma to Code in 8 Minutes",
  figma_wireframes_dead: "Figma Wireframes Are Dead. Here's How Product Teams Are Replacing Them",
  presentation_claude_code: "Build Your Entire Presentation in Claude Code and Ship it as HTML",
  v0_lovable_vs_claude: "Stop using V0 and Lovable to prototype, use Claude Code instead",
  claude_code_skill: "Building a custom Claude Code Skill from scratch",
  design_to_code_workshop_miami: "Design-to-Code Workshop with Claude Code, Cursor & Figma (Friends of Figma Miami - Feb 2026)",
  ai_design_tool_figma: "The AI Design Tool That Figma Doesn't Want You to See",
  github_for_designers: "GitHub for Designers: Everything You Need to Know",
  figma_lovable_v0_claude: "Figma Make vs Lovable vs V0 vs Claude Code: What We Actually Use in Production",
  gemini_vs_claude_ui: "I Tested Gemini 3 Pro vs Claude Opus 4.5 for UI Design (one is clearly superior)",
  ai_tools_product_teams: "I Tested Every AI Tool for Product Teams. Here's What Actually Works",
  design_feature_claude: "Watch Me Design a Feature in Claude Code",
  google_stitch_review: "I wanted to love Google Stitch. I didn't.",
  figma_is_dead: "Figma is Dead (almost)",
  brand_designer_ai_tools: "The AI Tools Our Brand Designer Can't Live Without (Midjourney vs ChatGPT vs NanoBanana)",
  ai_user_research: "Stop Using One AI for User Research (Try This Instead)",
  ux_patterns_b2b_saas: "4 UX Patterns I Fixed at 50+ B2B SaaS Companies (You Can Too)",
  designers_vs_ai_hiring: "Stop Hiring Designers for AI Work (And Vice Versa)",
  ai_ability_to_care: "The One Thing AI Will Never Have: The Ability To Care.",
  shipping_fast_purpose: "Shipping Fast With Purpose, Because Not Everyone Has Time to Wait.",
};

// 1. Update youtube_videos.utm_slug for each known title.
let slugUpdates = 0;
for (const [slug, title] of Object.entries(VIDEO_SLUGS)) {
  const { error, count } = await supabase
    .from("youtube_videos")
    .update({ utm_slug: slug }, { count: "exact" })
    .eq("title", title);
  if (error) {
    console.warn(`  utm_slug update failed for "${title}": ${error.message}`);
    continue;
  }
  if ((count ?? 0) > 0) slugUpdates += count;
  else console.warn(`  no row matched: "${title}"`);
}
console.log(`youtube_videos.utm_slug: updated ${slugUpdates} rows`);

// 2. Parse Tally CSV and upsert into workshop_signups.
const raw = fs.readFileSync(CSV_FILE, "utf8").replace(/^﻿/, "");
const rows = parse(raw, { columns: true, skip_empty_lines: true });

const submissions = rows.map((r) => ({
  submission_id: r["Submission ID"],
  submitted_at: new Date(r["Submitted at"]).toISOString(),
  first_name: r["First Name"] ?? "",
  last_name: r["Last Name"] ?? "",
  email: r["Work email address"] ?? "",
  company: r["Where do you work?"] ?? "",
  utm_source: r["utm_source"] ?? "",
  utm_medium: r["utm_medium"] ?? "",
  utm_campaign: r["utm_campaign"] ?? "",
  utm_content: r["utm_content"] ?? "",
  notes: r["Anything else you want to share?"] ?? "",
}));

const { error: upErr } = await supabase
  .from("workshop_signups")
  .upsert(submissions, { onConflict: "submission_id" });
if (upErr) {
  console.error(`workshop_signups upsert failed: ${upErr.message}`);
  process.exit(1);
}
console.log(`workshop_signups: upserted ${submissions.length} rows`);

const tagged = submissions.filter((s) => s.utm_content);
console.log(`  → ${tagged.length} submissions have utm_content`);
const byContent = new Map();
for (const s of tagged) byContent.set(s.utm_content, (byContent.get(s.utm_content) ?? 0) + 1);
for (const [k, v] of byContent) console.log(`     ${k}: ${v}`);
