"use client";

import { Suspense, useEffect, useState, Component, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { YTWeeklyChart, YTMonthlySparkline, ShortsChart, DianneChart } from "@/components/Charts";

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
  youtube_videos: Array<{ published: string; title: string; views: number; impressions: number; ctr: number; subs: number; note: string }>;
  shorts_weekly: Array<{ week: string; clips: number; total_views: number; avg_per_clip: number; impressions: number; note: string }>;
  linkedin_dianne_posts: Array<{ week: string; date: string; impressions: number; reactions: number; comments: number; saves: number; followers: number; note: string }>;
  linkedin_dianne_monthly: Array<{ month: string; impressions: number; saves: number; posts: number; mom_imp: number | null; mom_saves: number | null; partial: number; note: string }>;
  linkedin_tdp_weekly: Array<{ week: string; impressions: number; clicks: number; ctr: number; reactions: number; note: string }>;
  cold_email_campaigns: Array<{ campaign: string; status: string; window: string; sent: number; contacted: number; replies: number; reply_rate: number; interested: number; note: string }>;
}

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

function DashboardContent() {
  const [data, setData] = useState<DataSet | null>(null);
  const searchParams = useSearchParams();
  const section = searchParams.get("tab") || "overview";

  useEffect(() => {
    fetch("/api/data").then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="flex items-center justify-center h-96 text-gray-400">Loading...</div>;

  const ytMonthly = data.youtube_monthly;
  const marYT = ytMonthly.find(m => m.month === "Mar 2026");
  const bestDiannePost = [...data.linkedin_dianne_posts].sort((a, b) => b.saves - a.saves)[0];
  const bestEmailRate = [...data.cold_email_campaigns].sort((a, b) => b.reply_rate - a.reply_rate)[0];
  const totalClips = data.shorts_weekly.reduce((s, w) => s + w.clips, 0);
  const currentYTWeek = data.youtube_weekly[data.youtube_weekly.length - 1];
  const currentShorts = data.shorts_weekly[data.shorts_weekly.length - 1];
  const currentDianne = data.linkedin_dianne_posts[data.linkedin_dianne_posts.length - 1];
  const currentTDP = data.linkedin_tdp_weekly[data.linkedin_tdp_weekly.length - 1];

  return (
    <div>
      {/* ===== OVERVIEW ===== */}
      {section === "overview" && (
        <div>
          <SectionHeader title="Overview" color="#2E86AB" badge="April 2026" />

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mb-7">
            {[
              { label: "YouTube Daily Avg (Mar)", value: fmt(marYT?.daily_avg || 0), color: "var(--yt)", sub: <><Trend value={marYT?.mom_pct || null} /> <span className="ml-1">vs Feb</span></> },
              { label: "Dianne Best Post Saves", value: fmt(bestDiannePost?.saves || 0), color: "var(--li-dianne)", sub: <>{bestDiannePost?.date} &mdash; #1 all time</> },
              { label: "Best Email Reply Rate", value: `${bestEmailRate?.reply_rate || 0}%`, color: "var(--email)", sub: <>{bestEmailRate?.campaign?.split(" - ")[0]}</> },
              { label: "Total Shorts Clips", value: fmt(totalClips), color: "var(--shorts)", sub: <>{data.shorts_weekly.length} weeks tracked</> },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: kpi.color }} />
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">{kpi.label}</div>
                <div className="font-mono text-[28px] font-bold tracking-tight leading-none" style={{ color: kpi.color }}>{kpi.value}</div>
                <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">{kpi.sub}</div>
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
                { label: "LI Dianne Saves", val: fmt(currentDianne?.saves || 0) },
                { label: "TDP Page Imp.", val: fmt(currentTDP?.impressions || 0) },
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{s.label}</div>
                  <div className="font-mono text-xl font-bold mt-0.5">{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== YOUTUBE ===== */}
      {section === "youtube" && (
        <div>
          <SectionHeader title="YouTube" color="#C0392B" badge="Long-form" />

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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 text-[13px] font-semibold border-b border-gray-200">Video Log (90-day window)</div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Published</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Title</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Views</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">CTR</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Subs</th>
                  <th className="text-left px-3.5 py-2.5 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {[...data.youtube_videos].sort((a, b) => b.views - a.views).map((v, i) => (
                  <tr key={i} className={v.views > 10000 ? "bg-[#D5F5E3]" : ""}>
                    <td className="px-3.5 py-2.5">{v.published}</td>
                    <td className="px-3.5 py-2.5 max-w-[320px]">{v.title}</td>
                    <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(v.views)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-xs">{v.ctr}%</td>
                    <td className="px-3.5 py-2.5 font-mono text-xs">{fmt(v.subs)}</td>
                    <td className="px-3.5 py-2.5 text-[11px] text-gray-500 max-w-[200px]">{v.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== SHORTS ===== */}
      {section === "shorts" && (
        <div>
          <SectionHeader title="Shorts" color="#E67E22" badge="Batch Performance" />

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

          {/* KPI Strip */}
          <div className="flex gap-6 mb-6 flex-wrap">
            {[
              { label: "Best Month Impressions", value: fmt(Math.max(...data.linkedin_dianne_monthly.map(m => m.impressions))), sub: "Dec 2025" },
              { label: "Best Post Saves", value: fmt(bestDiannePost?.saves || 0), sub: bestDiannePost?.date },
              { label: "Mar Recovery", value: "+123%", sub: "Imp. MoM vs Feb", color: "#1E8449" },
              { label: "Mar Saves Recovery", value: "+164%", sub: "Saves MoM vs Feb", color: "#1E8449" },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 px-4 py-3.5 min-w-[160px]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{s.label}</div>
                <div className="font-mono text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                {s.sub && <div className="text-[11px] text-gray-500 mt-0.5">{s.sub}</div>}
              </div>
            ))}
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
      {section === "monthly-growth" && (
        <div>
          <SectionHeader title="Monthly Growth" color="#117A65" badge="Dec 2025 – Apr 2026" />
          <div className="grid grid-cols-5 gap-3.5 mb-6">
            {ytMonthly.map((yt, i) => {
              const li = data.linkedin_dianne_monthly[i];
              const colors = ["#1B4F72", "#154360", "#1A5276", "#117A65", "#2E86AB"];
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 text-white text-[13px] font-bold text-center" style={{ background: colors[i] }}>
                    {yt.month} {yt.partial ? <span className="inline-block bg-white/20 text-white px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ml-1">Partial</span> : null}
                  </div>
                  <div className="p-4">
                    <div className="mb-4 pb-3.5 border-b border-gray-200">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#C0392B] mb-1">YouTube</div>
                      <div className="font-mono text-lg font-bold">{fmt(yt.views)}</div>
                      <div className="text-[11px] text-gray-500">Daily avg: {fmt(yt.daily_avg)}</div>
                      {yt.mom_pct && <div className="mt-1"><Trend value={yt.mom_pct} /></div>}
                      {yt.projected && <div className="text-[11px] text-gray-500 mt-1">Proj: ~{fmt(yt.projected)}</div>}
                    </div>
                    <div className="mb-4 pb-3.5 border-b border-gray-200">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0077B5] mb-1">LinkedIn Dianne</div>
                      <div className="font-mono text-lg font-bold">{fmt(li?.impressions || 0)}</div>
                      <div className="text-[11px] text-gray-500">Saves: {fmt(li?.saves || 0)} &middot; {li?.posts || 0} posts</div>
                      {li?.mom_imp && <div className="mt-1"><Trend value={li.mom_imp} /></div>}
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#0077B5] mb-1">Saves MoM</div>
                      <div className="font-mono text-lg font-bold">{fmt(li?.saves || 0)}</div>
                      {li?.mom_saves && <div className="mt-1"><Trend value={li.mom_saves} /></div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
