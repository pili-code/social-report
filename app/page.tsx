'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  Download, TrendingUp, TrendingDown, Users, Eye, Heart,
  MessageCircle, Share2, DollarSign, Target, Youtube,
  Twitter, Linkedin, ExternalLink, FileSpreadsheet, RefreshCw,
  Lock, LogOut
} from 'lucide-react'
import { formatNumber, formatCurrency, formatPercent, getChangeColor, getChangeBg, cn } from '@/lib/utils'

// Types
interface ReportData {
  generated_at: string
  period: { start: string; end: string; label: string }
  previous_period: { start: string; end: string }
  cross_platform: {
    youtube?: PlatformData
    instagram?: PlatformData
    tiktok?: PlatformData
    x?: PlatformData
    linkedin?: LinkedInData
    meta_ads?: MetaAdsData
    totals: { total_reach: number; total_reach_change: string; total_followers: number }
  }
  youtube_detail: { top_videos: Video[]; totals: YouTubeTotals }
  tiktok_detail: { daily: DailyData[]; totals: TikTokTotals }
  x_detail: { daily: XDailyData[]; totals: XTotals }
  linkedin_detail: { posts: LinkedInPost[]; demographics: Demographics; totals: LinkedInTotals }
  meta_detail: { campaigns: Campaign[]; totals: MetaTotals }
  customer_wins: CustomerWin[]
  historical_trends: HistoricalTrends
}

interface PlatformData {
  reach_views: number
  reach_change: string
  engagement_rate: number
  engagement_change: string
  new_followers: number
  followers_change: string
  client_inquiries: number
  new_clients: number
}

interface LinkedInData {
  impressions: number
  members_reached: number
  reactions: number
  comments: number
  saves: number
  followers_gained: number
  post_count: number
}

interface MetaAdsData {
  reach: number
  impressions: number
  results: number
  amount_spent: number
  cost_per_result: number
}

interface Video {
  title: string
  views: number
  subs: number
  ctr: number
  revenue: number
  is_short: boolean
  id: string
}

interface YouTubeTotals {
  views: number
  subscribers: number
  revenue: number
  avg_ctr: number
  video_count: number
  shorts_count: number
}

interface DailyData {
  date: string
  views: number
  likes: number
  comments: number
  shares: number
}

interface TikTokTotals {
  views: number
  likes: number
  comments: number
  shares: number
  eng_rate: number
}

interface XDailyData {
  date: string
  impressions: number
  engagements: number
  likes: number
  reposts: number
}

interface XTotals {
  impressions: number
  engagements: number
  likes: number
  new_follows: number
  eng_rate: number
}

interface LinkedInPost {
  url: string
  date: string
  impressions: number
  reached: number
  reactions: number
  comments: number
  saves: number
}

interface LinkedInTotals {
  impressions: number
  reached: number
  reactions: number
  comments: number
  followers: number
  post_count: number
}

interface Demographics {
  industry: { name: string; pct: number }[]
  seniority: { name: string; pct: number }[]
  company_size: { name: string; pct: number }[]
  location: { name: string; pct: number }[]
}

interface Campaign {
  name: string
  status: string
  results: number
  reach: number
  impressions: number
  spent: number
  cpr: number
}

interface MetaTotals {
  reach: number
  impressions: number
  results: number
  spent: number
  avg_cpr: number
}

interface CustomerWin {
  date: string
  customer: string
  platform: string
  content: string
  value: string
  status: string
}

interface HistoricalTrends {
  weeks: string[]
  youtube_reach: number[]
  instagram_reach: number[]
  tiktok_reach: number[]
  x_reach: number[]
  total_reach: number[]
}

const PLATFORM_COLORS = {
  youtube: '#FF0000',
  instagram: '#E1306C',
  tiktok: '#000000',
  x: '#1DA1F2',
  linkedin: '#0077B5',
  meta: '#1877F2',
}

const DEMO_COLORS = ['#16213E', '#2E4057', '#4A6274', '#6B8591', '#8CA7AE']

// Data URL - reads from same repo
const DATA_URL = 'https://raw.githubusercontent.com/pili-code/social-report/main/reports/latest.json'
const XLSX_URL = 'https://github.com/pili-code/social-report/raw/main/reports/latest.xlsx'

// Password for access
const ACCESS_PASSWORD = 'TDP2026'
const AUTH_KEY = 'tdp_dashboard_auth'

// ============================================================================
// Password Gate Component
// ============================================================================
function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    // Small delay to feel more secure
    setTimeout(() => {
      if (password === ACCESS_PASSWORD) {
        localStorage.setItem(AUTH_KEY, 'true')
        onSuccess()
      } else {
        setError(true)
        setPassword('')
      }
      setLoading(false)
    }, 500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-dark to-gray-900 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-dark rounded-full mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TDP Dashboard</h1>
          <p className="text-gray-500 mt-2">Enter password to access analytics</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className={cn(
                "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-dark transition-colors",
                error ? "border-red-500 bg-red-50" : "border-gray-300"
              )}
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">Incorrect password. Please try again.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className={cn(
              "w-full py-3 rounded-lg font-medium text-white transition-all",
              loading || !password
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-brand-dark hover:bg-opacity-90"
            )}
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              "Access Dashboard"
            )}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          The Design Project
        </p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Check authentication on mount
  useEffect(() => {
    const auth = localStorage.getItem(AUTH_KEY)
    setIsAuthenticated(auth === 'true')
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to fetch data')
      const json = await response.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_KEY)
    setIsAuthenticated(false)
    setData(null)
  }

  function handleDownloadXLSX() {
    window.open(XLSX_URL, '_blank')
  }

  function handleOpenGoogleSheets() {
    const sheetsUrl = `https://docs.google.com/spreadsheets/d/create?title=TDP_Social_Report_${data?.period.start}`
    window.open(sheetsUrl, '_blank')
  }

  // Show nothing while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-dark" />
      </div>
    )
  }

  // Show password gate if not authenticated
  if (!isAuthenticated) {
    return <PasswordGate onSuccess={() => setIsAuthenticated(true)} />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-dark mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'No data available'}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-brand-dark text-white rounded-lg hover:bg-opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'youtube', label: 'YouTube', color: PLATFORM_COLORS.youtube },
    { id: 'tiktok', label: 'TikTok', color: PLATFORM_COLORS.tiktok },
    { id: 'x', label: 'X', color: PLATFORM_COLORS.x },
    { id: 'linkedin', label: 'LinkedIn', color: PLATFORM_COLORS.linkedin },
    { id: 'meta', label: 'Meta Ads', color: PLATFORM_COLORS.meta },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">The Design Project</h1>
              <p className="text-gray-300 text-sm">Social Media Performance Dashboard</p>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <p className="text-sm text-gray-300">{data.period.label}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadXLSX}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
                <button
                  onClick={handleOpenGoogleSheets}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Google Sheets
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto pb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-gray-50 text-brand-dark"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                )}
                style={activeTab === tab.id && tab.color ? { borderTop: `3px solid ${tab.color}` } : {}}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'youtube' && <YouTubeTab data={data} />}
        {activeTab === 'tiktok' && <TikTokTab data={data} />}
        {activeTab === 'x' && <XTab data={data} />}
        {activeTab === 'linkedin' && <LinkedInTab data={data} />}
        {activeTab === 'meta' && <MetaTab data={data} />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          Last updated: {new Date(data.generated_at).toLocaleString()}
        </div>
      </footer>
    </div>
  )
}

// ============================================================================
// Overview Tab
// ============================================================================
function OverviewTab({ data }: { data: ReportData }) {
  const platforms = [
    { key: 'youtube', name: 'YouTube', icon: Youtube, color: PLATFORM_COLORS.youtube },
    { key: 'instagram', name: 'Instagram', icon: Heart, color: PLATFORM_COLORS.instagram },
    { key: 'tiktok', name: 'TikTok', icon: Share2, color: PLATFORM_COLORS.tiktok },
    { key: 'x', name: 'X (Twitter)', icon: Twitter, color: PLATFORM_COLORS.x },
  ]

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Reach"
          value={formatNumber(data.cross_platform.totals.total_reach)}
          change={data.cross_platform.totals.total_reach_change}
          icon={Eye}
        />
        <KPICard
          title="New Followers"
          value={formatNumber(data.cross_platform.totals.total_followers)}
          change=""
          icon={Users}
        />
        <KPICard
          title="Meta Ads Reach"
          value={formatNumber(data.cross_platform.meta_ads?.reach || 0)}
          change=""
          icon={Target}
          subtitle={`$${data.cross_platform.meta_ads?.amount_spent.toFixed(2)} spent`}
        />
        <KPICard
          title="LinkedIn Impressions"
          value={formatNumber(data.cross_platform.linkedin?.impressions || 0)}
          change=""
          icon={Linkedin}
          subtitle={`${data.cross_platform.linkedin?.post_count || 0} posts`}
        />
      </div>

      {/* Cross-Platform Comparison */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cross-Platform Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Platform</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Reach/Views</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Change</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Eng. Rate</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">New Followers</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((platform) => {
                const pData = data.cross_platform[platform.key as keyof typeof data.cross_platform] as PlatformData | undefined
                if (!pData) return null
                return (
                  <tr key={platform.key} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: platform.color }}
                        />
                        {platform.name}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-medium">
                      {formatNumber(pData.reach_views)}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={cn("px-2 py-1 rounded text-sm", getChangeBg(pData.reach_change), getChangeColor(pData.reach_change))}>
                        {pData.reach_change}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      {formatPercent(pData.engagement_rate)}
                    </td>
                    <td className="text-right py-3 px-4">
                      {formatNumber(pData.new_followers)}
                    </td>
                  </tr>
                )
              })}
              {/* LinkedIn row */}
              {data.cross_platform.linkedin && (
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLATFORM_COLORS.linkedin }} />
                      LinkedIn
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 font-medium">
                    {formatNumber(data.cross_platform.linkedin.impressions)}
                  </td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4">
                    {data.cross_platform.linkedin.followers_gained}
                  </td>
                </tr>
              )}
              {/* Meta Ads row */}
              {data.cross_platform.meta_ads && (
                <tr className="border-b hover:bg-gray-50 bg-blue-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLATFORM_COLORS.meta }} />
                      Meta Ads (Paid)
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 font-medium">
                    {formatNumber(data.cross_platform.meta_ads.reach)}
                  </td>
                  <td className="text-right py-3 px-4">
                    {formatCurrency(data.cross_platform.meta_ads.amount_spent)}
                  </td>
                  <td className="text-right py-3 px-4">
                    {data.cross_platform.meta_ads.results} results
                  </td>
                  <td className="text-right py-3 px-4">-</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trends Chart */}
      {data.historical_trends.weeks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Historical Reach Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.historical_trends.weeks.map((week, i) => ({
              week: week.slice(5),
              YouTube: data.historical_trends.youtube_reach[i],
              Instagram: data.historical_trends.instagram_reach[i],
              TikTok: data.historical_trends.tiktok_reach[i],
              X: data.historical_trends.x_reach[i],
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="YouTube" stroke={PLATFORM_COLORS.youtube} strokeWidth={2} />
              <Line type="monotone" dataKey="Instagram" stroke={PLATFORM_COLORS.instagram} strokeWidth={2} />
              <Line type="monotone" dataKey="TikTok" stroke={PLATFORM_COLORS.tiktok} strokeWidth={2} />
              <Line type="monotone" dataKey="X" stroke={PLATFORM_COLORS.x} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Customer Wins */}
      {data.customer_wins.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Wins from Social</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Platform</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Content</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Value</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.customer_wins.map((win, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{win.date}</td>
                    <td className="py-3 px-4 font-medium">{win.customer}</td>
                    <td className="py-3 px-4">{win.platform}</td>
                    <td className="py-3 px-4 text-gray-600">{win.content}</td>
                    <td className="text-right py-3 px-4 font-medium text-green-600">{win.value}</td>
                    <td className="text-center py-3 px-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        win.status === 'Won' ? 'bg-green-100 text-green-800' :
                        win.status === 'In Pipeline' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      )}>
                        {win.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// YouTube Tab
// ============================================================================
function YouTubeTab({ data }: { data: ReportData }) {
  const yt = data.youtube_detail

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPICard title="Views" value={formatNumber(yt.totals.views)} icon={Eye} small />
        <KPICard title="Subscribers" value={formatNumber(yt.totals.subscribers)} icon={Users} small />
        <KPICard title="Revenue" value={formatCurrency(yt.totals.revenue)} icon={DollarSign} small />
        <KPICard title="Avg CTR" value={formatPercent(yt.totals.avg_ctr)} icon={Target} small />
        <KPICard title="Videos" value={yt.totals.video_count.toString()} icon={Youtube} small />
        <KPICard title="Shorts" value={yt.totals.shorts_count.toString()} icon={Youtube} small />
      </div>

      {/* Top Videos */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Videos</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Title</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Views</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Subs</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">CTR</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Revenue</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Type</th>
              </tr>
            </thead>
            <tbody>
              {yt.top_videos.map((video, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <a
                      href={`https://youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {video.title.slice(0, 50)}{video.title.length > 50 ? '...' : ''}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="text-right py-3 px-4 font-medium">{formatNumber(video.views)}</td>
                  <td className="text-right py-3 px-4 text-green-600">+{video.subs}</td>
                  <td className="text-right py-3 px-4">{formatPercent(video.ctr)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(video.revenue)}</td>
                  <td className="text-center py-3 px-4">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs",
                      video.is_short ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    )}>
                      {video.is_short ? 'Short' : 'Video'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TikTok Tab
// ============================================================================
function TikTokTab({ data }: { data: ReportData }) {
  const tt = data.tiktok_detail

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard title="Views" value={formatNumber(tt.totals.views)} icon={Eye} small />
        <KPICard title="Likes" value={formatNumber(tt.totals.likes)} icon={Heart} small />
        <KPICard title="Comments" value={formatNumber(tt.totals.comments)} icon={MessageCircle} small />
        <KPICard title="Shares" value={formatNumber(tt.totals.shares)} icon={Share2} small />
        <KPICard title="Eng. Rate" value={formatPercent(tt.totals.eng_rate)} icon={TrendingUp} small />
      </div>

      {/* Daily Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Performance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tt.daily}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="views" fill={PLATFORM_COLORS.tiktok} name="Views" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Table */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Views</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Likes</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Comments</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Shares</th>
              </tr>
            </thead>
            <tbody>
              {tt.daily.map((day, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{day.date}</td>
                  <td className="text-right py-3 px-4 font-medium">{formatNumber(day.views)}</td>
                  <td className="text-right py-3 px-4">{day.likes}</td>
                  <td className="text-right py-3 px-4">{day.comments}</td>
                  <td className="text-right py-3 px-4">{day.shares}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// X Tab
// ============================================================================
function XTab({ data }: { data: ReportData }) {
  const x = data.x_detail

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard title="Impressions" value={formatNumber(x.totals.impressions)} icon={Eye} small />
        <KPICard title="Engagements" value={formatNumber(x.totals.engagements)} icon={Heart} small />
        <KPICard title="Likes" value={formatNumber(x.totals.likes)} icon={Heart} small />
        <KPICard title="New Follows" value={formatNumber(x.totals.new_follows)} icon={Users} small />
        <KPICard title="Eng. Rate" value={formatPercent(x.totals.eng_rate)} icon={TrendingUp} small />
      </div>

      {/* Daily Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Impressions</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={x.daily}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="impressions" fill={PLATFORM_COLORS.x} name="Impressions" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ============================================================================
// LinkedIn Tab
// ============================================================================
function LinkedInTab({ data }: { data: ReportData }) {
  const li = data.linkedin_detail

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard title="Impressions" value={formatNumber(li.totals.impressions)} icon={Eye} small />
        <KPICard title="Reached" value={formatNumber(li.totals.reached)} icon={Users} small />
        <KPICard title="Reactions" value={formatNumber(li.totals.reactions)} icon={Heart} small />
        <KPICard title="Comments" value={formatNumber(li.totals.comments)} icon={MessageCircle} small />
        <KPICard title="Followers" value={`+${li.totals.followers}`} icon={Users} small />
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Industry */}
        {li.demographics.industry?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Industry</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={li.demographics.industry.slice(0, 5)}
                  dataKey="pct"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, pct }) => `${pct}%`}
                >
                  {li.demographics.industry.slice(0, 5).map((_, i) => (
                    <Cell key={i} fill={DEMO_COLORS[i % DEMO_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {li.demographics.industry.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEMO_COLORS[i] }} />
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seniority */}
        {li.demographics.seniority?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seniority</h3>
            <div className="space-y-3">
              {li.demographics.seniority.slice(0, 5).map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-medium">{item.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${item.pct}%`, backgroundColor: PLATFORM_COLORS.linkedin }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Company Size */}
        {li.demographics.company_size?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Size</h3>
            <div className="space-y-3">
              {li.demographics.company_size.slice(0, 5).map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-medium">{item.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${item.pct}%`, backgroundColor: PLATFORM_COLORS.linkedin }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        {li.demographics.location?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
            <div className="space-y-3">
              {li.demographics.location.slice(0, 5).map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-medium">{item.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${item.pct}%`, backgroundColor: PLATFORM_COLORS.linkedin }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Meta Ads Tab
// ============================================================================
function MetaTab({ data }: { data: ReportData }) {
  const meta = data.meta_detail

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard title="Reach" value={formatNumber(meta.totals.reach)} icon={Eye} small />
        <KPICard title="Impressions" value={formatNumber(meta.totals.impressions)} icon={Eye} small />
        <KPICard title="Results" value={formatNumber(meta.totals.results)} icon={Target} small />
        <KPICard title="Spent" value={formatCurrency(meta.totals.spent)} icon={DollarSign} small />
        <KPICard title="Cost/Result" value={formatCurrency(meta.totals.avg_cpr)} icon={DollarSign} small />
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaigns</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Campaign</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Results</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Reach</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Spent</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">CPR</th>
              </tr>
            </thead>
            <tbody>
              {meta.campaigns.map((campaign, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 max-w-xs truncate">{campaign.name}</td>
                  <td className="text-center py-3 px-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      campaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    )}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="text-right py-3 px-4 font-medium">{formatNumber(campaign.results)}</td>
                  <td className="text-right py-3 px-4">{formatNumber(campaign.reach)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(campaign.spent)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(campaign.cpr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// KPI Card Component
// ============================================================================
function KPICard({
  title,
  value,
  change,
  icon: Icon,
  subtitle,
  small
}: {
  title: string
  value: string
  change?: string
  icon: React.ComponentType<{ className?: string }>
  subtitle?: string
  small?: boolean
}) {
  return (
    <div className={cn(
      "bg-white rounded-xl shadow-sm border",
      small ? "p-4" : "p-6"
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={cn("font-bold text-gray-900", small ? "text-xl" : "text-2xl")}>
            {value}
          </p>
          {change && (
            <p className={cn("text-sm mt-1", getChangeColor(change))}>
              {change}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "rounded-lg bg-gray-100 flex items-center justify-center",
          small ? "p-2" : "p-3"
        )}>
          <Icon className={cn("text-gray-600", small ? "w-4 h-4" : "w-5 h-5")} />
        </div>
      </div>
    </div>
  )
}
