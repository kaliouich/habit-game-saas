import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import { Analytics } from "@/components/Analytics";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-display",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const TAGLINE = "The habit tracker that plays like a game you actually want to win";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: `${APP_NAME} — rebuild your consistency`, template: `%s — ${APP_NAME}` },
  description: `${TAGLINE}. Track habits on a monthly grid, watch your stats update live, and build streaks that stick.`,
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} — rebuild your consistency`,
    description: TAGLINE,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — rebuild your consistency`,
    description: TAGLINE,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        {children}
        <Analytics />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
