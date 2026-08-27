import type { Metadata, Viewport } from "next";
import { Literata } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import { Analytics } from "@/components/Analytics";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { MobileAuthBridgeListener } from "@/components/MobileAuthBridgeListener";
import "./globals.css";

// Literata est dessinée pour les liseuses (c'est la police par défaut de Google
// Play Livres) : c'est le plus proche disponible du Bookerly du Kindle. Sérif
// partout — un Kindle n'affiche pas de sans-serif pour le texte.
const literata = Literata({
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
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
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={literata.variable}>
      <body>
        {children}
        <Analytics />
        <ServiceWorkerRegister />
        <MobileAuthBridgeListener />
      </body>
    </html>
  );
}
