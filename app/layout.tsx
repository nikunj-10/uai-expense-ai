import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UAI Expense AI — Track Spending with Natural Language",
  description:
    "An AI-powered expense tracker. Just tell me what you spent, and I'll track it for you. No forms, no manual entry.",
  keywords: ["expense tracker", "AI", "natural language", "personal finance"],
  openGraph: {
    title: "UAI Expense AI",
    description: "Track your spending with natural language AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💰</text></svg>"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <GlobalErrorHandler />
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
