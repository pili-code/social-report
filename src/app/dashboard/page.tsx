"use client";

import { Suspense, useEffect, useState, Component, Fragment, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { YTWeeklyChart, YTMonthlySparkline, ShortsChart, DianneChart } from "@/components/Charts";
import { YouTubeDrivers, DianneDrivers, TDPDrivers, XDrivers, ShortsDrivers } from "@/components/ContentDrivers";

class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg">Chart error: {this.state.error}</div>;
    }
    return this.props.children;
  }
}

interface DataSet {
  youtube_weekly: Array<{ week: string; month: string; views: number; current: number }>;
  youtube_monthly: Array<{ month: string; views: number; days: number; daily_avg: number; mom_pct: number | null; note: string; partial: number; projected: number | null }>;
  youtube_videos: Array<{ published: string; title: string; views: number; impressions: number; ctr: number; subs: number; note: string; utm_slug: string | null }>;
  shorts_weekly: Array<{ week: string; clips: number; total_views: number; avg_per_clip: number; impressions: number; note: string }>;
  linkedin_dianne_posts: Array<{ week: string; date: string; impressions: number; reactions: number; comments: number; saves: number; followers: number; note: string }>;
  linkedin_dianne_monthly: Array<{ month: string; impressions: number; saves: number; posts: number; mom_imp: number | null; mom_saves: number | null; partial: number; note: string }>;
  linkedin_tdp_weekly: Array<{ week: string; impressions: number; clicks: number; ctr: number; reactions: number; note: string }>;
  cold_email_campaigns: Array<{ campaign: string; status: string; window: string; sent: number; contacted: number; replies: number; reply_rate: number; interested: number; note: string }>;
  twitter_weekly: Array<{ week: string; impressions: number; likes: number; engagements: number; bookmarks: number; shares: number; follows: number; unfollows: number; replies: number; reposts: number; profile_visits: number; video_views: number; note: string }>;
  workshop_signups: Array<{ submission_id: string; submitted_at: string; utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string }>;
}

const UTM_TRACKING_START = new Date(Date.UTC(2026, 3, 22)); // 2026-04-22

const fmt = (n: number) => n.toLocaleString();

function Trend({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value === null) return <span className="text-gray-400">&mdash;</span>;
  const up = value > 0;
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold font-mono ${up ? "bg-[#D5F5E3] text-[#1E8449]" : "bg-[#FADBD8] text-[#C0392B]"}`}>
      {up ? "▲" : "▼"} {Math.abs(value)}{suffix}
    </span>
  );
}

function SectionHeader({ title, color, badge }: { title: string; color: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 pl-3.5" style={{ borderLeft: `4px solid ${color}` }}>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {badge && <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded text-white" style={{ background: color }}>{badge}</span>}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96 text-gray-400">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

type TimeRange = "4w" | "3m" | "6m" | "all";
const RANGE_LABELS: Record<TimeRange, string> = { "4w": "Last 4 weeks", "3m": "Last 3 months", "6m": "Last 6 months", all: "All time" };

function parseWeekStart(week: string): Date | null {
  // "Oct 5–Oct 11, 2025" (preferred) or legacy "Mar 29–Apr 4" without year
  const yearMatch = week.match(/,\s*(\d{4})\s*$/);
  const clean = yearMatch ? week.slice(0, -yearMatch[0].length) : week;
  const left = clean.split("–")[0].trim();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = left.match(/^(\w{3})\s+(\d+)$/);
  if (!m) return null;
  const mi = MONTHS.indexOf(m[1]);
  if (mi < 0) return null;
  let year: number;
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
  } else {
    const now = new Date();
    year = mi > now.getUTCMonth() ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  }
  return new Date(Date.UTC(year, mi, parseInt(m[2])));
}
function parseMonth(month: string): Date | null {
  const [name, year] = month.split(" ");
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mi = MONTHS.indexOf(name);
  if (mi < 0 || !year) return null;
  return new Date(Date.UTC(parseInt(year), mi, 1));
}

function cutoff(range: TimeRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  const c = new Date(now);
  if (range === "4w") c.setUTCDate(c.getUTCDate() - 28);
  else if (range === "3m") c.setUTCMonth(c.getUTCMonth() - 3);
  else if (range === "6m") c.setUTCMonth(c.getUTCMonth() - 6);
  return c;
}

function filterByWeek<T extends { week: string }>(rows: T[], range: TimeRange): T[] {
  const c = cutoff(range);
  if (!c) return rows;
  return rows.filter((r) => {
    const d = parseWeekStart(r.week);
    return d === null || d >= c;
  });
}
function filterByMonth<T extends { month: string }>(rows: T[], range: TimeRange): T[] {
  const c = cutoff(range);
  if (!c) return rows;
  return rows.filter((r) => {
    const d = parseMonth(r.month);
    return d === null || d >= c;
  });
}
function filterByDate<T extends { date?: string; published?: string }>(rows: T[], range: TimeRange, key: "date" | "published"): T[] {
  const c = cutoff(range);
  if (!c) return rows;
  return rows.filter((r) => {
    const raw = r[key];
    if (!raw) return true;
    const d = new Date(raw);
    return isNaN(d.getTime()) || d >= c;
  });
}

function FilterBar({ range, onChange }: { range: TimeRange; onChange: (r: TimeRange) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 mb-5 flex items-center gap-3 text-[12px]">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Time range</span>
      <div className="flex gap-1">
        {(Object.keys(RANGE_LABELS) as TimeRange[]).map((r) => (
          <button
            key={r}
            onClick={() => onChange(r)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              range === r ? "bg-[#2E86AB] text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>
    </div>
  );
}

function DashboardContent() {
  const [rawData, setRawData] = useState<DataSet | null>(null);
  const [range, setRange] = useState<TimeRange>("6m");
  const searchParams = useSearchParams();
  const section = searchParams.get("tab") || "overview";

  useEffect(() => {
    fetch("/api/data").then(r => r.json()).then(setRawData);
  }, []);

  if (!rawData) return <div className="flex items-center justify-center h-96 text-gray-400">Loading...</div>;

  // Chronological sort helpers
  const sortByWeek = <T extends { week: string }>(arr: T[]): T[] =>
    [...arr].sort((a, b) => {
      const da = parseWeekStart(a.week)?.getTime() ?? 0;
      const db = parseWeekStart(b.week)?.getTime() ?? 0;
      return da - db;
    });
  const sortByMonth = <T extends { month: string }>(arr: T[]): T[] =>
    [...arr].sort((a, b) => {
      const da = parseMonth(a.month)?.getTime() ?? 0;
      const db = parseMonth(b.month)?.getTime() ?? 0;
      return da - db;
    });
  const sortByDate = <T extends Record<string, unknown>>(arr: T[], key: string): T[] =>
    [...arr].sort((a, b) => {
      const va = a[key] ? new Date(a[key] as string).getTime() : 0;
      const vb = b[key] ? new Date(b[key] as string).getTime() : 0;
      return (isNaN(va) ? 0 : va) - (isNaN(vb) ? 0 : vb);
    });

  // Apply range filter + chronological sort to time-series tables
  const data: DataSet = {
    ...rawData,
    youtube_weekly: sortByWeek(filterByWeek(rawData.youtube_weekly, range)),
    youtube_monthly: sortByMonth(filterByMonth(rawData.youtube_monthly, range)),
    youtube_videos: sortByDate(filterByDate(rawData.youtube_videos, range, "published"), "published"),
    shorts_weekly: sortByWeek(filterByWeek(rawData.shorts_weekly, range)),
    linkedin_dianne_posts: sortByDate(filterByDate(rawData.linkedin_dianne_posts, range, "date"), "date"),
    linkedin_dianne_monthly: sortByMonth(filterByMonth(rawData.linkedin_dianne_monthly, range)),
    linkedin_tdp_weekly: sortByWeek(filterByWeek(rawData.linkedin_tdp_weekly, range)),
    twitter_weekly: rawData.twitter_weekly ? sortByWeek(filterByWeek(rawData.twitter_weekly, range)) : [],
  };

  const ytMonthly = data.youtube_monthly;
  const latestYTMonthly = ytMonthly[ytMonthly.length - 1];
  const marYT = ytMonthly.find(m => m.month === "Mar 2026") ?? latestYTMonthly;
  const bestDiannePost = [...data.linkedin_dianne_posts].sort((a, b) => b.saves - a.saves)[0];
  const bestEmailRate = [...data.cold_email_campaigns].sort((a, b) => b.reply_rate - a.reply_rate)[0];
  const totalClips = data.shorts_weekly.reduce((s, w) => s + w.clips, 0);
  const currentYTWeek = data.youtube_weekly[data.youtube_weekly.length - 1];
  const currentShorts = data.shorts_weekly[data.shorts_weekly.length - 1];
  const currentDianne = data.linkedin_dianne_posts[data.linkedin_dianne_posts.length - 1];
  const currentTDP = data.linkedin_tdp_weekly[data.linkedin_tdp_weekly.length - 1];
  const currentX = data.twitter_weekly?.[data.twitter_weekly.length - 1];

  // Best performers in the CURRENT month (from latest youtube_monthly.month if valid)
  const currentMonth = latestYTMonthly?.month ?? "Apr 2026";
  const monthMatch = (w: string) => {
    // week strings like "Apr 5–Apr 11, 2026" — match by month token AND year
    const [name, year] = currentMonth.split(" ");
    const wYearMatch = w.match(/,\s*(\d{4})\s*$/);
    if (wYearMatch && wYearMatch[1] !== year) return false;
    return w.startsWith(name) || w.includes(`–${name}`);
  };
  const dateInMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const [name, year] = currentMonth.split(" ");
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return d.getUTCMonth() === MONTHS.indexOf(name) && d.getUTCFullYear() === parseInt(year);
  };

  const ytVideosThisMonth = data.youtube_videos.filter((v) => v.published && dateInMonth(v.published));
  const bestYTVideoThisMonth = ytVideosThisMonth.sort((a, b) => b.views - a.views)[0];
  const shortsThisMonth = data.shorts_weekly.filter((w) => monthMatch(w.week));
  const bestShortsWeek = shortsThisMonth.sort((a, b) => b.total_views - a.total_views)[0];
  const dianneThisMonth = data.linkedin_dianne_posts.filter((p) => dateInMonth(p.date));
  const bestDianneThisMonth = dianneThisMonth.sort((a, b) => b.impressions - a.impressions)[0];
  const tdpThisMonth = data.linkedin_tdp_weekly.filter((w) => monthMatch(w.week));
  const bestTDPWeek = tdpThisMonth.sort((a, b) => b.impressions - a.impressions)[0];
  const xThisMonth = data.twitter_weekly?.filter((w) => monthMatch(w.week)) ?? [];
  const bestXWeek = xThisMonth.sort((a, b) => b.engagements - a.engagements)[0];

  return (
    <div>
      <FilterBar range={range} onChange={setRange} />

      {/* ===== OVERVIEW ===== */}
      {section === "overview" && (
        <div>
          <SectionHeader title="Overview" color="#2E86AB" badge={currentMonth} />

          {/* This week callout */}
          <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-[#117A65] p-5 mb-6">
            <h3 className="text-[13px] font-bold text-[#117A65] uppercase tracking-wider mb-3">
              This Week &mdash; {currentYTWeek?.week} <span className="inline-block bg-[#2E86AB] text-white px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ml-2">Partial</span>
            </h3>
            <div className="flex gap-7 flex-wrap">
              {[
                { label: "YT Long-form", val: fmt(currentYTWeek?.views || 0) },
                { label: "Shorts", val: fmt(currentShorts?.total_views || 0) },
                { label: "LI Dianne Imp.", val: fmt(currentDianne?.impressions || 0) },
                { label: "TDP Page Imp.", val: fmt(currentTDP?.impressions || 0) },
                { label: "X Impressions", val: fmt(currentX?.impressions || 0) },
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{s.label}</div>
                  <div className="font-mono text-xl font-bold mt-0.5">{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Best of the Month per Channel */}
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Best of {currentMonth}</h3>
            <div className="flex-1 border-t border-gray-200" />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-7">
            {[
              {
                label: "YouTube", color: "#C0392B",
                has: !!bestYTVideoThisMonth,
                metric: bestYTVideoThisMonth ? fmt(bestYTVideoThisMonth.views) + " views" : "No new video",
                title: bestYTVideoThisMonth?.title ?? "—",
                sub: bestYTVideoThisMonth ? `CTR ${bestYTVideoThisMonth.ctr}% · +${fmt(bestYTVideoThisMonth.subs)} subs` : "",
              },
              {
                label: "Shorts", color: "#E67E22",
                has: !!bestShortsWeek,
                metric: bestShortsWeek ? fmt(bestShortsWeek.total_views) + " views" : "No shorts",
                title: bestShortsWeek ? `${bestShortsWeek.clips} clips · ${bestShortsWeek.week}` : "—",
                sub: bestShortsWeek ? `${fmt(bestShortsWeek.avg_per_clip)} avg/clip` : "",
              },
              {
                label: "LinkedIn: Dianne", color: "#0077B5",
                has: !!bestDianneThisMonth,
                metric: bestDianneThisMonth ? fmt(bestDianneThisMonth.impressions) + " imp" : "No post",
                title: bestDianneThisMonth ? `${bestDianneThisMonth.date} · ${bestDianneThisMonth.reactions} reactions` : "—",
                sub: bestDianneThisMonth ? `${bestDianneThisMonth.saves} saves · ${bestDianneThisMonth.comments} comments · +${bestDianneThisMonth.followers} followers` : "",
              },
              {
                label: "LinkedIn: TDP Page", color: "#1A5276",
                has: !!bestTDPWeek,
                metric: bestTDPWeek ? fmt(bestTDPWeek.impressions) + " imp" : "No data",
                title: bestTDPWeek?.week ?? "—",
                sub: bestTDPWeek ? `${fmt(bestTDPWeek.clicks)} clicks · ${bestTDPWeek.ctr}% CTR · ${bestTDPWeek.note || "(no note)"}` : "",
              },
              {
                label: "X (Twitter)", color: "#111111",
                has: !!bestXWeek,
                metric: bestXWeek ? fmt(bestXWeek.engagements) + " engagements" : "No data",
                title: bestXWeek?.week ?? "—",
                sub: bestXWeek ? `${fmt(bestXWeek.impressions)} imp · +${bestXWeek.follows - bestXWeek.unfollows} net follows` : "",
              },
              {
                label: "Cold Email", color: "#6C3483",
                has: !!bestEmailRate,
                metric: bestEmailRate ? `${bestEmailRate.reply_rate}% reply` : "No data",
                title: bestEmailRate?.campaign?.split(" - ")[0] ?? "—",
                sub: bestEmailRate ? `${fmt(bestEmailRate.sent)} sent · ${bestEmailRate.interested} interested` : "",
              },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: c.color }} />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: c.color }}>{c.label}</span>
                  {!c.has && <span className="text-[10px] text-gray-400">no data this month</span>}
                </div>
                <div className="font-mono text-xl font-bold mb-1">{c.metric}</div>
                <div className="text-[12px] text-gray-700 font-medium leading-snug mb-1 line-clamp-2">{c.title}</div>
                {c.sub && <div className="text-[11px] text-gray-500">{c.sub}</div>}
              </div>
            ))}
          </div>

          {/* Sparkline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="text-[13px] font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C0392B] inline-block" /> YouTube Monthly Views (Daily Avg)
            </div>
            <div className="h-[200px]">
              <YTMonthlySparkline data={ytMonthly} />
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3">What's working</h3>
            <ul className="space-y-2 text-[13px] text-gray-700">
              {(() => {
                const out: string[] = [];
                // YouTube momentum
                if (ytMonthly.length >= 2) {
                  const last = ytMonthly[ytMonthly.length - 1];
                  const prev = ytMonthly[ytMonthly.length - 2];
                  if (last.mom_pct !== null) {
                    out.push(`YouTube daily views are ${last.mom_pct >= 0 ? "up" : "down"} ${Math.abs(last.mom_pct)}% month-over-month (${fmt(last.daily_avg)} vs ${fmt(prev.daily_avg)} daily avg).`);
                  }
                }
                // Top Dianne post context
                if (bestDianneThisMonth) {
                  out.push(`Dianne's best ${currentMonth} post had ${fmt(bestDianneThisMonth.impressions)} impressions with ${bestDianneThisMonth.reactions} reactions — ${((bestDianneThisMonth.reactions / Math.max(bestDianneThisMonth.impressions, 1)) * 100).toFixed(2)}% reaction rate.`);
                }
                // TDP growth
                const tdpSorted = [...(data.linkedin_tdp_weekly ?? [])];
                if (tdpSorted.length >= 2) {
                  const lastTDP = tdpSorted[tdpSorted.length - 1];
                  if (lastTDP.ctr > 30) out.push(`TDP Page CTR is unusually high (${lastTDP.ctr}%) — likely a small audience base with high-intent clicks.`);
                }
                // X spike detection
                const xw = data.twitter_weekly ?? [];
                if (xw.length > 0) {
                  const maxX = xw.reduce((a, b) => (a.engagements > b.engagements ? a : b));
                  const avgX = xw.reduce((s, w) => s + w.engagements, 0) / xw.length;
                  if (maxX.engagements > avgX * 3) {
                    out.push(`X had a breakout week ${maxX.week}: ${fmt(maxX.engagements)} engagements (~${Math.round(maxX.engagements / Math.max(avgX, 1))}× your average), net +${maxX.follows - maxX.unfollows} follows.`);
                  }
                }
                // Best video overall
                const allVids = [...data.youtube_videos].sort((a, b) => b.views - a.views);
                if (allVids[0]) {
                  out.push(`Top video all-time: "${allVids[0].title}" — ${fmt(allVids[0].views)} views, ${allVids[0].ctr}% CTR.`);
                }
                return out.length > 0 ? out.map((t, i) => (
                  <li key={i} className="flex gap-2"><span className="text-gray-400">•</span><span>{t}</span></li>
                )) : <li className="text-gray-400 italic">Not enough data yet for insights.</li>;
              })()}
            </ul>
          </div>
        </div>
      )}

      {/* ===== YOUTUBE ===== */}
      {section === "youtube" && (
        <div>
          <SectionHeader title="YouTube" color="#C0392B" badge="Long-form" />

          <YouTubeDrivers videos={data.youtube_videos} />

          {/* KPI Strip */}
          <div className="flex gap-6 mb-6 flex-wrap">
            {[
              { label: "Total Views (Dec–Apr)", value: fmt(data.youtube_weekly.reduce((s, w) => s + w.views, 0)), sub: "" },
              { label: "Best Week", value: fmt(Math.max(...data.youtube_weekly.map(w => w.views))), sub: data.youtube_weekly.reduce((a, b) => a.views > b.views ? a : b).week },
              { label: "Best Video", value: fmt(Math.max(...data.youtube_videos.map(v => v.views))), sub: data.youtube_videos.reduce((a, b) => a.views > b.views ? a : b).title.slice(0, 30) + "..." },
              { label: "Best Month (Daily Avg)", value: fmt(marYT?.daily_avg || 0), sub: "Mar 2026" },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 px-4 py-3.5 min-w-[160px]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{s.label}</div>
                <div className="font-mono text-xl font-bold">{s.value}</div>
                {s.sub && <div className="text-[11px] text-gray-500 mt-0.5">{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* Weekly Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="text-[13px] font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C0392B] inline-block" /> Weekly Views
            </div>
            <div className="h-[280px]">
              <YTWeeklyChart data={data.youtube_weekly} />
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 text-[13px] font-semibold border-b border-gray-200">Monthly Summary</div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Month</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Views</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Days</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Daily Avg</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">MoM %</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {ytMonthly.map((m, i) => (
                  <tr key={i} className={m.partial ? "bg-[#e8f8f5] border-l-[3px] border-l-[#117A65]" : m.month === "Mar 2026" ? "bg-[#fef9e7]" : ""}>
                    <td className="px-3.5 py-2.5 font-semibold">{m.month} {m.partial ? <span className="inline-block bg-[#2E86AB] text-white px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">Partial</span> : null}</td>
                    <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(m.views)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-xs">{m.days}</td>
                    <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(m.daily_avg)}</td>
                    <td className="px-3.5 py-2.5"><Trend value={m.mom_pct} /></td>
                    <td className="px-3.5 py-2.5 text-[11px] text-gray-500 max-w-[200px]">{m.note}{m.projected ? ` Proj: ~${fmt(m.projected)}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Video Log */}
          {(() => {
            const signupsBySlug = new Map<string, number>();
            for (const s of data.workshop_signups ?? []) {
              const slug = s.utm_campaign || s.utm_content;
              if (!slug) continue;
              signupsBySlug.set(slug, (signupsBySlug.get(slug) ?? 0) + 1);
            }
            const trackingStartLabel = UTM_TRACKING_START.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            return (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                <div className="px-4 py-3 text-[13px] font-semibold border-b border-gray-200 flex items-center justify-between">
                  <span>Video Log (90-day window)</span>
                  <span className="text-[11px] font-normal text-gray-500">UTM tracking started {trackingStartLabel} — videos without a tag show — for Signups/Conv</span>
                </div>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Published</th>
                      <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Title</th>
                      <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Views</th>
                      <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">CTR</th>
                      <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Subs</th>
                      <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Signups</th>
                      <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Conv %</th>
                      <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.youtube_videos].sort((a, b) => b.views - a.views).map((v, i) => {
                      const tagged = !!v.utm_slug;
                      const signups = tagged ? (signupsBySlug.get(v.utm_slug!) ?? 0) : null;
                      const convPct = tagged && v.views > 0 && signups !== null ? (signups / v.views) * 100 : null;
                      return (
                        <tr key={i} className={v.views > 10000 ? "bg-[#D5F5E3]" : ""}>
                          <td className="px-3.5 py-2.5">{v.published}</td>
                          <td className="px-3.5 py-2.5 max-w-[320px]">{v.title}</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(v.views)}</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">{v.ctr}%</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(v.subs)}</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">
                            {tagged ? (
                              <span className={signups! > 0 ? "inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#D5F5E3] text-[#1E8449]" : ""}>{signups}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">
                            {convPct !== null ? (
                              convPct >= 0.05 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#D5F5E3] text-[#1E8449]">{convPct.toFixed(3)}%</span>
                              ) : (
                                <span>{convPct.toFixed(3)}%</span>
                              )
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-[11px] text-gray-500 max-w-[200px]">{v.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* ===== SHORTS ===== */}
      {section === "shorts" && (
        <div>
          <SectionHeader title="Shorts" color="#E67E22" badge="Batch Performance" />
          <ShortsDrivers weeks={data.shorts_weekly} />

          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="text-[13px] font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E67E22] inline-block" /> Avg Views per Clip by Batch
            </div>
            <div className="h-[280px]">
              <ShortsChart data={data.shorts_weekly} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 text-[13px] font-semibold border-b border-gray-200">Batch Detail</div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Week</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Clips</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Total Views</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Avg / Clip</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Impressions</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {data.shorts_weekly.map((s, i) => {
                  const isCurrent = i === data.shorts_weekly.length - 1;
                  return (
                    <tr key={i} className={isCurrent ? "bg-[#e8f8f5] border-l-[3px] border-l-[#117A65]" : ""}>
                      <td className="px-3.5 py-2.5">{s.week} {isCurrent && <span className="inline-block bg-[#2E86AB] text-white px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">Current</span>}</td>
                      <td className="px-3.5 py-2.5 font-mono text-xs">{s.clips}</td>
                      <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(s.total_views)}</td>
                      <td className="px-3.5 py-2.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold font-mono ${s.avg_per_clip >= 800 ? "bg-[#D5F5E3] text-[#1E8449]" : s.avg_per_clip < 400 ? "bg-[#FADBD8] text-[#C0392B]" : ""}`}>
                          {fmt(s.avg_per_clip)}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(s.impressions)}</td>
                      <td className="px-3.5 py-2.5 text-[11px] text-gray-500">{s.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== LINKEDIN DIANNE ===== */}
      {section === "linkedin-dianne" && (
        <div>
          <SectionHeader title="LinkedIn: Dianne" color="#0077B5" badge="Personal Brand" />

          <DianneDrivers posts={data.linkedin_dianne_posts} />

          {/* Top performers this month */}
          {dianneThisMonth.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-[#0077B5] p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#0077B5]">Top Posts — {currentMonth}</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[...dianneThisMonth].sort((a, b) => b.impressions - a.impressions).slice(0, 3).map((p, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">#{i + 1} · {p.date}</span>
                      <span className="text-[10px] text-gray-400">{(p as { post_time?: string }).post_time}</span>
                    </div>
                    <div className="font-mono text-lg font-bold mb-1.5">{fmt(p.impressions)} <span className="text-[11px] text-gray-500 font-sans font-normal">imp</span></div>
                    <div className="flex gap-3 text-[11px] text-gray-600">
                      <span><strong>{p.reactions}</strong> react</span>
                      <span><strong>{p.saves}</strong> saves</span>
                      <span><strong>{(p as { comments?: number }).comments ?? 0}</strong> cmts</span>
                      <span>+<strong>{p.followers}</strong> foll.</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1.5 italic">{p.note || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3">What's driving growth</h3>
            <ul className="space-y-2 text-[13px] text-gray-700">
              {(() => {
                const out: string[] = [];
                const posts = data.linkedin_dianne_posts;
                const monthly = data.linkedin_dianne_monthly;
                if (monthly.length >= 2) {
                  const last = monthly[monthly.length - 1];
                  if (last.mom_imp !== null && last.mom_imp !== undefined) {
                    out.push(`${last.month}: ${last.mom_imp >= 0 ? "up" : "down"} ${Math.abs(last.mom_imp)}% on impressions, ${last.mom_saves !== null ? (last.mom_saves >= 0 ? "up" : "down") + " " + Math.abs(last.mom_saves) + "% on saves" : "no saves trend"}.`);
                  }
                }
                // Find breakout post
                const avgImp = posts.reduce((s, p) => s + p.impressions, 0) / Math.max(posts.length, 1);
                const breakouts = posts.filter((p) => p.impressions > avgImp * 2);
                if (breakouts.length > 0) {
                  const best = breakouts.sort((a, b) => b.impressions - a.impressions)[0];
                  out.push(`Breakout post ${best.date} drove ${fmt(best.impressions)} impressions (~${Math.round(best.impressions / Math.max(avgImp, 1))}× average). Note: "${best.note || "no note"}".`);
                }
                // Reactions per impression
                const engaged = [...posts].sort((a, b) => (b.reactions / Math.max(b.impressions, 1)) - (a.reactions / Math.max(a.impressions, 1)));
                if (engaged[0]) {
                  const er = ((engaged[0].reactions / Math.max(engaged[0].impressions, 1)) * 100).toFixed(2);
                  out.push(`Highest engagement rate: ${engaged[0].date} — ${er}% reactions per impression. ${engaged[0].note ? `(${engaged[0].note})` : ""}`);
                }
                return out.length > 0 ? out.map((t, i) => (
                  <li key={i} className="flex gap-2"><span className="text-gray-400">•</span><span>{t}</span></li>
                )) : <li className="text-gray-400 italic">Not enough data yet.</li>;
              })()}
            </ul>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="text-[13px] font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0077B5] inline-block" /> Impressions &amp; Saves by Week &mdash; Saves are the key metric
            </div>
            <div className="h-[300px]">
              <ChartErrorBoundary>
                <DianneChart data={data.linkedin_dianne_posts} />
              </ChartErrorBoundary>
            </div>
          </div>

          {/* Post Log */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 text-[13px] font-semibold border-b border-gray-200">Post Log</div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50">
                  {["Week", "Date", "Impressions", "Reactions", "Saves", "Followers", "Note"].map(h => (
                    <th key={h} className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.linkedin_dianne_posts.map((p, i) => {
                  const isCurrent = i === data.linkedin_dianne_posts.length - 1;
                  return (
                    <tr key={i} className={`${p.saves >= 100 ? "bg-[#D5F5E3]" : ""} ${isCurrent ? "bg-[#e8f8f5]" : ""}`}>
                      <td className="px-3.5 py-2.5">{p.week}</td>
                      <td className="px-3.5 py-2.5">{p.date}</td>
                      <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(p.impressions)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-xs">{p.reactions}</td>
                      <td className="px-3.5 py-2.5 font-mono text-xs font-bold">{p.saves}</td>
                      <td className="px-3.5 py-2.5 font-mono text-xs">{p.followers}</td>
                      <td className="px-3.5 py-2.5 text-[11px] text-gray-500 max-w-[200px]">{p.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Monthly Summary */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 text-[13px] font-semibold border-b border-gray-200">Monthly Summary</div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50">
                  {["Month", "Impressions", "Saves", "Posts", "Imp. MoM", "Saves MoM", "Note"].map(h => (
                    <th key={h} className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.linkedin_dianne_monthly.map((m, i) => (
                  <tr key={i} className={m.partial ? "bg-[#e8f8f5]" : ""}>
                    <td className="px-3.5 py-2.5 font-semibold">{m.month} {m.partial ? <span className="inline-block bg-[#2E86AB] text-white px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">Partial</span> : null}</td>
                    <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(m.impressions)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-xs font-bold">{fmt(m.saves)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-xs">{m.posts}</td>
                    <td className="px-3.5 py-2.5"><Trend value={m.mom_imp} /></td>
                    <td className="px-3.5 py-2.5"><Trend value={m.mom_saves} /></td>
                    <td className="px-3.5 py-2.5 text-[11px] text-gray-500 max-w-[200px]">{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== LINKEDIN TDP ===== */}
      {section === "linkedin-tdp" && (
        <div>
          <SectionHeader title="LinkedIn: TDP Page" color="#1A5276" badge="Company Page" />

          <TDPDrivers weeks={data.linkedin_tdp_weekly} />

          {/* Top weeks */}
          <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-[#1A5276] p-5 mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#1A5276] mb-3">Top Weeks by Impressions</h3>
            <div className="grid grid-cols-3 gap-4">
              {[...data.linkedin_tdp_weekly].sort((a, b) => b.impressions - a.impressions).slice(0, 3).map((w, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">#{i + 1} · {w.week}</div>
                  <div className="font-mono text-lg font-bold mb-1">{fmt(w.impressions)} <span className="text-[11px] text-gray-500 font-sans font-normal">imp</span></div>
                  <div className="text-[11px] text-gray-600">{fmt(w.clicks)} clicks · {w.ctr}% CTR · {w.reactions} reactions</div>
                  <div className="text-[11px] text-gray-500 mt-1.5 italic">{w.note || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3">What's driving the numbers</h3>
            <ul className="space-y-2 text-[13px] text-gray-700">
              {(() => {
                const out: string[] = [];
                const weeks = data.linkedin_tdp_weekly;
                if (weeks.length === 0) return <li className="text-gray-400 italic">No data.</li>;
                const sorted = [...weeks].sort((a, b) => b.impressions - a.impressions);
                const top = sorted[0];
                if (top?.note) out.push(`Best week "${top.week}" was driven by: ${top.note}. ${fmt(top.impressions)} imp, ${top.ctr}% CTR.`);
                const noPost = weeks.filter((w) => /no post/i.test(w.note ?? ""));
                const withPost = weeks.filter((w) => w.note && !/no post/i.test(w.note));
                if (noPost.length > 0 && withPost.length > 0) {
                  const avgNoPost = noPost.reduce((s, w) => s + w.impressions, 0) / noPost.length;
                  const avgPost = withPost.reduce((s, w) => s + w.impressions, 0) / withPost.length;
                  out.push(`Weeks with a post average ${fmt(Math.round(avgPost))} imp vs ${fmt(Math.round(avgNoPost))} without — ~${Math.round((avgPost / Math.max(avgNoPost, 1)) * 100) / 100}× lift from posting.`);
                }
                const latest = weeks[weeks.length - 1];
                if (latest && latest.ctr > 50) {
                  out.push(`Latest week (${latest.week}) has ${latest.ctr}% CTR — very high, suggests a tight audience seeing targeted content.`);
                }
                return out.length > 0 ? out.map((t, i) => (
                  <li key={i} className="flex gap-2"><span className="text-gray-400">•</span><span>{t}</span></li>
                )) : <li className="text-gray-400 italic">Add notes to weeks to unlock insights.</li>;
              })()}
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 text-[13px] font-semibold border-b border-gray-200">Weekly Performance</div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50">
                  {["Week", "Impressions", "Clicks", "CTR", "Reactions", "Note"].map(h => (
                    <th key={h} className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.linkedin_tdp_weekly.map((p, i) => {
                  const isCurrent = i === data.linkedin_tdp_weekly.length - 1;
                  return (
                    <tr key={i} className={isCurrent ? "bg-[#e8f8f5] border-l-[3px] border-l-[#117A65]" : ""}>
                      <td className="px-3.5 py-2.5">{p.week} {isCurrent && <span className="inline-block bg-[#2E86AB] text-white px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">Current</span>}</td>
                      <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(p.impressions)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(p.clicks)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-xs">{p.ctr}%</td>
                      <td className="px-3.5 py-2.5 font-mono text-xs">{p.reactions}</td>
                      <td className="px-3.5 py-2.5 text-[11px] text-gray-500">{p.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== X (TWITTER) ===== */}
      {section === "twitter" && (
        <div>
          <SectionHeader title="X (Twitter)" color="#111111" badge={`${data.twitter_weekly?.length || 0} weeks`} />
          {data.twitter_weekly && data.twitter_weekly.length > 0 && <XDrivers weeks={data.twitter_weekly} />}
          {!data.twitter_weekly || data.twitter_weekly.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              No X data yet. Upload <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">account_overview_analytics.csv</code> to see weekly metrics.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {(() => {
                  const weeks = data.twitter_weekly;
                  const latest = weeks[weeks.length - 1];
                  const totalImp = weeks.reduce((s, w) => s + w.impressions, 0);
                  const totalEng = weeks.reduce((s, w) => s + w.engagements, 0);
                  const netFollows = weeks.reduce((s, w) => s + w.follows - w.unfollows, 0);
                  const engRate = totalImp > 0 ? ((totalEng / totalImp) * 100).toFixed(2) : "0";
                  return [
                    { label: "Latest Week Impressions", value: fmt(latest.impressions), sub: latest.week },
                    { label: "Total Engagements", value: fmt(totalEng), sub: `${engRate}% rate` },
                    { label: "Net New Follows", value: fmt(netFollows), sub: `${weeks.length} weeks` },
                    { label: "Latest Week Profile Visits", value: fmt(latest.profile_visits), sub: latest.week },
                  ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "#111111" }} />
                      <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-2">{kpi.label}</div>
                      <div className="font-mono text-3xl font-bold leading-none mb-1.5">{kpi.value}</div>
                      <div className="text-[11px] text-gray-500">{kpi.sub}</div>
                    </div>
                  ));
                })()}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 text-[13px] font-semibold border-b border-gray-200">Weekly Performance</div>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50">
                      {["Week", "Impressions", "Engagements", "Likes", "Replies", "Reposts", "Follows (net)", "Profile Visits"].map(h => (
                        <th key={h} className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.twitter_weekly.map((w, i) => {
                      const isCurrent = i === data.twitter_weekly.length - 1;
                      return (
                        <tr key={i} className={isCurrent ? "bg-gray-50 border-l-[3px] border-l-[#111111]" : ""}>
                          <td className="px-3.5 py-2.5">{w.week} {isCurrent && <span className="inline-block bg-[#111111] text-white px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">Current</span>}</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(w.impressions)}</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(w.engagements)}</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(w.likes)}</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(w.replies)}</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(w.reposts)}</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">{w.follows - w.unfollows >= 0 ? "+" : ""}{w.follows - w.unfollows}</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(w.profile_visits)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== COLD EMAIL ===== */}
      {section === "cold-email" && (
        <div>
          <SectionHeader title="Cold Email" color="#6C3483" badge="Outbound Campaigns" />
          <div className="grid grid-cols-3 gap-4 mb-6">
            {data.cold_email_campaigns.map((c, i) => {
              const rateColor = c.reply_rate >= 2 ? "#1E8449" : c.reply_rate >= 1 ? "#b7950b" : "#C0392B";
              const statusCls = c.status === "Active" ? "bg-[#D5F5E3] text-[#1E8449]" : c.status === "Paused" ? "bg-[#FEF9E7] text-[#b7950b]" : "bg-gray-100 text-gray-500";
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 relative">
                  <div className="text-[13px] font-semibold mb-3 leading-snug pr-16">{c.campaign}</div>
                  <div className="absolute top-4 right-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusCls}`}>{c.status}</span>
                  </div>
                  <div className="font-mono text-4xl font-bold leading-none mb-1" style={{ color: rateColor }}>{c.reply_rate}%</div>
                  <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-4">Reply Rate</div>
                  <div className="grid grid-cols-3 gap-2 pt-3.5 border-t border-gray-200">
                    {[
                      { l: "Sent", v: fmt(c.sent) },
                      { l: "Replies", v: c.replies },
                      { l: "Interested", v: c.interested },
                    ].map((s, j) => (
                      <div key={j}>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">{s.l}</div>
                        <div className="font-mono text-sm font-semibold mt-0.5">{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-3 italic">{c.note}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== MONTHLY GROWTH ===== */}
      {section === "monthly-growth" && (() => {
        // Build per-month rollups across all channels
        const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const monthStartsWith = (week: string, month: string) => {
          const [name] = month.split(" ");
          return week.startsWith(name) || week.includes(`–${name}`);
        };
        const allMonths = new Set<string>();
        ytMonthly.forEach((m) => allMonths.add(m.month));
        data.linkedin_dianne_monthly.forEach((m) => allMonths.add(m.month));
        const monthKey = (m: string) => {
          const [n, y] = m.split(" ");
          return parseInt(y) * 12 + MONTHS.indexOf(n);
        };
        const sortedMonths = [...allMonths].sort((a, b) => monthKey(a) - monthKey(b));
        // Cap to last 6 months for readability
        const months = sortedMonths.slice(-6);

        // Precompute per-month data per channel
        const byMonth = months.map((month) => {
          const yt = ytMonthly.find((m) => m.month === month);
          const shortsSlice = data.shorts_weekly.filter((w) => monthStartsWith(w.week, month));
          const tdpSlice = data.linkedin_tdp_weekly.filter((w) => monthStartsWith(w.week, month));
          const xSlice = data.twitter_weekly?.filter((w) => monthStartsWith(w.week, month)) ?? [];
          const dianne = data.linkedin_dianne_monthly.find((m) => m.month === month);
          const shortsClips = shortsSlice.reduce((s, w) => s + w.clips, 0);
          const shortsViews = shortsSlice.reduce((s, w) => s + w.total_views, 0);
          const tdpImp = tdpSlice.reduce((s, w) => s + w.impressions, 0);
          const tdpClicks = tdpSlice.reduce((s, w) => s + w.clicks, 0);
          const tdpCtr = tdpImp > 0 ? (tdpClicks / tdpImp) * 100 : 0;
          const xImp = xSlice.reduce((s, w) => s + w.impressions, 0);
          const xEng = xSlice.reduce((s, w) => s + w.engagements, 0);
          const xNetFollows = xSlice.reduce((s, w) => s + w.follows - w.unfollows, 0);
          // Combined YouTube: long-form + shorts, per day
          const ytTotalViews = (yt?.views ?? 0) + shortsViews;
          const ytDays = yt?.days ?? 0;
          const ytCombinedDaily = ytDays > 0 ? Math.round(ytTotalViews / ytDays) : null;

          // Combined LinkedIn: Dianne posts + TDP Page
          const diImp = dianne?.impressions ?? 0;
          const liCombinedImp = diImp + tdpImp;
          const diSaves = dianne?.saves ?? 0;
          const diReactions = 0; // not stored at monthly level for Dianne; placeholder
          const liCombinedEng = diSaves + tdpImp > 0 ? diSaves + tdpClicks : 0;

          // All channels: total reach (views + impressions)
          const allReach = ytTotalViews + diImp + tdpImp + xImp;

          return {
            month, yt, dianne,
            isPartial: yt?.partial === 1,
            hasShorts: shortsSlice.length > 0,
            hasTDP: tdpSlice.length > 0,
            hasX: xSlice.length > 0,
            metrics: {
              all_total_reach: allReach > 0 ? allReach : null,
              yt_combined_daily: ytCombinedDaily,
              yt_combined_total: ytTotalViews > 0 ? ytTotalViews : null,
              yt_daily_avg: yt?.daily_avg ?? null,
              yt_views: yt?.views ?? null,
              shorts_avg_per_clip: shortsClips > 0 ? Math.round(shortsViews / shortsClips) : null,
              shorts_total_views: shortsSlice.length > 0 ? shortsViews : null,
              shorts_clips: shortsSlice.length > 0 ? shortsClips : null,
              li_combined_imp: liCombinedImp > 0 ? liCombinedImp : null,
              li_combined_clicks_saves: (tdpClicks + diSaves) > 0 ? tdpClicks + diSaves : null,
              dianne_imp_per_post: dianne && dianne.posts > 0 ? Math.round(dianne.impressions / dianne.posts) : null,
              dianne_saves_per_post: dianne && dianne.posts > 0 ? Math.round(dianne.saves / dianne.posts) : null,
              dianne_posts: dianne?.posts ?? null,
              tdp_imp_per_week: tdpSlice.length > 0 ? Math.round(tdpImp / tdpSlice.length) : null,
              tdp_ctr: tdpSlice.length > 0 ? Math.round(tdpCtr * 100) / 100 : null,
              x_eng_per_week: xSlice.length > 0 ? Math.round(xEng / xSlice.length) : null,
              x_follows_per_week: xSlice.length > 0 ? Math.round(xNetFollows / xSlice.length) : null,
            },
          };
        });

        // Pivot rows
        type MetricDef = {
          label: string;
          key: keyof typeof byMonth[number]["metrics"];
          unit: string;
          kind: "count" | "ratio" | "pct";
        };
        type ChannelGroup = { channel: string; color: string; metrics: MetricDef[] };
        const groups: ChannelGroup[] = [
          {
            channel: "All Channels — Total Reach", color: "#2E86AB",
            metrics: [
              { label: "Total Reach (views + imp)", key: "all_total_reach", unit: "reach", kind: "count" },
            ],
          },
          {
            channel: "YouTube (long-form + shorts)", color: "#922B21",
            metrics: [
              { label: "Daily Avg Views (combined)", key: "yt_combined_daily", unit: "/day", kind: "ratio" },
              { label: "Total Monthly Views (combined)", key: "yt_combined_total", unit: "views", kind: "count" },
            ],
          },
          {
            channel: "↳ YouTube Long-form", color: "#C0392B",
            metrics: [
              { label: "Daily Avg Views", key: "yt_daily_avg", unit: "/day", kind: "ratio" },
              { label: "Raw Monthly Views", key: "yt_views", unit: "views", kind: "count" },
            ],
          },
          {
            channel: "↳ YouTube Shorts", color: "#E67E22",
            metrics: [
              { label: "Avg Views/Clip", key: "shorts_avg_per_clip", unit: "/clip", kind: "ratio" },
              { label: "Total Views", key: "shorts_total_views", unit: "views", kind: "count" },
              { label: "Clips Published", key: "shorts_clips", unit: "clips", kind: "count" },
            ],
          },
          {
            channel: "LinkedIn (Dianne + TDP Page)", color: "#154360",
            metrics: [
              { label: "Total Impressions (combined)", key: "li_combined_imp", unit: "imp", kind: "count" },
              { label: "Clicks + Saves (combined)", key: "li_combined_clicks_saves", unit: "", kind: "count" },
            ],
          },
          {
            channel: "↳ LinkedIn: Dianne", color: "#0077B5",
            metrics: [
              { label: "Impressions/Post", key: "dianne_imp_per_post", unit: "/post", kind: "ratio" },
              { label: "Saves/Post", key: "dianne_saves_per_post", unit: "/post", kind: "ratio" },
              { label: "Posts Count", key: "dianne_posts", unit: "posts", kind: "count" },
            ],
          },
          {
            channel: "↳ LinkedIn: TDP Page", color: "#1A5276",
            metrics: [
              { label: "Impressions/Week", key: "tdp_imp_per_week", unit: "/wk", kind: "ratio" },
              { label: "CTR", key: "tdp_ctr", unit: "%", kind: "pct" },
            ],
          },
          {
            channel: "X (Twitter)", color: "#111111",
            metrics: [
              { label: "Engagements/Week", key: "x_eng_per_week", unit: "/wk", kind: "ratio" },
              { label: "Net Follows/Week", key: "x_follows_per_week", unit: "/wk", kind: "ratio" },
            ],
          },
        ];

        const bgForMoM = (mom: number | null): string => {
          if (mom === null) return "bg-gray-50";
          if (mom >= 5) return "bg-[#D5F5E3]";
          if (mom <= -5) return "bg-[#FADBD8]";
          return "bg-[#FEF9E7]";
        };
        const textForMoM = (mom: number | null): string => {
          if (mom === null) return "text-gray-500";
          if (mom >= 5) return "text-[#1E8449]";
          if (mom <= -5) return "text-[#C0392B]";
          return "text-[#b7950b]";
        };
        const arrowForMoM = (mom: number | null): string => {
          if (mom === null) return "";
          if (mom >= 5) return "▲";
          if (mom <= -5) return "▼";
          return "→";
        };
        const formatValue = (value: number | null, kind: MetricDef["kind"], unit: string): string => {
          if (value === null) return "—";
          if (kind === "pct") return `${value}%`;
          return `${fmt(value)}${unit.startsWith("/") ? unit : ""}`;
        };

        return (
          <div>
            <SectionHeader title="Monthly Growth" color="#117A65" badge={months.length > 0 ? `${months[0]} – ${months[months.length-1]}` : ""} />

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="sticky left-0 bg-gray-50 text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold min-w-[220px]">Channel / Metric</th>
                      {months.map((m, i) => {
                        const mo = byMonth[i];
                        return (
                          <th key={m} className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold min-w-[120px]">
                            <div>{m}</div>
                            {mo.isPartial && <div className="text-[9px] text-[#b7950b] normal-case font-normal mt-0.5">Partial · actual</div>}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <Fragment key={g.channel}>
                        {/* Channel header row */}
                        <tr>
                          <td
                            colSpan={months.length + 1}
                            className="sticky left-0 text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5"
                            style={{ background: g.color }}
                          >
                            {g.channel}
                          </td>
                        </tr>
                        {g.metrics.map((metric, mi) => (
                          <tr key={`${g.channel}-${metric.label}`} className="border-b border-gray-100">
                            <td className="sticky left-0 bg-white px-3.5 py-2.5 text-[12px] text-gray-700 border-l-4" style={{ borderLeftColor: g.color }}>
                              {metric.label} {metric.kind !== "count" && <span className="text-[10px] text-gray-400">MoM%</span>}
                            </td>
                            {byMonth.map((mo, i) => {
                              const v = mo.metrics[metric.key];
                              const prevV = i > 0 ? byMonth[i - 1].metrics[metric.key] : null;
                              const mom = v !== null && prevV !== null && prevV > 0 ? Math.round(((v - prevV) / prevV) * 1000) / 10 : null;
                              const isBaseline = i === 0 || prevV === null;
                              const bg = metric.kind === "count" ? "" : bgForMoM(mom);
                              const tc = metric.kind === "count" ? "text-gray-700" : textForMoM(mom);
                              const arrow = metric.kind === "count" ? "" : arrowForMoM(mom);
                              return (
                                <td key={mo.month} className={`px-3.5 py-2.5 align-top ${bg}`}>
                                  {v === null ? (
                                    <span className="text-gray-400">—</span>
                                  ) : (
                                    <>
                                      {metric.kind !== "count" && (
                                        isBaseline ? (
                                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">baseline</div>
                                        ) : mom !== null ? (
                                          <div className={`text-[12px] font-semibold flex items-center gap-1 ${tc}`}>
                                            <span>{arrow}</span>
                                            <span>{Math.abs(mom)}%</span>
                                          </div>
                                        ) : null
                                      )}
                                      <div className="font-mono text-[12px] font-semibold text-gray-900">
                                        {formatValue(v, metric.kind, metric.unit)}
                                      </div>
                                    </>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-4 text-[11px] text-gray-500 mb-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#D5F5E3] rounded-sm inline-block" /> ≥ +5% MoM</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#FEF9E7] rounded-sm inline-block" /> flat (±5%)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#FADBD8] rounded-sm inline-block" /> ≤ -5% MoM</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-gray-50 rounded-sm inline-block border border-gray-200" /> no prior month (baseline)</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
