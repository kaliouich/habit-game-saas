"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Dernier filet : une erreur survenue dans le layout racine lui-même, où
 * error.tsx ne peut pas s'appliquer (le layout ayant échoué, il n'y a plus de
 * <html> pour l'accueillir). Doit donc rendre ses propres <html>/<body> et ne
 * peut pas dépendre du CSS global — d'où les styles inline.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#f6f6f4",
          color: "#111",
          padding: "20px",
        }}
      >
        <div style={{ maxWidth: "420px", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>Habit Game is temporarily down</h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#555" }}>
            We hit an unexpected error. Your data is safe — please try again in a moment.
          </p>
          {/* Rechargement dur volontaire (pas de <Link>) : le layout racine a
              échoué, une navigation client repartirait du même arbre cassé. */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "16px",
              padding: "10px 18px",
              borderRadius: "8px",
              background: "#111",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
