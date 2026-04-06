import { bulkUpsert } from "./db";

export function seedDatabase() {
  // YouTube Weekly
  bulkUpsert("youtube_weekly", [
    { week: "Dec 7–13", month: "Dec", views: 5422, days: 7, current: 0 },
    { week: "Dec 14–20", month: "Dec", views: 14495, days: 7, current: 0 },
    { week: "Dec 21–27", month: "Dec", views: 6912, days: 7, current: 0 },
    { week: "Dec 28–Jan 3", month: "Dec", views: 9026, days: 7, current: 0 },
    { week: "Jan 4–10", month: "Jan", views: 16706, days: 7, current: 0 },
    { week: "Jan 11–17", month: "Jan", views: 21112, days: 7, current: 0 },
    { week: "Jan 18–24", month: "Jan", views: 17239, days: 7, current: 0 },
    { week: "Jan 25–31", month: "Jan", views: 26838, days: 7, current: 0 },
    { week: "Feb 1–7", month: "Feb", views: 21940, days: 7, current: 0 },
    { week: "Feb 8–14", month: "Feb", views: 14972, days: 7, current: 0 },
    { week: "Feb 15–21", month: "Feb", views: 24647, days: 7, current: 0 },
    { week: "Feb 22–28", month: "Feb", views: 22634, days: 7, current: 0 },
    { week: "Mar 1–7", month: "Mar", views: 27008, days: 7, current: 0 },
    { week: "Mar 8–14", month: "Mar", views: 34689, days: 7, current: 0 },
    { week: "Mar 15–21", month: "Mar", views: 27228, days: 7, current: 0 },
    { week: "Mar 22–28", month: "Mar", views: 23088, days: 7, current: 0 },
    { week: "Mar 29–Apr 4", month: "Mar", views: 18331, days: 7, current: 0 },
    { week: "Apr 5", month: "Apr", views: 1470, days: 1, current: 1 },
  ], ["week"]);

  // YouTube Monthly
  bulkUpsert("youtube_monthly", [
    { month: "Dec 2025", views: 51268, days: 31, daily_avg: 1654, mom_pct: null, note: "Baseline", partial: 0, projected: null },
    { month: "Jan 2026", views: 86440, days: 31, daily_avg: 2788, mom_pct: 68.6, note: "Design System video compounding", partial: 0, projected: null },
    { month: "Feb 2026", views: 84193, days: 28, daily_avg: 3007, mom_pct: 7.8, note: "Daily avg grew despite raw dip (3 fewer days)", partial: 0, projected: null },
    { month: "Mar 2026", views: 119474, days: 31, daily_avg: 3854, mom_pct: 28.2, note: "Best month ever — 4 long-form videos", partial: 0, projected: null },
    { month: "Apr 2026", views: 1470, days: 1, daily_avg: 1470, mom_pct: null, note: "Apr 1–5 only (GitHub video very new)", partial: 1, projected: 74040 },
  ], ["month"]);

  // YouTube Videos
  bulkUpsert("youtube_videos", [
    { published: "Nov 28, 2025", title: "I Built My Entire Design System in 4 Hours With AI", views: 49004, impressions: 390162, ctr: 8.09, subs: 982, note: "Anchor video — still compounding" },
    { published: "Mar 10, 2026", title: "Figma Wireframes Are Dead. Here's How Product Teams Are Replacing Them", views: 11656, impressions: 115113, ctr: 6.31, subs: 277, note: "" },
    { published: "Mar 17, 2026", title: "Build Your Entire Presentation in Claude Code and Ship it as HTML", views: 5020, impressions: 44771, ctr: 5.07, subs: 51, note: "" },
    { published: "Mar 24, 2026", title: "The AI Design Tool That Figma Doesn't Want You to See", views: 3901, impressions: 40902, ctr: 6.02, subs: 59, note: "" },
    { published: "Mar 31, 2026", title: "GitHub for Designers: Everything You Need to Know", views: 1825, impressions: 21424, ctr: 5.20, subs: 24, note: "6 days old" },
  ], ["title"]);

  // Shorts
  bulkUpsert("shorts_weekly", [
    { week: "Dec 7–13", clips: 1, total_views: 787, avg_per_clip: 787, impressions: 5441, note: "" },
    { week: "Jan 4–10", clips: 4, total_views: 4192, avg_per_clip: 1048, impressions: 14939, note: "" },
    { week: "Jan 11–17", clips: 6, total_views: 4317, avg_per_clip: 719, impressions: 9656, note: "" },
    { week: "Jan 18–24", clips: 4, total_views: 2639, avg_per_clip: 659, impressions: 9775, note: "" },
    { week: "Jan 25–31", clips: 5, total_views: 4350, avg_per_clip: 870, impressions: 18072, note: "" },
    { week: "Feb 1–7", clips: 7, total_views: 4087, avg_per_clip: 583, impressions: 13512, note: "" },
    { week: "Feb 15–21", clips: 8, total_views: 5575, avg_per_clip: 696, impressions: 24195, note: "" },
    { week: "Feb 22–28", clips: 9, total_views: 1708, avg_per_clip: 189, impressions: 6415, note: "9 clips dragged avg down" },
    { week: "Mar 1–7", clips: 6, total_views: 5831, avg_per_clip: 971, impressions: 46510, note: "" },
    { week: "Mar 8–14", clips: 4, total_views: 1676, avg_per_clip: 419, impressions: 3672, note: "" },
    { week: "Mar 15–21", clips: 5, total_views: 4721, avg_per_clip: 944, impressions: 29045, note: "" },
    { week: "Mar 22–28", clips: 4, total_views: 4193, avg_per_clip: 1048, impressions: 11922, note: "AI Design Tool batch" },
    { week: "Mar 29–Apr 4", clips: 4, total_views: 3335, avg_per_clip: 833, impressions: 8256, note: "GitHub for Designers batch" },
  ], ["week"]);

  // LinkedIn Dianne Posts
  bulkUpsert("linkedin_dianne_posts", [
    { week: "Dec 7–13", date: "Dec 1", post_time: "6:56pm", impressions: 14801, reactions: 133, comments: 10, reposts: 4, saves: 163, followers: 119, note: "Launch post" },
    { week: "Dec 14–20", date: "Dec 8", post_time: "7:43pm", impressions: 35027, reactions: 217, comments: 3, reposts: 24, saves: 476, followers: 179, note: "BREAKOUT — #4 all time" },
    { week: "Dec 21–27", date: "Dec 15+23", post_time: "—", impressions: 23722, reactions: 216, comments: 6, reposts: 14, saves: 186, followers: 80, note: "2 posts (Dec 15 + Dec 23 holiday)" },
    { week: "Jan 25–31", date: "Jan 29", post_time: "—", impressions: 38342, reactions: 446, comments: 9, reposts: 33, saves: 530, followers: 229, note: "BREAKOUT — #1 all time" },
    { week: "Feb 1–7", date: "Feb 4", post_time: "7:11pm", impressions: 3196, reactions: 59, comments: 5, reposts: 1, saves: 13, followers: 3, note: "Evening post — underperformed" },
    { week: "Feb 15–21", date: "Feb 16+19", post_time: "—", impressions: 5700, reactions: 96, comments: 5, reposts: 5, saves: 56, followers: 9, note: "Feb 16 8:47pm (worst) + Feb 19 2:41pm" },
    { week: "Feb 22–28", date: "Feb 25", post_time: "8:22pm", impressions: 4437, reactions: 87, comments: 4, reposts: 3, saves: 60, followers: 18, note: "Evening post" },
    { week: "Mar 1–7", date: "Mar 4", post_time: "2:28pm", impressions: 4332, reactions: 101, comments: 8, reposts: 2, saves: 25, followers: 5, note: "Workshop launch post" },
    { week: "Mar 8–14", date: "Mar 11", post_time: "2:12pm", impressions: 17390, reactions: 170, comments: 7, reposts: 9, saves: 173, followers: 64, note: "BREAKOUT — #3 all time" },
    { week: "Mar 15–21", date: "Mar 18", post_time: "1:25pm", impressions: 3113, reactions: 68, comments: 4, reposts: 1, saves: 24, followers: 4, note: "Settled" },
    { week: "Mar 22–28", date: "Mar 26", post_time: "5:21pm", impressions: 18166, reactions: 180, comments: 6, reposts: 6, saves: 144, followers: 72, note: "BREAKOUT — #2 all time" },
    { week: "Mar 29–Apr 4", date: "Apr 1", post_time: "7:35pm", impressions: 2946, reactions: 57, comments: 4, reposts: 4, saves: 21, followers: 2, note: "Evening post — GitHub for Designers" },
  ], ["week", "date"]);

  // LinkedIn Dianne Monthly
  bulkUpsert("linkedin_dianne_monthly", [
    { month: "Dec 2025", impressions: 73551, saves: 825, posts: 3, mom_imp: null, mom_saves: null, partial: 0, note: "" },
    { month: "Jan 2026", impressions: 38342, saves: 530, posts: 2, mom_imp: -47.9, mom_saves: -35.8, partial: 0, note: "5-week gap reset algorithm" },
    { month: "Feb 2026", impressions: 17333, saves: 129, posts: 3, mom_imp: -54.8, mom_saves: -75.7, partial: 0, note: "Evening posts compounded damage" },
    { month: "Mar 2026", impressions: 38669, saves: 341, posts: 3, mom_imp: 123.1, mom_saves: 164.3, partial: 0, note: "2 breakout posts in one month" },
    { month: "Apr 2026", impressions: 2946, saves: 21, posts: 1, mom_imp: null, mom_saves: null, partial: 1, note: "Apr 1 only — evening post" },
  ], ["month"]);

  // LinkedIn TDP Page
  bulkUpsert("linkedin_tdp_weekly", [
    { week: "Feb 15–21", impressions: 667, clicks: 301, ctr: 45.13, reactions: 8, note: "Design Hack post" },
    { week: "Feb 22–28", impressions: 2217, clicks: 1252, ctr: 56.50, reactions: 7, note: "Product designer 2026 post" },
    { week: "Mar 1–7", impressions: 1563, clicks: 507, ctr: 32.40, reactions: 21, note: "Workshop post (Mar 4)" },
    { week: "Mar 8–14", impressions: 564, clicks: 229, ctr: 40.60, reactions: 2, note: "No post" },
    { week: "Mar 15–21", impressions: 454, clicks: 163, ctr: 35.90, reactions: 6, note: "No post" },
    { week: "Mar 22–28", impressions: 780, clicks: 177, ctr: 22.70, reactions: 18, note: "Post Mar 22 — spiked Mar 23" },
    { week: "Mar 29–Apr 4", impressions: 199, clicks: 21, ctr: 10.60, reactions: 0, note: "No post" },
  ], ["week"]);

  // Cold Email Campaigns
  bulkUpsert("cold_email_campaigns", [
    { campaign: "B2B SaaS - USA - Clay - Zain", status: "Completed", window: "120 days", sent: 4453, contacted: 2648, replies: 28, reply_rate: 1.06, interested: 7, note: "Includes the 'very AI' reply to website revamp." },
    { campaign: "VC Founders - USA/Canada - Clay", status: "Paused", window: "60 days", sent: 4486, contacted: 2481, replies: 64, reply_rate: 2.58, interested: 6, note: "Best reply rate in the dataset. 6 interested leads." },
    { campaign: "Healthcare - B2B SaaS - USA/Canada", status: "Paused", window: "Last 10 days", sent: 219, contacted: 204, replies: 1, reply_rate: 0.49, interested: 0, note: "Mar 27–Apr 6" },
    { campaign: "NEW OFFER - B2B SaaS - USA - Zain", status: "Completed", window: "Last 10 days", sent: 3271, contacted: 2770, replies: 5, reply_rate: 0.18, interested: 0, note: "Weakest reply rate. Offer not landing." },
    { campaign: "NEW INBOXES - NEW OFFER - B2B SaaS - Zain", status: "Paused", window: "Last 10 days", sent: 180, contacted: 180, replies: 2, reply_rate: 1.11, interested: 0, note: "Mar 27–Apr 6" },
    { campaign: "New inboxes - Healthcare - B2B SaaS", status: "Active", window: "Last 10 days", sent: 321, contacted: 188, replies: 10, reply_rate: 5.32, interested: 0, note: "Highest reply rate — watch this one. Still 0 interested." },
  ], ["campaign"]);
}
