"use client";

const fmt = (n: number) => n.toLocaleString();

type Video = { published: string; title: string; views: number; impressions: number; ctr: number; subs: number; note: string };
type DiannePost = { week: string; date: string; post_time?: string; impressions: number; reactions: number; comments?: number; reposts?: number; saves: number; followers: number; note: string };
type TDPWeek = { week: string; impressions: number; clicks: number; ctr: number; reactions: number; note: string };
type XWeek = { week: string; impressions: number; likes: number; engagements: number; bookmarks: number; shares: number; follows: number; unfollows: number; replies: number; reposts: number; profile_visits: number; video_views: number; note: string };
type ShortsWeek = { week: string; clips: number; total_views: number; avg_per_clip: number; impressions: number; note: string };

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 border-l-4 p-5 mb-6" style={{ borderLeftColor: color }}>
      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-4" style={{ color }}>
        Content Drivers — What's Working
      </h3>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Insight({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] font-semibold text-gray-800 mb-1.5">{label}</div>
      <div className="text-[12px] text-gray-600 leading-relaxed">{children}</div>
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mr-1.5" style={{ background: color + "18", color }}>{children}</span>;
}

// ===== YOUTUBE =====
export function YouTubeDrivers({ videos }: { videos: Video[] }) {
  if (videos.length === 0) return null;

  const sorted = [...videos].sort((a, b) => b.views - a.views);
  const top5 = sorted.slice(0, 5);
  const totalViews = sorted.reduce((s, v) => s + v.views, 0);

  // Topic clustering by keywords in title
  const keywords = ["figma", "claude code", "cursor", "design system", "storybook", "ai", "prototype", "github"];
  const topicStats = keywords.map((kw) => {
    const matches = sorted.filter((v) => v.title.toLowerCase().includes(kw));
    return {
      keyword: kw,
      count: matches.length,
      totalViews: matches.reduce((s, v) => s + v.views, 0),
      avgViews: matches.length > 0 ? Math.round(matches.reduce((s, v) => s + v.views, 0) / matches.length) : 0,
      avgCTR: matches.length > 0 ? Math.round(matches.reduce((s, v) => s + v.ctr, 0) / matches.length * 100) / 100 : 0,
      totalSubs: matches.reduce((s, v) => s + v.subs, 0),
    };
  }).filter((t) => t.count > 0).sort((a, b) => b.totalViews - a.totalViews);

  // Best CTR videos
  const bestCTR = [...sorted].filter((v) => v.impressions > 1000).sort((a, b) => b.ctr - a.ctr).slice(0, 3);

  // Compounding detection: videos with older publish dates but high views
  const compounding = sorted.filter((v) => v.views > 10000).slice(0, 3);

  return (
    <Section title="YouTube Content Drivers" color="#C0392B">
      <Insight label="Top Videos Driving Views">
        <div className="space-y-1.5 mt-1">
          {top5.map((v, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-gray-400 mt-0.5">{i + 1}.</span>
              <div>
                <span className="font-medium text-gray-800">{v.title.slice(0, 70)}{v.title.length > 70 ? "…" : ""}</span>
                <span className="text-[11px] text-gray-500 ml-2">{fmt(v.views)} views · {v.ctr}% CTR · +{fmt(v.subs)} subs</span>
                {v.views / totalViews > 0.2 && <Badge color="#1E8449">{Math.round(v.views / totalViews * 100)}% of total</Badge>}
              </div>
            </div>
          ))}
        </div>
      </Insight>

      {topicStats.length > 0 && (
        <Insight label="Topics That Perform">
          <div className="grid grid-cols-2 gap-2 mt-1">
            {topicStats.slice(0, 6).map((t) => (
              <div key={t.keyword} className="bg-gray-50 rounded px-3 py-2">
                <div className="text-[11px] font-semibold text-gray-800 capitalize">{t.keyword}</div>
                <div className="text-[10px] text-gray-500">{t.count} videos · avg {fmt(t.avgViews)} views · {t.avgCTR}% CTR · +{fmt(t.totalSubs)} subs</div>
              </div>
            ))}
          </div>
        </Insight>
      )}

      {bestCTR.length > 0 && (
        <Insight label="Highest Click-Through Rate (discovery potential)">
          {bestCTR.map((v, i) => (
            <div key={i} className="text-[11px]">
              <Badge color="#2E86AB">{v.ctr}% CTR</Badge>
              <span>{v.title.slice(0, 60)} — {fmt(v.views)} views</span>
            </div>
          ))}
        </Insight>
      )}

      <Insight label="Actionable Takeaways">
        <ul className="space-y-1 mt-1">
          {compounding[0] && (
            <li>• <strong>"{compounding[0].title.slice(0, 50)}…"</strong> is your #1 asset ({fmt(compounding[0].views)} views, {Math.round(compounding[0].views / totalViews * 100)}% of total). Create follow-up content.</li>
          )}
          {topicStats[0] && (
            <li>• Topic <strong>"{topicStats[0].keyword}"</strong> drives {fmt(topicStats[0].totalViews)} views across {topicStats[0].count} videos. Double down on this.</li>
          )}
          {bestCTR[0] && bestCTR[0].ctr > 8 && (
            <li>• <strong>{bestCTR[0].ctr}% CTR</strong> on "{bestCTR[0].title.slice(0, 40)}…" means the thumbnail/title works — study what makes it click.</li>
          )}
          {topicStats.length > 1 && topicStats[1].avgCTR > topicStats[0].avgCTR && (
            <li>• <strong>"{topicStats[1].keyword}"</strong> has higher CTR ({topicStats[1].avgCTR}%) than "{topicStats[0].keyword}" ({topicStats[0].avgCTR}%) — consider combining both topics.</li>
          )}
        </ul>
      </Insight>
    </Section>
  );
}

// ===== LINKEDIN DIANNE =====
export function DianneDrivers({ posts }: { posts: DiannePost[] }) {
  if (posts.length === 0) return null;

  const sorted = [...posts].sort((a, b) => b.saves - a.saves);
  const avgImp = posts.reduce((s, p) => s + p.impressions, 0) / posts.length;
  const avgSaves = posts.reduce((s, p) => s + p.saves, 0) / posts.length;

  const breakouts = posts.filter((p) => p.impressions > avgImp * 2);
  const regular = posts.filter((p) => p.impressions <= avgImp * 2);

  const breakoutAvgImp = breakouts.length > 0 ? Math.round(breakouts.reduce((s, p) => s + p.impressions, 0) / breakouts.length) : 0;
  const regularAvgImp = regular.length > 0 ? Math.round(regular.reduce((s, p) => s + p.impressions, 0) / regular.length) : 0;
  const breakoutAvgSaves = breakouts.length > 0 ? Math.round(breakouts.reduce((s, p) => s + p.saves, 0) / breakouts.length) : 0;
  const regularAvgSaves = regular.length > 0 ? Math.round(regular.reduce((s, p) => s + p.saves, 0) / regular.length) : 0;

  // Evening vs daytime performance
  const evening = posts.filter((p) => {
    const note = (p.note ?? "").toLowerCase();
    const time = (p.post_time ?? "").toLowerCase();
    return note.includes("evening") || time.includes("pm") && parseInt(time) >= 5;
  });
  const daytime = posts.filter((p) => !evening.includes(p));

  const eveningAvg = evening.length > 0 ? Math.round(evening.reduce((s, p) => s + p.impressions, 0) / evening.length) : 0;
  const daytimeAvg = daytime.length > 0 ? Math.round(daytime.reduce((s, p) => s + p.impressions, 0) / daytime.length) : 0;

  // Saves rate (saves per 1K impressions)
  const sortedByRate = [...posts].filter((p) => p.impressions > 500).sort((a, b) => (b.saves / b.impressions) - (a.saves / a.impressions));

  return (
    <Section title="LinkedIn Dianne Content Drivers" color="#0077B5">
      <Insight label="Top Posts by Saves (key metric)">
        <div className="space-y-1.5 mt-1">
          {sorted.slice(0, 5).map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-gray-400 mt-0.5">{i + 1}.</span>
              <div>
                <span className="font-medium text-gray-800">{p.date}</span>
                <span className="text-[11px] text-gray-500 ml-2">{fmt(p.saves)} saves · {fmt(p.impressions)} imp · {p.reactions} reactions · +{p.followers} followers</span>
                {p.note && <span className="text-[10px] italic text-gray-400 ml-1">({p.note})</span>}
                {p.impressions > avgImp * 2 && <Badge color="#C0392B">breakout</Badge>}
              </div>
            </div>
          ))}
        </div>
      </Insight>

      <Insight label="Breakout vs Regular Posts">
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="bg-[#D5F5E3] rounded px-3 py-2">
            <div className="text-[11px] font-bold text-[#1E8449]">Breakout Posts ({breakouts.length})</div>
            <div className="text-[10px] text-[#1E8449]">Avg {fmt(breakoutAvgImp)} imp · {fmt(breakoutAvgSaves)} saves</div>
          </div>
          <div className="bg-gray-50 rounded px-3 py-2">
            <div className="text-[11px] font-bold text-gray-600">Regular Posts ({regular.length})</div>
            <div className="text-[10px] text-gray-500">Avg {fmt(regularAvgImp)} imp · {fmt(regularAvgSaves)} saves</div>
          </div>
        </div>
        {breakoutAvgImp > 0 && regularAvgImp > 0 && (
          <div className="text-[11px] mt-1.5">Breakouts drive <strong>{Math.round(breakoutAvgImp / regularAvgImp)}× more impressions</strong> and <strong>{Math.round(breakoutAvgSaves / Math.max(regularAvgSaves, 1))}× more saves</strong>.</div>
        )}
      </Insight>

      {evening.length > 0 && daytime.length > 0 && (
        <Insight label="Post Timing">
          <div className="text-[11px]">
            Daytime posts avg <strong>{fmt(daytimeAvg)} imp</strong> vs evening posts avg <strong>{fmt(eveningAvg)} imp</strong>
            {daytimeAvg > eveningAvg * 1.2 && <span> — evening posts underperform by <strong>{Math.round((1 - eveningAvg / daytimeAvg) * 100)}%</strong>.</span>}
          </div>
        </Insight>
      )}

      {sortedByRate.length > 0 && (
        <Insight label="Best Save Rate (saves per 1K impressions)">
          {sortedByRate.slice(0, 3).map((p, i) => (
            <div key={i} className="text-[11px]">
              <Badge color="#117A65">{Math.round(p.saves / p.impressions * 1000)} per 1K</Badge>
              <span>{p.date} — {p.saves} saves / {fmt(p.impressions)} imp {p.note ? `(${p.note})` : ""}</span>
            </div>
          ))}
        </Insight>
      )}

      <Insight label="Actionable Takeaways">
        <ul className="space-y-1 mt-1">
          <li>• <strong>1 in {Math.round(posts.length / Math.max(breakouts.length, 1))} posts goes breakout</strong> — these drive the majority of saves and followers.</li>
          {evening.length > 0 && daytimeAvg > eveningAvg && (
            <li>• <strong>Avoid evening posts</strong> — they consistently underperform daytime by {Math.round((1 - eveningAvg / daytimeAvg) * 100)}%.</li>
          )}
          {sortedByRate[0] && (
            <li>• Best save rate on <strong>{sortedByRate[0].date}</strong> ({Math.round(sortedByRate[0].saves / sortedByRate[0].impressions * 1000)} saves per 1K imp) — study what made this shareable.</li>
          )}
          <li>• Saves are the leading indicator of evergreen reach — prioritize content that saves well over content with high impressions but low saves.</li>
        </ul>
      </Insight>
    </Section>
  );
}

// ===== LINKEDIN TDP PAGE =====
export function TDPDrivers({ weeks }: { weeks: TDPWeek[] }) {
  if (weeks.length === 0) return null;

  const withPost = weeks.filter((w) => w.note && !/no post/i.test(w.note));
  const withoutPost = weeks.filter((w) => !w.note || /no post/i.test(w.note));

  const avgWithPost = withPost.length > 0 ? Math.round(withPost.reduce((s, w) => s + w.impressions, 0) / withPost.length) : 0;
  const avgWithout = withoutPost.length > 0 ? Math.round(withoutPost.reduce((s, w) => s + w.impressions, 0) / withoutPost.length) : 0;

  const sorted = [...weeks].sort((a, b) => b.impressions - a.impressions);

  return (
    <Section title="TDP Page Content Drivers" color="#1A5276">
      <Insight label="Post Impact on Impressions">
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="bg-[#D5F5E3] rounded px-3 py-2">
            <div className="text-[11px] font-bold text-[#1E8449]">Weeks With Post ({withPost.length})</div>
            <div className="text-[10px] text-[#1E8449]">Avg {fmt(avgWithPost)} imp/week</div>
          </div>
          <div className="bg-gray-50 rounded px-3 py-2">
            <div className="text-[11px] font-bold text-gray-600">Weeks Without ({withoutPost.length})</div>
            <div className="text-[10px] text-gray-500">Avg {fmt(avgWithout)} imp/week</div>
          </div>
        </div>
        {avgWithPost > 0 && avgWithout > 0 && (
          <div className="text-[11px] mt-1.5">Posting drives <strong>{Math.round(avgWithPost / Math.max(avgWithout, 1))}× more impressions</strong>.</div>
        )}
      </Insight>

      <Insight label="Best Performing Posts">
        <div className="space-y-1.5 mt-1">
          {sorted.filter((w) => w.note && !/no post/i.test(w.note)).slice(0, 5).map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-gray-400 mt-0.5">{i + 1}.</span>
              <div>
                <span className="font-medium text-gray-800">{w.week}</span>
                <span className="text-[11px] text-gray-500 ml-2">{fmt(w.impressions)} imp · {fmt(w.clicks)} clicks · {w.ctr}% CTR</span>
                <span className="text-[10px] italic text-gray-400 ml-1">({w.note})</span>
              </div>
            </div>
          ))}
        </div>
      </Insight>

      <Insight label="Actionable Takeaways">
        <ul className="space-y-1 mt-1">
          <li>• <strong>Post every week</strong> — {Math.round(avgWithPost / Math.max(avgWithout, 1))}× impression lift when you do.</li>
          {sorted[0]?.note && <li>• Best post type: <strong>"{sorted[0].note}"</strong> ({fmt(sorted[0].impressions)} imp). Create more of this format.</li>}
          {weeks.filter((w) => w.ctr > 30).length > 0 && <li>• High CTR ({">"}30%) indicates a small but engaged audience — focus on growing page followers.</li>}
        </ul>
      </Insight>
    </Section>
  );
}

// ===== X (TWITTER) =====
export function XDrivers({ weeks }: { weeks: XWeek[] }) {
  if (weeks.length === 0) return null;

  const sorted = [...weeks].sort((a, b) => b.engagements - a.engagements);
  const avgEng = weeks.reduce((s, w) => s + w.engagements, 0) / weeks.length;
  const avgImp = weeks.reduce((s, w) => s + w.impressions, 0) / weeks.length;
  const spikes = sorted.filter((w) => w.engagements > avgEng * 3);
  const totalNetFollows = weeks.reduce((s, w) => s + w.follows - w.unfollows, 0);
  const engRate = avgImp > 0 ? (weeks.reduce((s, w) => s + w.engagements, 0) / weeks.reduce((s, w) => s + w.impressions, 0) * 100) : 0;

  return (
    <Section title="X (Twitter) Content Drivers" color="#111111">
      <Insight label="Spike Weeks (3× above average)">
        {spikes.length === 0 ? (
          <div className="text-[11px] text-gray-400 italic">No spike weeks detected yet.</div>
        ) : (
          <div className="space-y-1.5 mt-1">
            {spikes.map((w, i) => (
              <div key={i}>
                <Badge color="#111111">{Math.round(w.engagements / avgEng)}× avg</Badge>
                <span className="text-[11px]">{w.week}: {fmt(w.engagements)} eng · {fmt(w.impressions)} imp · +{w.follows - w.unfollows} follows</span>
              </div>
            ))}
          </div>
        )}
      </Insight>

      <Insight label="Engagement Metrics">
        <div className="grid grid-cols-3 gap-2 mt-1">
          <div className="bg-gray-50 rounded px-3 py-2">
            <div className="text-[11px] font-bold">Avg Engagement Rate</div>
            <div className="font-mono text-[13px] font-bold">{engRate.toFixed(2)}%</div>
          </div>
          <div className="bg-gray-50 rounded px-3 py-2">
            <div className="text-[11px] font-bold">Net New Follows</div>
            <div className="font-mono text-[13px] font-bold">+{fmt(totalNetFollows)}</div>
          </div>
          <div className="bg-gray-50 rounded px-3 py-2">
            <div className="text-[11px] font-bold">Best Week</div>
            <div className="font-mono text-[13px] font-bold">{sorted[0]?.week ?? "—"}</div>
          </div>
        </div>
      </Insight>

      <Insight label="Actionable Takeaways">
        <ul className="space-y-1 mt-1">
          {spikes.length > 0 && (
            <li>• Your best weeks drive <strong>{Math.round(spikes[0].engagements / avgEng)}× average engagement</strong> — {spikes.length === 1 ? "identify what you posted and repeat it" : `${spikes.length} spike weeks suggest a repeatable content format`}.</li>
          )}
          <li>• Overall engagement rate: <strong>{engRate.toFixed(2)}%</strong> {engRate > 3 ? "(strong — your audience is engaged)" : engRate > 1 ? "(decent — focus on conversation-starting content)" : "(low — try more polls, threads, or hot takes)"}.</li>
          {totalNetFollows > 0 && <li>• +{fmt(totalNetFollows)} net follows in {weeks.length} weeks — {Math.round(totalNetFollows / weeks.length)} followers/week.</li>}
        </ul>
      </Insight>
    </Section>
  );
}

// ===== SHORTS =====
export function ShortsDrivers({ weeks }: { weeks: ShortsWeek[] }) {
  if (weeks.length === 0) return null;

  const sorted = [...weeks].sort((a, b) => b.avg_per_clip - a.avg_per_clip);
  const avgPerClip = weeks.reduce((s, w) => s + w.avg_per_clip * w.clips, 0) / Math.max(weeks.reduce((s, w) => s + w.clips, 0), 1);

  const withNotes = weeks.filter((w) => w.note);

  return (
    <Section title="Shorts Content Drivers" color="#E67E22">
      <Insight label="Best Performing Batches (by avg views/clip)">
        <div className="space-y-1.5 mt-1">
          {sorted.slice(0, 5).map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-gray-400 mt-0.5">{i + 1}.</span>
              <div>
                <span className="font-medium text-gray-800">{w.week}</span>
                <span className="text-[11px] text-gray-500 ml-2">{fmt(w.avg_per_clip)} avg/clip · {w.clips} clips · {fmt(w.total_views)} total</span>
                {w.note && <span className="text-[10px] italic text-gray-400 ml-1">({w.note})</span>}
                {w.avg_per_clip > avgPerClip * 1.5 && <Badge color="#E67E22">top batch</Badge>}
              </div>
            </div>
          ))}
        </div>
      </Insight>

      {withNotes.length > 0 && (
        <Insight label="Content That Works">
          <div className="space-y-1 mt-1">
            {withNotes.sort((a, b) => b.avg_per_clip - a.avg_per_clip).slice(0, 3).map((w, i) => (
              <div key={i} className="text-[11px]">
                <Badge color="#E67E22">{fmt(w.avg_per_clip)}/clip</Badge>
                <span>"{w.note}" — {w.week}</span>
              </div>
            ))}
          </div>
        </Insight>
      )}

      <Insight label="Actionable Takeaways">
        <ul className="space-y-1 mt-1">
          <li>• Overall avg: <strong>{fmt(Math.round(avgPerClip))} views/clip</strong>. Batches above this threshold are your winning formats.</li>
          <li>• <strong>{sorted[0]?.clips ?? 0} clips in your best week</strong> ({sorted[0]?.week ?? "—"}) — {sorted[0]?.avg_per_clip && sorted[0].avg_per_clip > avgPerClip * 1.5 ? "significantly above average. Replicate this batch style." : "consistent performance."}</li>
          <li>• Shorts feed long-form discovery. Your best shorts batches should tease or clip from your highest-performing videos.</li>
        </ul>
      </Insight>
    </Section>
  );
}
