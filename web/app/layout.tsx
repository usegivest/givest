import type { Metadata } from "next";
import VideoBackground from "@/components/VideoBackground";
import BackgroundZoom from "@/components/BackgroundZoom";
import "./globals.css";

export const metadata: Metadata = {
  title: "Givest",
  description:
    "Send real stock tokens on Robinhood Chain as a claim link. Give stocks, not gift cards.",
  openGraph: {
    title: "Givest",
    description:
      "Send real stock tokens on Robinhood Chain as a claim link. Give stocks, not gift cards.",
    url: "https://usegivest.app",
    siteName: "Givest",
    type: "website",
    images: [
      {
        url: "https://usegivest.app/api/og?s=STOCK&u=25",
        width: 1200,
        height: 630,
        alt: "Givest",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Givest",
    description:
      "Send real stock tokens on Robinhood Chain as a claim link. Give stocks, not gift cards.",
    images: ["https://usegivest.app/api/og?s=STOCK&u=25"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <VideoBackground />
        <BackgroundZoom />
        {children}
      </body>
    </html>
  );
}
