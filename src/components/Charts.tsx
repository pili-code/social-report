"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Chart } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const monthColor: Record<string, string> = {
  Dec: "#1B4F72", Jan: "#154360", Feb: "#1A5276", Mar: "#117A65", Apr: "#2E86AB",
};

interface YTWeekly {
  week: string;
  month: string;
  views: number;
  current?: number;
}

interface YTMonthly {
  month: string;
  daily_avg: number;
  partial?: number;
}

interface ShortsWeekly {
  week: string;
  avg_per_clip: number;
}

interface DiannePost {
  week: string;
  impressions: number;
  saves: number;
}

export function YTWeeklyChart({ data }: { data: YTWeekly[] }) {
  return (
    <Bar
      data={{
        labels: data.map((d) => d.week),
        datasets: [{
          data: data.map((d) => d.views),
          backgroundColor: data.map((d) =>
            d.current ? "rgba(46,134,171,0.3)" : `${monthColor[d.month] || "#999"}22`
          ),
          borderColor: data.map((d) =>
            d.current ? "#2E86AB" : monthColor[d.month] || "#999"
          ),
          borderWidth: 2,
          borderRadius: 4,
          barPercentage: 0.7,
        }],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${Number(ctx.raw).toLocaleString()} views` } },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { family: "JetBrains Mono", size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 10 }, maxRotation: 45 } },
        },
      }}
    />
  );
}

export function YTMonthlySparkline({ data }: { data: YTMonthly[] }) {
  return (
    <Bar
      data={{
        labels: data.map((d) => d.month.replace(" 20", "'")),
        datasets: [{
          data: data.map((d) => d.daily_avg),
          backgroundColor: data.map((d) =>
            d.partial ? "rgba(46,134,171,0.3)" : "rgba(192,57,43,0.15)"
          ),
          borderColor: data.map((d) => d.partial ? "#2E86AB" : "#C0392B"),
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.6,
        }],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `Daily avg: ${Number(ctx.raw).toLocaleString()} views` } },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { family: "JetBrains Mono", size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 } } },
        },
      }}
    />
  );
}

export function ShortsChart({ data }: { data: ShortsWeekly[] }) {
  return (
    <Bar
      data={{
        labels: data.map((d) => d.week),
        datasets: [{
          data: data.map((d) => d.avg_per_clip),
          backgroundColor: data.map((d) =>
            d.avg_per_clip >= 800 ? "rgba(30,132,73,0.2)" : d.avg_per_clip < 400 ? "rgba(192,57,43,0.2)" : "rgba(230,126,34,0.15)"
          ),
          borderColor: data.map((d) =>
            d.avg_per_clip >= 800 ? "#1E8449" : d.avg_per_clip < 400 ? "#C0392B" : "#E67E22"
          ),
          borderWidth: 2,
          borderRadius: 4,
          barPercentage: 0.7,
        }],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${Number(ctx.raw).toLocaleString()} avg views/clip` } },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { family: "JetBrains Mono", size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 10 }, maxRotation: 45 } },
        },
      }}
    />
  );
}

export function DianneChart({ data }: { data: DiannePost[] }) {
  return (
    <Chart
      type="bar"
      data={{
        labels: data.map((d) => d.week),
        datasets: [
          {
            type: "bar" as const,
            label: "Impressions",
            data: data.map((d) => d.impressions),
            backgroundColor: "rgba(0,119,181,0.12)",
            borderColor: "#0077B5",
            borderWidth: 2,
            borderRadius: 4,
            barPercentage: 0.6,
            yAxisID: "y",
          },
          {
            type: "line" as const,
            label: "Saves ★",
            data: data.map((d) => d.saves),
            borderColor: "#E67E22",
            backgroundColor: "rgba(230,126,34,0.1)",
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: "#E67E22",
            fill: true,
            tension: 0.3,
            yAxisID: "y1",
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", labels: { font: { family: "Inter", size: 11 }, usePointStyle: true, pointStyle: "circle" } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()}` } },
        },
        scales: {
          y: {
            beginAtZero: true,
            position: "left",
            grid: { color: "#f0f0f0" },
            title: { display: true, text: "Impressions", font: { family: "Inter", size: 11 } },
            ticks: { font: { family: "JetBrains Mono", size: 11 } },
          },
          y1: {
            beginAtZero: true,
            position: "right",
            grid: { drawOnChartArea: false },
            title: { display: true, text: "Saves ★", font: { family: "Inter", size: 11 } },
            ticks: { font: { family: "JetBrains Mono", size: 11 } },
          },
          x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 10 }, maxRotation: 45 } },
        },
      }}
    />
  );
}
