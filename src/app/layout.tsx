import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { APP_NAME } from "@/lib/config";
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

export const metadata: Metadata = {
  title: `${APP_NAME} — rebuild your consistency`,
  description: "Le tracker d'habitudes façon tableur, gamifié, sur une seule page.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}
