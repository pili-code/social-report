"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LastUpdated() {
  const [date, setDate] = useState<string>("");
  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((data) => {
        const allDates: Date[] = [];
        for (const key of Object.keys(data)) {
          const rows = data[key];
          if (!Array.isArray(rows)) continue;
          for (const row of rows) {
            if (row?.created_at) {
              const d = new Date(row.created_at);
              if (!isNaN(d.getTime())) allDates.push(d);
            }
          }
        }
        if (allDates.length === 0) return;
        const max = new Date(Math.max(...allDates.map((d) => d.getTime())));
        setDate(max.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
      })
      .catch(() => setDate(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })));
  }, []);
  return <div>Last updated: {date || "…"}</div>;
}

const NAV_ITEMS = [
  { key: "youtube", label: "YouTube", color: "#C0392B" },
  { key: "shorts", label: "Shorts", color: "#E67E22" },
  { key: "linkedin-dianne", label: "LinkedIn: Dianne", color: "#0077B5" },
  { key: "linkedin-tdp", label: "LinkedIn: TDP Page", color: "#1A5276" },
  { key: "twitter", label: "X (Twitter)", color: "#111111" },
  { key: "cold-email", label: "Cold Email", color: "#6C3483" },
  { key: "community", label: "Community Funnel", color: "#1A5276" },
  { key: "monthly-growth", label: "Monthly Growth", color: "#117A65" },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "youtube";
  const isUpload = pathname === "/upload";

  return (
    <nav className="flex-1 py-3 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const isActive = !isUpload && currentTab === item.key;
        return (
          <Link
            key={item.key}
            href={`/dashboard?tab=${item.key}`}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-medium transition-all border-l-[3px] ${
              isActive
                ? "text-white bg-[#2a4a44] border-l-[#5955ff]"
                : "text-white/60 border-transparent hover:text-white hover:bg-[#2a4a44]"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: item.color }}
            />
            {item.label}
          </Link>
        );
      })}

      <div className="my-2 mx-5 border-t border-white/[0.08]" />

      <Link
        href="/upload"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-medium transition-all border-l-[3px] ${
          isUpload
            ? "text-white bg-[#2a4a44] border-l-[#5955ff]"
            : "text-white/60 border-transparent hover:text-white hover:bg-[#2a4a44]"
        }`}
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Upload Data
      </Link>
    </nav>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll when drawer open on mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile top bar with hamburger — only visible below md */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-[#1f3934] text-white flex items-center px-4 z-40">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="p-1.5 -ml-1.5 rounded hover:bg-white/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="ml-3 text-[13px] font-bold">The Design Project</span>
      </div>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — slides in on mobile, fixed on desktop */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-60 bg-[#1f3934] text-white flex flex-col z-50 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="px-5 py-6 border-b border-white/[0.08] flex items-start justify-between">
          <div>
            <h1 className="text-base font-bold tracking-tight">The Design Project</h1>
            <span className="text-[11px] text-white/45 block mt-1">GTM Performance Hub</span>
          </div>
          {/* Close button — mobile only */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="md:hidden p-1 -mr-1 rounded hover:bg-white/10 text-white/60"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <Suspense fallback={<nav className="flex-1 py-3" />}>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </Suspense>

        <div className="px-5 py-4 border-t border-white/[0.08] text-[11px] text-white/35">
          <span className="inline-block bg-[#117A65] text-white px-2 py-0.5 rounded text-[10px] font-semibold mb-1">
            LIVE
          </span>
          <LastUpdated />
        </div>
      </aside>
    </>
  );
}
