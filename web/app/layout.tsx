import type { Metadata } from "next";
import VideoBackground from "@/components/VideoBackground";
import BackgroundZoom from "@/components/BackgroundZoom";
import "./globals.css";

export const metadata: Metadata = {
  title: "Givest",
  description:
    "Send real stock tokens on Robinhood Chain as a claim link. Give stocks, not gift cards.",
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
