import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Streakin — Jaga Konsistensi Bareng",
    template: "%s · Streakin",
  },
  description:
    "Bikin challenge habit, check-in tiap hari, jaga streak, dan naik leaderboard bareng teman. Kamu nggak sendirian jaga konsistensi.",
  applicationName: "Streakin",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Streakin",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Streakin — Jaga Konsistensi Bareng",
    description: "Bikin challenge habit, jaga streak, naik leaderboard bareng teman.",
    type: "website",
    locale: "id_ID",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
