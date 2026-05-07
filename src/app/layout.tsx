import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Feedback from "@/components/Feedback";

export const metadata: Metadata = {
  title: "TDP GTM Dashboard",
  description: "GTM performance hub for The Design Project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#f8f9fa] text-[#2c3e50] antialiased">
        <Sidebar />
        <main className="md:ml-60 p-4 pt-16 md:p-8 md:pt-8 max-w-full md:max-w-[1400px]">{children}</main>
        <Feedback />
      </body>
    </html>
  );
}
