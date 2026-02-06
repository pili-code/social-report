# The Design Project - Social Media Analytics Dashboard

Live dashboard for TDP's social media performance tracking.

## Live Demo

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/pili-code/social-report)

## Features

- **Cross-Platform Comparison** - YouTube, Instagram, TikTok, X, LinkedIn, Meta Ads
- **Week-over-Week Changes** - Green/red indicators for performance trends
- **YouTube Analytics** - Top videos with links, views, subs, CTR, revenue
- **TikTok/X Daily Charts** - Interactive bar charts with daily breakdown
- **LinkedIn Demographics** - Industry, seniority, company size, location
- **Meta Ads Tracking** - Campaign performance, reach, results, CPR
- **Customer Wins** - Track clients acquired from social content
- **Historical Trends** - Line chart showing reach over time
- **Download Options** - Export to Excel or Google Sheets

## Project Structure

```
├── app/                     # Next.js app directory
│   ├── globals.css          # Tailwind CSS
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Dashboard component
├── lib/
│   └── utils.ts             # Utility functions
├── data/                    # CSV data files
│   ├── weekly_summary.csv
│   ├── youtube_videos.csv
│   ├── tiktok_daily.csv
│   ├── x_daily.csv
│   ├── meta_campaigns.csv
│   ├── linkedin_posts.csv
│   └── linkedin_demographics.csv
├── reports/
│   ├── latest.json          # Dashboard reads this file
│   ├── latest.xlsx          # Downloadable Excel report
│   └── archive/             # Historical reports
└── dashboard/
    └── config.json          # Dashboard configuration
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Data Updates

The dashboard reads from `reports/latest.json` which is updated by the social-media-report skill. Each time new data is ingested:

1. Data is added to the SQLite database
2. Reports are generated (JSON + XLSX + CSV)
3. Files are pushed to this repo
4. Dashboard auto-refreshes with new data

## Downloads

- **Excel Report**: [latest.xlsx](reports/latest.xlsx)
- **JSON Data**: [latest.json](reports/latest.json)
- **YouTube CSV**: [youtube_videos.csv](data/youtube_videos.csv)
- **TikTok CSV**: [tiktok_daily.csv](data/tiktok_daily.csv)

## Google Sheets Integration

Import data directly into Google Sheets:

```
=IMPORTDATA("https://raw.githubusercontent.com/pili-code/social-report/main/data/youtube_videos.csv")
```

---

*Built with Next.js, Tailwind CSS, Recharts, and Claude Code*
