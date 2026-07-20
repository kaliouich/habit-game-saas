import type { Metadata } from "next";

// Contenu personnel derrière l'auth : ne doit jamais être indexé (robots.ts bloque déjà le crawl).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
