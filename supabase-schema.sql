-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table if not exists youtube_weekly (
  id bigserial primary key,
  week text not null unique,
  month text not null,
  views integer not null,
  days integer default 7,
  current integer default 0,
  created_at timestamptz default now()
);

create table if not exists youtube_monthly (
  id bigserial primary key,
  month text not null unique,
  views integer not null,
  days integer not null,
  daily_avg integer not null,
  mom_pct double precision,
  note text default '',
  partial integer default 0,
  projected integer,
  created_at timestamptz default now()
);

create table if not exists youtube_videos (
  id bigserial primary key,
  published text not null,
  title text not null unique,
  views integer not null,
  impressions integer default 0,
  ctr double precision default 0,
  subs integer default 0,
  note text default '',
  created_at timestamptz default now()
);

create table if not exists shorts_weekly (
  id bigserial primary key,
  week text not null unique,
  clips integer not null,
  total_views integer not null,
  avg_per_clip integer not null,
  impressions integer default 0,
  note text default '',
  created_at timestamptz default now()
);

create table if not exists linkedin_dianne_posts (
  id bigserial primary key,
  week text not null,
  date text not null,
  post_time text default '',
  impressions integer not null,
  reactions integer default 0,
  comments integer default 0,
  reposts integer default 0,
  saves integer default 0,
  followers integer default 0,
  note text default '',
  created_at timestamptz default now(),
  unique(week, date)
);

create table if not exists linkedin_dianne_monthly (
  id bigserial primary key,
  month text not null unique,
  impressions integer not null,
  saves integer not null,
  posts integer default 0,
  mom_imp double precision,
  mom_saves double precision,
  partial integer default 0,
  note text default '',
  created_at timestamptz default now()
);

create table if not exists linkedin_tdp_weekly (
  id bigserial primary key,
  week text not null unique,
  impressions integer not null,
  clicks integer default 0,
  ctr double precision default 0,
  reactions integer default 0,
  note text default '',
  created_at timestamptz default now()
);

create table if not exists cold_email_campaigns (
  id bigserial primary key,
  campaign text not null unique,
  status text default 'Active',
  "window" text default '',
  sent integer default 0,
  contacted integer default 0,
  replies integer default 0,
  reply_rate double precision default 0,
  interested integer default 0,
  note text default '',
  created_at timestamptz default now()
);
