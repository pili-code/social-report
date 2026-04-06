"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const NAV_ITEMS = [
  { key: "overview", label: "Overview", color: "#2E86AB" },
  { key: "youtube", label: "YouTube", color: "#C0392B" },
  { key: "shorts", label: "Shorts", color: "#E67E22" },
  { key: "linkedin-dianne", label: "LinkedIn: Dianne", color: "#0077B5" },
  { key: "linkedin-tdp", label: "LinkedIn: TDP Page", color: "#1A5276" },
  { key: "cold-email", label: "Cold Email", color: "#6C3483" },
  { key: "monthly-growth", label: "Monthly Growth", color: "#117A65" },
];

function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";
  const isUpload = pathname === "/upload";

  return (
    <nav className="flex-1 py-3 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const isActive = !isUpload && currentTab === item.key;
        return (
          <Link
            key={item.key}
            href={`/dashboard?tab=${item.key}`}
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
  return (
    <aside className="fixed top-0 left-0 bottom-0 w-60 bg-[#1f3934] text-white flex flex-col z-50">
      <div className="px-5 py-6 border-b border-white/[0.08]">
        <h1 className="text-base font-bold tracking-tight">The Design Project</h1>
        <span className="text-[11px] text-white/45 block mt-1">GTM Performance Hub</span>
      </div>

      <Suspense fallback={<nav className="flex-1 py-3" />}>
        <SidebarNav />
      </Suspense>

      <div className="px-5 py-4 border-t border-white/[0.08] text-[11px] text-white/35">
        <span className="inline-block bg-[#117A65] text-white px-2 py-0.5 rounded text-[10px] font-semibold mb-1">
          LIVE
        </span>
        <div>Last updated: Apr 6, 2026</div>
      </div>
    </aside>
  );
}
