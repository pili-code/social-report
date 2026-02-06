'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  Download, TrendingUp, Users, Eye, Heart,
  MessageCircle, Share2, DollarSign, Target, Youtube,
  Twitter, Linkedin, ExternalLink, RefreshCw,
  Lock, LogOut, Calendar, ChevronDown
} from 'lucide-react'
import { formatNumber, formatCurrency, formatPercent, getChangeColor, getChangeBg, cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================
interface HistoricalData {
  generated_at: string
  date_range: { earliest: string; latest: string; weeks_count: number }
  weekly_summary: WeeklySummaryRow[]
  tiktok_daily: TikTokDailyRow[]
  x_daily: XDailyRow[]
  youtube_videos: YouTubeVideoRow[]
  meta_campaigns: MetaCampaignRow[]
  linkedin_posts: LinkedInPostRow[]
  linkedin_demographics: LinkedInDemoRow[]
  customer_wins: CustomerWinRow[]
}

interface WeeklySummaryRow {
  week_date: string
  platform: string
  metric: string
  value: number
}

interface TikTokDailyRow {
  date: string
  views: number
  profile_views: number
  likes: number
  comments: number
  shares: number
}

interface XDailyRow {
  date: string
  impressions: number
  likes: number
  engagements: number
  new_follows: number
  reposts: number
}

interface YouTubeVideoRow {
  id: string
  title: string
  week_start: string
  views: number
  subs: number
  revenue: number
  ctr: number
  is_short: boolean
}

interface MetaCampaignRow {
  name: string
  start: string
  status: string
  results: number
  reach: number
  impressions: number
  cpr: number
  spent: number
}

interface LinkedInPostRow {
  url: string
  date: string
  impressions: number
  reached: number
  followers: number
  reactions: number
  comments: number
  saves: number
}

interface LinkedInDemoRow {
  post_url: string
  category: string
  value: string
  pct: number
}

interface CustomerWinRow {
  id: number
  date: string
  customer: string
  platform: string
  content: string
  value: string
  status: string
}

interface AggregatedData {
  period: { start: string; end: string; label: string }
  crossPlatform: {
    [platform: string]: {
      reach_views: number
      prev_reach_views: number
      reach_change: string
      engagement_rate: number
      engagement_change: string
      new_followers: number
      followers_change: string
      client_inquiries: number
      new_clients: number
    }
  }
  totals: {
    total_reach: number
    prev_total_reach: number
    total_reach_change: string
    total_followers: number
  }
  tiktok: { daily: TikTokDailyRow[]; totals: { views: number; likes: number; comments: number; shares: number; eng_rate: number } }
  x: { daily: XDailyRow[]; totals: { impressions: number; engagements: number; likes: number; new_follows: number; eng_rate: number } }
  youtube: { videos: YouTubeVideoRow[]; totals: { views: number; subscribers: number; revenue: number; avg_ctr: number; video_count: number; shorts_count: number } }
  meta: { campaigns: MetaCampaignRow[]; totals: { reach: number; impressions: number; results: number; spent: number; avg_cpr: number } }
  linkedin: { posts: LinkedInPostRow[]; demographics: { industry: { name: string; pct: number }[]; seniority: { name: string; pct: number }[]; company_size: { name: string; pct: number }[]; location: { name: string; pct: number }[] }; totals: { impressions: number; reached: number; reactions: number; comments: number; followers: number; post_count: number } }
  customerWins: CustomerWinRow[]
  historicalTrends: { weeks: string[]; youtube_reach: number[]; instagram_reach: number[]; tiktok_reach: number[]; x_reach: number[]; total_reach: number[] }
}

type TimeFrame = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'all_time' | 'custom'

const TIME_FRAME_OPTIONS: { value: TimeFrame; label: string }[] = [
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all_time', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
]

const PLATFORM_COLORS = {
  youtube: '#FF0000',
  instagram: '#E1306C',
  tiktok: '#000000',
  x: '#1DA1F2',
  linkedin: '#0077B5',
  meta: '#1877F2',
}

const DEMO_COLORS = ['#16213E', '#2E4057', '#4A6274', '#6B8591', '#8CA7AE']

const DATA_URL = 'https://raw.githubusercontent.com/pili-code/social-report/main/reports/historical.json'
const XLSX_URL = 'https://github.com/pili-code/social-report/raw/main/reports/latest.xlsx'

const ACCESS_PASSWORD = 'TDP2026'
const AUTH_KEY = 'tdp_dashboard_auth'

// ============================================================================
// Date Helpers
// ============================================================================
function getDateRange(timeFrame: TimeFrame, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (timeFrame) {
    case 'this_week': {
      const dayOfWeek = today.getDay()
      const start = new Date(today)
      start.setDate(today.getDate() - dayOfWeek)
      return { start, end: today }
    }
    case 'last_week': {
      const dayOfWeek = today.getDay()
      const end = new Date(today)
      end.setDate(today.getDate() - dayOfWeek - 1)
      const start = new Date(end)
      start.setDate(end.getDate() - 6)
      return { start, end }
    }
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start, end: today }
    }
    case 'last_month': {
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      return { start, end }
    }
    case 'last_3_months': {
      const start = new Date(today)
      start.setMonth(start.getMonth() - 3)
      return { start, end: today }
    }
    case 'last_6_months': {
      const start = new Date(today)
      start.setMonth(start.getMonth() - 6)
      return { start, end: today }
    }
    case 'this_year': {
      const start = new Date(today.getFullYear(), 0, 1)
      return { start, end: today }
    }
    case 'all_time': {
      return { start: new Date(2020, 0, 1), end: today }
    }
    case 'custom': {
      return {
        start: customStart ? new Date(customStart) : new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: customEnd ? new Date(customEnd) : today
      }
    }
  }
}

function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDateLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', yearOpts)}`
}

function pctChange(oldVal: number, newVal: number): string {
  if (oldVal === 0) return newVal > 0 ? '+inf%' : '0%'
  const change = ((newVal - oldVal) / oldVal) * 100
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
}

// ============================================================================
// Data Aggregation
// ============================================================================
function aggregateData(data: HistoricalData, timeFrame: TimeFrame, customStart?: string, customEnd?: string): AggregatedData {
  const { start, end } = getDateRange(timeFrame, customStart, customEnd)
  const startStr = formatDateStr(start)
  const endStr = formatDateStr(end)

  const periodLength = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000)
  const prevStart = new Date(prevEnd.getTime() - periodLength)
  const prevStartStr = formatDateStr(prevStart)
  const prevEndStr = formatDateStr(prevEnd)

  const currentWeekly = data.weekly_summary.filter(r => r.week_date >= startStr && r.week_date <= endStr)
  const prevWeekly = data.weekly_summary.filter(r => r.week_date >= prevStartStr && r.week_date <= prevEndStr)

  const crossPlatform: AggregatedData['crossPlatform'] = {}
  const platforms = ['youtube', 'instagram', 'tiktok', 'x']

  for (const platform of platforms) {
    const currentPlatform = currentWeekly.filter(r => r.platform === platform)
    const prevPlatform = prevWeekly.filter(r => r.platform === platform)

    const getMetricSum = (rows: WeeklySummaryRow[], metric: string) =>
      rows.filter(r => r.metric === metric).reduce((sum, r) => sum + r.value, 0)
    const getMetricAvg = (rows: WeeklySummaryRow[], metric: string) => {
      const vals = rows.filter(r => r.metric === metric)
      return vals.length > 0 ? vals.reduce((sum, r) => sum + r.value, 0) / vals.length : 0
    }

    const reach = getMetricSum(currentPlatform, 'Reach/Views')
    const prevReach = getMetricSum(prevPlatform, 'Reach/Views')
    const engRate = getMetricAvg(currentPlatform, 'Engagement Rate')
    const prevEngRate = getMetricAvg(prevPlatform, 'Engagement Rate')
    const followers = getMetricSum(currentPlatform, 'New Followers')
    const prevFollowers = getMetricSum(prevPlatform, 'New Followers')

    crossPlatform[platform] = {
      reach_views: reach,
      prev_reach_views: prevReach,
      reach_change: pctChange(prevReach, reach),
      engagement_rate: engRate,
      engagement_change: pctChange(prevEngRate, engRate),
      new_followers: followers,
      followers_change: pctChange(prevFollowers, followers),
      client_inquiries: getMetricSum(currentPlatform, 'Client Inquiries'),
      new_clients: getMetricSum(currentPlatform, 'New Clients')
    }
  }

  const totalReach = Object.values(crossPlatform).reduce((sum, p) => sum + p.reach_views, 0)
  const prevTotalReach = Object.values(crossPlatform).reduce((sum, p) => sum + p.prev_reach_views, 0)
  const totalFollowers = Object.values(crossPlatform).reduce((sum, p) => sum + p.new_followers, 0)

  const tiktokDaily = data.tiktok_daily.filter(r => r.date >= startStr && r.date <= endStr)
  const tiktokTotals = {
    views: tiktokDaily.reduce((s, r) => s + r.views, 0),
    likes: tiktokDaily.reduce((s, r) => s + r.likes, 0),
    comments: tiktokDaily.reduce((s, r) => s + r.comments, 0),
    shares: tiktokDaily.reduce((s, r) => s + r.shares, 0),
    eng_rate: 0
  }
  const tiktokEng = tiktokTotals.likes + tiktokTotals.comments + tiktokTotals.shares
  tiktokTotals.eng_rate = tiktokTotals.views > 0 ? (tiktokEng / tiktokTotals.views) * 100 : 0

  const xDaily = data.x_daily.filter(r => r.date >= startStr && r.date <= endStr)
  const xTotals = {
    impressions: xDaily.reduce((s, r) => s + r.impressions, 0),
    engagements: xDaily.reduce((s, r) => s + r.engagements, 0),
    likes: xDaily.reduce((s, r) => s + r.likes, 0),
    new_follows: xDaily.reduce((s, r) => s + r.new_follows, 0),
    eng_rate: 0
  }
  xTotals.eng_rate = xTotals.impressions > 0 ? (xTotals.engagements / xTotals.impressions) * 100 : 0

  const ytVideos = data.youtube_videos.filter(r => r.week_start >= startStr && r.week_start <= endStr)
  const ytTotals = {
    views: ytVideos.reduce((s, r) => s + r.views, 0),
    subscribers: ytVideos.reduce((s, r) => s + r.subs, 0),
    revenue: ytVideos.reduce((s, r) => s + r.revenue, 0),
    avg_ctr: ytVideos.length > 0 ? ytVideos.reduce((s, r) => s + r.ctr, 0) / ytVideos.length : 0,
    video_count: ytVideos.length,
    shorts_count: ytVideos.filter(v => v.is_short).length
  }

  const metaCampaigns = data.meta_campaigns.filter(r => r.start >= startStr && r.start <= endStr)
  const metaTotals = {
    reach: metaCampaigns.reduce((s, r) => s + r.reach, 0),
    impressions: metaCampaigns.reduce((s, r) => s + r.impressions, 0),
    results: metaCampaigns.reduce((s, r) => s + r.results, 0),
    spent: metaCampaigns.reduce((s, r) => s + r.spent, 0),
    avg_cpr: 0
  }
  metaTotals.avg_cpr = metaTotals.results > 0 ? metaTotals.spent / metaTotals.results : 0

  const liPosts = data.linkedin_posts.filter(r => r.date >= startStr && r.date <= endStr)
  const liTotals = {
    impressions: liPosts.reduce((s, r) => s + r.impressions, 0),
    reached: liPosts.reduce((s, r) => s + r.reached, 0),
    reactions: liPosts.reduce((s, r) => s + r.reactions, 0),
    comments: liPosts.reduce((s, r) => s + r.comments, 0),
    followers: liPosts.reduce((s, r) => s + r.followers, 0),
    post_count: liPosts.length
  }

  const postUrls = new Set(liPosts.map(p => p.url))
  const relevantDemos = data.linkedin_demographics.filter(d => postUrls.has(d.post_url))
  const demoByCategory: { [cat: string]: { [val: string]: number[] } } = {}
  for (const d of relevantDemos) {
    const cat = d.category.toLowerCase().replace(' ', '_')
    if (!demoByCategory[cat]) demoByCategory[cat] = {}
    if (!demoByCategory[cat][d.value]) demoByCategory[cat][d.value] = []
    demoByCategory[cat][d.value].push(d.pct)
  }
  const demographics: AggregatedData['linkedin']['demographics'] = { industry: [], seniority: [], company_size: [], location: [] }
  for (const cat of ['industry', 'seniority', 'company_size', 'location']) {
    if (demoByCategory[cat]) {
      demographics[cat as keyof typeof demographics] = Object.entries(demoByCategory[cat])
        .map(([name, pcts]) => ({ name, pct: (pcts.reduce((a, b) => a + b, 0) / pcts.length) * 100 }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5)
    }
  }

  const wins = data.customer_wins.filter(r => r.date >= startStr && r.date <= endStr)

  const weeklyByWeek: { [week: string]: { [platform: string]: number } } = {}
  for (const r of data.weekly_summary.filter(r => r.metric === 'Reach/Views')) {
    if (!weeklyByWeek[r.week_date]) weeklyByWeek[r.week_date] = {}
    weeklyByWeek[r.week_date][r.platform] = r.value
  }
  const weeks = Object.keys(weeklyByWeek).sort()
  const historicalTrends = {
    weeks,
    youtube_reach: weeks.map(w => weeklyByWeek[w]?.youtube || 0),
    instagram_reach: weeks.map(w => weeklyByWeek[w]?.instagram || 0),
    tiktok_reach: weeks.map(w => weeklyByWeek[w]?.tiktok || 0),
    x_reach: weeks.map(w => weeklyByWeek[w]?.x || 0),
    total_reach: weeks.map(w => Object.values(weeklyByWeek[w] || {}).reduce((a, b) => a + b, 0))
  }

  return {
    period: { start: startStr, end: endStr, label: formatDateLabel(start, end) },
    crossPlatform,
    totals: { total_reach: totalReach, prev_total_reach: prevTotalReach, total_reach_change: pctChange(prevTotalReach, totalReach), total_followers: totalFollowers },
    tiktok: { daily: tiktokDaily, totals: tiktokTotals },
    x: { daily: xDaily, totals: xTotals },
    youtube: { videos: ytVideos.sort((a, b) => b.views - a.views).slice(0, 10), totals: ytTotals },
    meta: { campaigns: metaCampaigns, totals: metaTotals },
    linkedin: { posts: liPosts, demographics, totals: liTotals },
    customerWins: wins,
    historicalTrends
  }
}

// ============================================================================
// Password Gate
// ============================================================================
function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)
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
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password"
              className={cn("w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-dark transition-colors", error ? "border-red-500 bg-red-50" : "border-gray-300")} autoFocus />
            {error && <p className="text-red-500 text-sm mt-2">Incorrect password. Please try again.</p>}
          </div>
          <button type="submit" disabled={loading || !password}
            className={cn("w-full py-3 rounded-lg font-medium text-white transition-all", loading || !password ? "bg-gray-400 cursor-not-allowed" : "bg-brand-dark hover:bg-opacity-90")}>
            {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Access Dashboard"}
          </button>
        </form>
        <p className="text-center text-gray-400 text-sm mt-6">The Design Project</p>
      </div>
    </div>
  )
}

// ============================================================================
// Time Frame Selector
// ============================================================================
function TimeFrameSelector({ value, onChange, customStart, customEnd, onCustomStartChange, onCustomEndChange, dataRange }: {
  value: TimeFrame; onChange: (tf: TimeFrame) => void; customStart: string; customEnd: string
  onCustomStartChange: (d: string) => void; onCustomEndChange: (d: string) => void; dataRange: { earliest: string; latest: string }
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = TIME_FRAME_OPTIONS.find(o => o.value === value)

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-gray-700">{selectedOption?.label}</span>
        <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            <div className="p-2">
              {TIME_FRAME_OPTIONS.map((option) => (
                <button key={option.value} onClick={() => { onChange(option.value); if (option.value !== 'custom') setIsOpen(false) }}
                  className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors", value === option.value ? "bg-brand-dark text-white" : "hover:bg-gray-100 text-gray-700")}>
                  {option.label}
                </button>
              ))}
            </div>
            {value === 'custom' && (
              <div className="border-t p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                  <input type="date" value={customStart} min={dataRange.earliest} max={customEnd || dataRange.latest}
                    onChange={(e) => onCustomStartChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                  <input type="date" value={customEnd} min={customStart || dataRange.earliest} max={dataRange.latest}
                    onChange={(e) => onCustomEndChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark" />
                </div>
                <button onClick={() => setIsOpen(false)} className="w-full py-2 bg-brand-dark text-white rounded-lg text-sm font-medium hover:bg-opacity-90">Apply</button>
              </div>
            )}
            <div className="border-t px-4 py-2 bg-gray-50">
              <p className="text-xs text-gray-500">Data available: {dataRange.earliest} to {dataRange.latest}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Main Dashboard
// ============================================================================
export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [rawData, setRawData] = useState<HistoricalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all_time')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  useEffect(() => {
    const auth = localStorage.getItem(AUTH_KEY)
    setIsAuthenticated(auth === 'true')
  }, [])

  useEffect(() => {
    if (isAuthenticated) fetchData()
  }, [isAuthenticated])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to fetch data')
      const json = await response.json()
      setRawData(json)
      if (json.date_range) {
        setCustomStart(json.date_range.earliest || '')
        setCustomEnd(json.date_range.latest || '')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const data = useMemo(() => {
    if (!rawData) return null
    return aggregateData(rawData, timeFrame, customStart, customEnd)
  }, [rawData, timeFrame, customStart, customEnd])

  function handleLogout() {
    localStorage.removeItem(AUTH_KEY)
    setIsAuthenticated(false)
    setRawData(null)
  }

  if (isAuthenticated === null) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><RefreshCw className="w-8 h-8 animate-spin text-brand-dark" /></div>
  }
  if (!isAuthenticated) {
    return <PasswordGate onSuccess={() => setIsAuthenticated(true)} />
  }
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><RefreshCw className="w-8 h-8 animate-spin text-brand-dark mx-auto mb-4" /><p className="text-gray-600">Loading dashboard...</p></div></div>
  }
  if (error || !data || !rawData) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><p className="text-red-600 mb-4">{error || 'No data available'}</p><button onClick={fetchData} className="px-4 py-2 bg-brand-dark text-white rounded-lg hover:bg-opacity-90">Retry</button></div></div>
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
      <header className="bg-brand-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">The Design Project</h1>
              <p className="text-gray-300 text-sm">Social Media Performance Dashboard</p>
            </div>
            <div className="flex flex-col sm:items-end gap-3">
              <TimeFrameSelector value={timeFrame} onChange={setTimeFrame} customStart={customStart} customEnd={customEnd}
                onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} dataRange={rawData.date_range} />
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-300">{data.period.label}</p>
                <button onClick={() => window.open(XLSX_URL, '_blank')} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
                  <Download className="w-4 h-4" />Excel
                </button>
                <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto pb-px">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
                  activeTab === tab.id ? "bg-gray-50 text-brand-dark" : "text-gray-300 hover:text-white hover:bg-white/10")}
                style={activeTab === tab.id && tab.color ? { borderTop: `3px solid ${tab.color}` } : {}}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'youtube' && <YouTubeTab data={data} />}
        {activeTab === 'tiktok' && <TikTokTab data={data} />}
        {activeTab === 'x' && <XTab data={data} />}
        {activeTab === 'linkedin' && <LinkedInTab data={data} />}
        {activeTab === 'meta' && <MetaTab data={data} />}
      </main>
      <footer className="bg-white border-t py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          Viewing: {data.period.label} | Data range: {rawData.date_range.earliest} to {rawData.date_range.latest}
        </div>
      </footer>
    </div>
  )
}

// ============================================================================
// Overview Tab
// ============================================================================
function OverviewTab({ data }: { data: AggregatedData }) {
  const platforms = [
    { key: 'youtube', name: 'YouTube', icon: Youtube, color: PLATFORM_COLORS.youtube },
    { key: 'instagram', name: 'Instagram', icon: Heart, color: PLATFORM_COLORS.instagram },
    { key: 'tiktok', name: 'TikTok', icon: Share2, color: PLATFORM_COLORS.tiktok },
    { key: 'x', name: 'X (Twitter)', icon: Twitter, color: PLATFORM_COLORS.x },
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total Reach" value={formatNumber(data.totals.total_reach)} change={data.totals.total_reach_change} icon={Eye} />
        <KPICard title="New Followers" value={formatNumber(data.totals.total_followers)} icon={Users} />
        <KPICard title="Meta Ads Reach" value={formatNumber(data.meta.totals.reach)} icon={Target} subtitle={`${formatCurrency(data.meta.totals.spent)} spent`} />
        <KPICard title="LinkedIn Impressions" value={formatNumber(data.linkedin.totals.impressions)} icon={Linkedin} subtitle={`${data.linkedin.totals.post_count} posts`} />
      </div>
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
                const pData = data.crossPlatform[platform.key]
                if (!pData) return null
                return (
                  <tr key={platform.key} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: platform.color }} />{platform.name}</div></td>
                    <td className="text-right py-3 px-4 font-medium">{formatNumber(pData.reach_views)}</td>
                    <td className="text-right py-3 px-4"><span className={cn("px-2 py-1 rounded text-sm", getChangeBg(pData.reach_change), getChangeColor(pData.reach_change))}>{pData.reach_change}</span></td>
                    <td className="text-right py-3 px-4">{formatPercent(pData.engagement_rate)}</td>
                    <td className="text-right py-3 px-4">{formatNumber(pData.new_followers)}</td>
                  </tr>
                )
              })}
              {data.linkedin.totals.post_count > 0 && (
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLATFORM_COLORS.linkedin }} />LinkedIn</div></td>
                  <td className="text-right py-3 px-4 font-medium">{formatNumber(data.linkedin.totals.impressions)}</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4">{data.linkedin.totals.followers}</td>
                </tr>
              )}
              {data.meta.totals.reach > 0 && (
                <tr className="border-b hover:bg-gray-50 bg-blue-50">
                  <td className="py-3 px-4"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLATFORM_COLORS.meta }} />Meta Ads (Paid)</div></td>
                  <td className="text-right py-3 px-4 font-medium">{formatNumber(data.meta.totals.reach)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(data.meta.totals.spent)}</td>
                  <td className="text-right py-3 px-4">{data.meta.totals.results} results</td>
                  <td className="text-right py-3 px-4">-</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {data.historicalTrends.weeks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Historical Reach Trends (All Time)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.historicalTrends.weeks.map((week, i) => ({
              week: week.slice(5), YouTube: data.historicalTrends.youtube_reach[i], Instagram: data.historicalTrends.instagram_reach[i],
              TikTok: data.historicalTrends.tiktok_reach[i], X: data.historicalTrends.x_reach[i],
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
      {data.customerWins.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Wins from Social</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b"><th className="text-left py-3 px-4 font-medium text-gray-600">Date</th><th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th><th className="text-left py-3 px-4 font-medium text-gray-600">Platform</th><th className="text-left py-3 px-4 font-medium text-gray-600">Content</th><th className="text-right py-3 px-4 font-medium text-gray-600">Value</th><th className="text-center py-3 px-4 font-medium text-gray-600">Status</th></tr></thead>
              <tbody>
                {data.customerWins.map((win) => (
                  <tr key={win.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{win.date}</td><td className="py-3 px-4 font-medium">{win.customer}</td><td className="py-3 px-4">{win.platform}</td><td className="py-3 px-4 text-gray-600">{win.content}</td><td className="text-right py-3 px-4 font-medium text-green-600">{win.value}</td>
                    <td className="text-center py-3 px-4"><span className={cn("px-2 py-1 rounded-full text-xs font-medium", win.status === 'Won' ? 'bg-green-100 text-green-800' : win.status === 'In Pipeline' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800')}>{win.status}</span></td>
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
function YouTubeTab({ data }: { data: AggregatedData }) {
  const yt = data.youtube
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPICard title="Views" value={formatNumber(yt.totals.views)} icon={Eye} small />
        <KPICard title="Subscribers" value={formatNumber(yt.totals.subscribers)} icon={Users} small />
        <KPICard title="Revenue" value={formatCurrency(yt.totals.revenue)} icon={DollarSign} small />
        <KPICard title="Avg CTR" value={formatPercent(yt.totals.avg_ctr)} icon={Target} small />
        <KPICard title="Videos" value={yt.totals.video_count.toString()} icon={Youtube} small />
        <KPICard title="Shorts" value={yt.totals.shorts_count.toString()} icon={Youtube} small />
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Videos</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b"><th className="text-left py-3 px-4 font-medium text-gray-600">Title</th><th className="text-right py-3 px-4 font-medium text-gray-600">Views</th><th className="text-right py-3 px-4 font-medium text-gray-600">Subs</th><th className="text-right py-3 px-4 font-medium text-gray-600">CTR</th><th className="text-right py-3 px-4 font-medium text-gray-600">Revenue</th><th className="text-center py-3 px-4 font-medium text-gray-600">Type</th></tr></thead>
            <tbody>
              {yt.videos.map((video) => (
                <tr key={video.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4"><a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">{video.title.slice(0, 50)}{video.title.length > 50 ? '...' : ''}<ExternalLink className="w-3 h-3" /></a></td>
                  <td className="text-right py-3 px-4 font-medium">{formatNumber(video.views)}</td>
                  <td className="text-right py-3 px-4 text-green-600">+{video.subs}</td>
                  <td className="text-right py-3 px-4">{formatPercent(video.ctr)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(video.revenue)}</td>
                  <td className="text-center py-3 px-4"><span className={cn("px-2 py-1 rounded text-xs", video.is_short ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800')}>{video.is_short ? 'Short' : 'Video'}</span></td>
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
function TikTokTab({ data }: { data: AggregatedData }) {
  const tt = data.tiktok
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard title="Views" value={formatNumber(tt.totals.views)} icon={Eye} small />
        <KPICard title="Likes" value={formatNumber(tt.totals.likes)} icon={Heart} small />
        <KPICard title="Comments" value={formatNumber(tt.totals.comments)} icon={MessageCircle} small />
        <KPICard title="Shares" value={formatNumber(tt.totals.shares)} icon={Share2} small />
        <KPICard title="Eng. Rate" value={formatPercent(tt.totals.eng_rate)} icon={TrendingUp} small />
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Performance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tt.daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} /><YAxis /><Tooltip /><Bar dataKey="views" fill={PLATFORM_COLORS.tiktok} name="Views" /></BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b"><th className="text-left py-3 px-4 font-medium text-gray-600">Date</th><th className="text-right py-3 px-4 font-medium text-gray-600">Views</th><th className="text-right py-3 px-4 font-medium text-gray-600">Likes</th><th className="text-right py-3 px-4 font-medium text-gray-600">Comments</th><th className="text-right py-3 px-4 font-medium text-gray-600">Shares</th></tr></thead>
            <tbody>{tt.daily.map((day) => (<tr key={day.date} className="border-b hover:bg-gray-50"><td className="py-3 px-4">{day.date}</td><td className="text-right py-3 px-4 font-medium">{formatNumber(day.views)}</td><td className="text-right py-3 px-4">{day.likes}</td><td className="text-right py-3 px-4">{day.comments}</td><td className="text-right py-3 px-4">{day.shares}</td></tr>))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// X Tab
// ============================================================================
function XTab({ data }: { data: AggregatedData }) {
  const x = data.x
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard title="Impressions" value={formatNumber(x.totals.impressions)} icon={Eye} small />
        <KPICard title="Engagements" value={formatNumber(x.totals.engagements)} icon={Heart} small />
        <KPICard title="Likes" value={formatNumber(x.totals.likes)} icon={Heart} small />
        <KPICard title="New Follows" value={formatNumber(x.totals.new_follows)} icon={Users} small />
        <KPICard title="Eng. Rate" value={formatPercent(x.totals.eng_rate)} icon={TrendingUp} small />
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Impressions</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={x.daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} /><YAxis /><Tooltip /><Bar dataKey="impressions" fill={PLATFORM_COLORS.x} name="Impressions" /></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ============================================================================
// LinkedIn Tab
// ============================================================================
function LinkedInTab({ data }: { data: AggregatedData }) {
  const li = data.linkedin
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard title="Impressions" value={formatNumber(li.totals.impressions)} icon={Eye} small />
        <KPICard title="Reached" value={formatNumber(li.totals.reached)} icon={Users} small />
        <KPICard title="Reactions" value={formatNumber(li.totals.reactions)} icon={Heart} small />
        <KPICard title="Comments" value={formatNumber(li.totals.comments)} icon={MessageCircle} small />
        <KPICard title="Followers" value={`+${li.totals.followers}`} icon={Users} small />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {li.demographics.industry?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Industry</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={li.demographics.industry.slice(0, 5)} dataKey="pct" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ pct }) => `${pct.toFixed(0)}%`}>{li.demographics.industry.slice(0, 5).map((_, i) => (<Cell key={i} fill={DEMO_COLORS[i % DEMO_COLORS.length]} />))}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">{li.demographics.industry.slice(0, 5).map((item, i) => (<div key={i} className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEMO_COLORS[i] }} /><span className="text-gray-600">{item.name}</span></div><span className="font-medium">{item.pct.toFixed(1)}%</span></div>))}</div>
          </div>
        )}
        {li.demographics.seniority?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seniority</h3>
            <div className="space-y-3">{li.demographics.seniority.slice(0, 5).map((item, i) => (<div key={i}><div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{item.name}</span><span className="font-medium">{item.pct.toFixed(1)}%</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${item.pct}%`, backgroundColor: PLATFORM_COLORS.linkedin }} /></div></div>))}</div>
          </div>
        )}
        {li.demographics.company_size?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Size</h3>
            <div className="space-y-3">{li.demographics.company_size.slice(0, 5).map((item, i) => (<div key={i}><div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{item.name}</span><span className="font-medium">{item.pct.toFixed(1)}%</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${item.pct}%`, backgroundColor: PLATFORM_COLORS.linkedin }} /></div></div>))}</div>
          </div>
        )}
        {li.demographics.location?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
            <div className="space-y-3">{li.demographics.location.slice(0, 5).map((item, i) => (<div key={i}><div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{item.name}</span><span className="font-medium">{item.pct.toFixed(1)}%</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${item.pct}%`, backgroundColor: PLATFORM_COLORS.linkedin }} /></div></div>))}</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Meta Ads Tab
// ============================================================================
function MetaTab({ data }: { data: AggregatedData }) {
  const meta = data.meta
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard title="Reach" value={formatNumber(meta.totals.reach)} icon={Eye} small />
        <KPICard title="Impressions" value={formatNumber(meta.totals.impressions)} icon={Eye} small />
        <KPICard title="Results" value={formatNumber(meta.totals.results)} icon={Target} small />
        <KPICard title="Spent" value={formatCurrency(meta.totals.spent)} icon={DollarSign} small />
        <KPICard title="Cost/Result" value={formatCurrency(meta.totals.avg_cpr)} icon={DollarSign} small />
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaigns</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b"><th className="text-left py-3 px-4 font-medium text-gray-600">Campaign</th><th className="text-center py-3 px-4 font-medium text-gray-600">Status</th><th className="text-right py-3 px-4 font-medium text-gray-600">Results</th><th className="text-right py-3 px-4 font-medium text-gray-600">Reach</th><th className="text-right py-3 px-4 font-medium text-gray-600">Spent</th><th className="text-right py-3 px-4 font-medium text-gray-600">CPR</th></tr></thead>
            <tbody>
              {meta.campaigns.map((campaign, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 max-w-xs truncate">{campaign.name}</td>
                  <td className="text-center py-3 px-4"><span className={cn("px-2 py-1 rounded-full text-xs font-medium", campaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>{campaign.status}</span></td>
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
// KPI Card
// ============================================================================
function KPICard({ title, value, change, icon: Icon, subtitle, small }: { title: string; value: string; change?: string; icon: React.ComponentType<{ className?: string }>; subtitle?: string; small?: boolean }) {
  return (
    <div className={cn("bg-white rounded-xl shadow-sm border", small ? "p-4" : "p-6")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={cn("font-bold text-gray-900", small ? "text-xl" : "text-2xl")}>{value}</p>
          {change && <p className={cn("text-sm mt-1", getChangeColor(change))}>{change}</p>}
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={cn("rounded-lg bg-gray-100 flex items-center justify-center", small ? "p-2" : "p-3")}>
          <Icon className={cn("text-gray-600", small ? "w-4 h-4" : "w-5 h-5")} />
        </div>
      </div>
    </div>
  )
}
