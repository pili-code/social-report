---
name: update-gtm-data
description: Weekly playbook for refreshing the GTM hub. Ingests fresh exports from YouTube Studio, LinkedIn (Dianne posts + TDP page), X/Twitter, and Tally workshop signups; runs the relevant upload scripts; verifies data integrity (no duplicate weeks, monthly totals match Studio); commits and pushes. Use when the user asks to update / refresh the GTM dashboard or says "let's do the weekly update".
disable-model-invocation: true
allowed-tools: Bash Edit Read Write
argument-hint: [channel?]
---

# Weekly GTM data update

You are walking the user through a weekly refresh of the GTM hub. Move **one channel at a time** — this user prefers stepwise confirmation over batch runs. Don't run multiple uploads in parallel.

If `$ARGUMENTS` is non-empty, treat it as the channel to start with (`youtube`, `linkedin-dianne`, `linkedin-tdp`, `twitter`, or `workshop-signups`). Otherwise, list channels and ask which to update first.

## Channels and their upload scripts

| Channel | Source file pattern | Script | Tables affected |
|---|---|---|---|
| YouTube | `~/Downloads/Content YYYY-MM-DD_YYYY-MM-DD The Design Project.zip` | `scripts/upload-youtube.mjs` | `youtube_weekly`, `youtube_monthly`, `youtube_videos`, `shorts_weekly` |
| LinkedIn Dianne | `~/Downloads/SinglePostAnalytics_Dianne Alter_*.xlsx` (one per post) | `scripts/upload-linkedin-dianne-post.mjs` + `scripts/rebuild-linkedin-monthly.mjs` | `linkedin_dianne_posts`, `linkedin_dianne_monthly` |
| LinkedIn TDP page | `~/Downloads/thedesignproject_content_*.xls` | `scripts/upload-linkedin-tdp.mjs` | `linkedin_tdp_weekly` |
| X / Twitter | `~/Downloads/account_overview_analytics*.csv` | `scripts/upload-twitter.mjs` | `twitter_weekly` (wipes + rebuilds) |
| Workshop signups | `~/Downloads/Sign up for our design-to-code workshop!_Submissions_*.csv` | `scripts/upload-workshop-signups.mjs` | `workshop_signups`, plus `youtube_videos.utm_slug` |
| Community funnel | `~/Downloads/download (N).csv` (GA4) + `~/Downloads/Clarity_The_Design_Project_*.csv` | inline upsert, see "Community funnel" below | `community_funnel_weekly` |

## Workflow per channel

For each channel the user wants to update:

1. **Ask for the export file path** — don't assume. Files in `~/Downloads/` accumulate; the user knows which is the new one.
2. **Verify the file exists** with `ls -la <path>`.
3. **Update the script's hardcoded source path** if needed:
   - `upload-youtube.mjs` has `const DIR = "..."` — point at the unzipped export folder.
   - `upload-twitter.mjs` has `const CSV_FILE = "..."` — point at the new CSV.
   - `upload-linkedin-tdp.mjs` has the file path inside `parseTDP(...)` — update there.
   - `upload-workshop-signups.mjs` has `const CSV_FILE = "..."`.
   - For LinkedIn Dianne, ask for a short topic tag and optional content note, then run `node scripts/upload-linkedin-dianne-post.mjs <file> <topic_tag> <content_note>`.
4. **Unzip if it's a `.zip`** to a folder of the same name.
5. **Run the script** with `node scripts/<name>.mjs`.
6. **Verify the output** — print row counts, look for new vs upserted ratio.
7. **Then move to the next channel** (after user confirms).

## YouTube — known pitfalls

The YouTube weekly upsert is keyed on the `week` column, which is computed from the **min/max date in the data** for that week, not the calendar Sun→Sat range. When a new export starts/ends mid-week, partial-week labels (`Apr 19–Apr 21, 2026`) and full-week labels (`Apr 19–Apr 25, 2026`) coexist as **separate rows** instead of upserting.

**This is now auto-healed.** `scripts/upload-youtube.mjs` runs a `dedupeWeekly()` pass right after the weekly upsert: it groups `youtube_weekly` rows by week-start (month-day + year), and when more than one shares a start it keeps the row with the most `days` and deletes the rest. The script prints `→ N overlapping weekly row(s) removed` on each run. Monthly totals are unaffected (they're rebuilt from daily `Totals.csv`, not from weekly rows), so no monthly rebuild is needed after dedup.

You normally don't need to do anything here. To spot-check after an upload, confirm the dedup line read `0` (or removed exactly the stale partials you expected), and optionally list the latest weeks:

```bash
node --input-type=module -e "
import dotenv from 'dotenv'; import path from 'node:path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
import('@supabase/supabase-js').then(async ({ createClient }) => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});
  const { data } = await sb.from('youtube_weekly').select('id, week, days, views').order('id');
  data.forEach(r => console.log(r.id, r.week, 'days='+r.days, 'views='+r.views));
});
"
```

The only legitimate non-7-day rows are the **first** week (cutoff boundary) and the **current in-progress** week. Any other short row sharing a start with a 7-day row is a stale partial — and `dedupeWeekly()` will have already removed it. If you ever need to disable this (e.g. intentionally keeping a partial), remove the `dedupeWeekly()` call after the weekly upsert.

### Mixed-shape upsert error on `youtube_monthly`

If `node scripts/upload-youtube.mjs` fails with:

```
Error: youtube_monthly: null value in column "id" of relation "youtube_monthly" violates not-null constraint
```

…it's because the upsert batch contains a mix of existing rows (which carry their `id` from the prior fetch) and a brand-new month with no `id`. Postgres unifies columns across the VALUES list and writes `null` into the missing slots; the `id bigserial` default never fires because the row literally sends `id: null`.

The `upsert(...)` helper in `scripts/upload-youtube.mjs` strips `id` before sending — same pattern as `lib/db.ts`'s `stripMeta`. If you ever revert or rewrite that helper, keep the `id` strip:

```js
const { id: _id, ...rest } = r;
seen.set(k, rest);
```

This affects any monthly aggregate run that introduces a new calendar month (typically the first run of a new month).

## YouTube monthly aggregation

`youtube_monthly` is rebuilt from `Totals.csv` daily rows aggregated by **calendar month** (not by week-start month). This matches YouTube Studio exactly. The `upload-youtube.mjs` script handles this; if you ever need to recompute manually, use `Totals.csv` and group by `MONTHS[d.getUTCMonth()] + ' ' + year`.

Sanity check after upload:
```
Apr 2026 in DB should match YouTube Studio → Channel analytics → Last 28 days
```
If they diverge by more than ~1%, investigate.

## LinkedIn Dianne — post upsert

Each post is its own xlsx file. Sheet name is `Post analytics`. Pattern:

```bash
node scripts/upload-linkedin-dianne-post.mjs \
  "/Users/pilitdp/Downloads/SinglePostAnalytics_Dianne Alter_....xlsx" \
  "ai product design" \
  "Short note about what the post argues or promotes"
```

The script stores:
- `topic_tag`, `content_note`, and `post_url`
- impressions
- members reached (shown as views/reach in the dashboard)
- social engagements
- engagement rate
- reactions, comments, reposts, saves, sends, link engagements, premium button engagements, and followers

After upserting any new posts, **always** run `node scripts/rebuild-linkedin-monthly.mjs` to refresh `linkedin_dianne_monthly` MoM percentages.

The same `Post Date` reuploaded with fresher numbers will **update in place** (key is `week,date`). Use this for refreshing impressions on older posts.

If the user is unsure which posts are new, query the latest:
```bash
node --input-type=module -e "...select('date').order('date',{ascending:false}).limit(5)..."
```
and compare to LinkedIn.

## Twitter — wipe and rebuild

`upload-twitter.mjs` deletes all rows in `twitter_weekly` and rebuilds from the daily CSV. This is intentional — the script re-aggregates by Sun→Sat week using a `2025-10-01` cutoff. Just run it; no incremental logic needed.

## Workshop signups

`upload-workshop-signups.mjs` does two things:
1. Sets `utm_slug` on each `youtube_videos` row using the `VIDEO_SLUGS` map at the top of the script.
2. Upserts all rows from the Tally CSV into `workshop_signups` (keyed on `submission_id`).

When a new video is published:
- Add it to `VIDEO_SLUGS` in the script.
- Update the YouTube description with `https://tally.so/r/WOPNPP?utm_source=youtube&utm_medium=video&utm_campaign=<slug>`.
- (Note: signups land in `utm_campaign`, not `utm_content` — the dashboard's Video Log table reads `utm_campaign` first, then falls back to `utm_content`.)

## Community funnel

Tracks the TDP Community launch funnel per the spec from Alex (May 2026 GTM meeting):

```
Views (X) → Visits (Y) cr1% → Clicks (Z) → Conversions ($m) cr2%
```

Stage 1 attribution is the **launch video only** — the most recent video tagged with `utm_campaign=community_launch&utm_content=launch_video`. Backfill videos (older content with descriptions retroactively pointing at /community/) are tracked as a side stat (lifetime views + attributed visits) but not part of the funnel itself.

### Required exports each week

1. **GA4** — Reports → User acquisition → filtered to `landing page contains "/community/"` with breakdown columns: Session source/medium, Session manual campaign name, Session manual ad content, Country, Sessions, Active users, Key events, Engagement rate. Date range = the week being updated. Save as `~/Downloads/download (N).csv`.
2. **Clarity** — Recordings filtered to `Visited URL starts with https://designproject.io/community/`. Date range = the week. Export to CSV. Used for cross-checking and qualitative review (not automatically aggregated).

### Computing the row

Open the GA4 CSV. The columns are `Session source / medium, Session manual campaign name, Session manual ad content, Country, Sessions, Active users, Key events, Engagement rate`. Aggregate sessions into:

| Bucket | Filter |
|---|---|
| `launch_visits` | `campaign = community_launch` |
| `backfill_visits` | `campaign = community_backfill` |
| `direct_visits` | `source = (direct) / (none)` |
| `referral_visits` | source contains `referral` or `youtube.com` |
| `other_visits` | everything else |
| `total_visits` | sum of above |

For Stage 1 (`launch_views`), look up the **most recent** YouTube video tagged with `community_launch` (Pili confirms which one — usually that week's or the prior week's main video) and read `views` from `youtube_videos`. Use only the views that accumulated **after** the description went live; for the first row this is lifetime views since launch is recent.

For `backfill_views`, sum lifetime views for each video referenced in `community_backfill` content slugs. The slug naming (e.g. `i_built_my_entire_design_system_in_4_hou`) is truncated; match by checking the YouTube description manually.

### Seeding the first row

```bash
node scripts/_seed-community-funnel.mjs
```

That script has the Apr 8 – May 5 numbers hardcoded. After the first run, edit the constants for each subsequent week (or copy the upsert pattern inline).

### Click + conversion tracking is not wired

`clicks` and `conversions` will be 0 until:
1. A GA4 key event fires when a user clicks the "Join community" CTA (configure in GA4 admin → Events → Mark as key event).
2. A sync from the community billing system (Whop / Stripe / wherever subs are taken) populates `conversions` and `revenue_cents`.

Until then, the dashboard shows a yellow "Tracking gap" callout under the funnel viz. cr2 stays null.

### Schema reminder

The `community_funnel_weekly` table is unique on `week`. Use `upsert(row, { onConflict: 'week' })`. The `source_breakdown_json` column stores the per-source visit breakdown as a JSON-encoded array; the dashboard reads this to render the source-attribution table.

## After all channels are updated

1. **Sanity-check the dashboard** at https://gtm-app-lovat.vercel.app/dashboard — open YouTube tab, confirm the latest week appears in the Weekly Detail and the latest video appears in the Video Log.
2. **Show the user a summary** — bullet list of what changed (rows added/upserted per table).
3. **Ask before committing.** If any script files were modified (DIR/CSV_FILE constants, VIDEO_SLUGS map), include them. Use a clean commit message.
4. **Don't push automatically.** Confirm with the user before `git push`.

## Channel-skipping

It's normal for a week to have no updates for some channels (e.g. TDP page didn't post anything, no new long-form video). Skip them — don't force a re-run if there's no new file.

## Diagnosing a broken dashboard

If the production dashboard shows "Loading..." after an update:
- `curl https://gtm-app-lovat.vercel.app/api/data` — if 500, check Vercel env vars match `.env.local`.
- If 200 but tables empty, the env vars probably point at the wrong Supabase project.
- If 200 with data but UI hangs, check browser console for chart-render errors (often caused by overlapping weekly rows — see "YouTube — known pitfalls" above).

## What NOT to do

- Don't change dashboard structure (sections, columns, layout) as part of a data update. Keep ingestion separate from UI changes.
- Don't run `git push --force` or amend pushed commits.
- Don't `git add -A` — stage individual modified files so you don't accidentally commit unrelated work in progress.
- Don't write the user's Supabase service role key to chat history.
