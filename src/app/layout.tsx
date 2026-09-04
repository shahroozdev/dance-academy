import { Geist, Geist_Mono } from "next/font/google";

import { RouteProgressBar } from "@/components/RouteProgressBar";

import type { Metadata } from "next";


import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Malhaar Dance Company",
  description: "Registration, billing, and financial management for Malhaar Dance Company.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RouteProgressBar />
        {children}
      </body>
    </html>
  );
}
