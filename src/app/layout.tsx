import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import { Analytics } from "@/components/Analytics";
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
const TAGLINE = "The habit tracker that feels like a premium spreadsheet";

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
      </body>
    </html>
  );
}
