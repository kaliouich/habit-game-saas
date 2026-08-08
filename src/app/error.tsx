"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Frontière d'erreur des routes. Sans ce fichier, toute exception d'un Server
 * Component (Prisma injoignable, Server Action qui throw…) affichait la page
 * brute de Next — « Application error: a server-side exception has occurred »
 * suivie d'un digest, sans issue pour l'utilisateur.
 *
 * `error.message` n'est volontairement PAS affiché : en production Next le
 * remplace déjà par un message générique, mais le rendre visible exposerait
 * des détails d'implémentation dès qu'une erreur non masquée remonte.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error); // no-op tant que le DSN n'est pas configuré
  }, [error]);

  return (
    <div className="errorpage">
      <div className="errorcard">
        <h1 className="errorcard__title">Something went wrong</h1>
        <p className="errorcard__text">
          The page couldn&apos;t load. Your habits and streaks are safe — nothing was lost.
        </p>
        <div className="errorcard__actions">
          <button type="button" onClick={reset} className="btn btn--primary">
            Try again
          </button>
          <a href="/app" className="btn btn--secondary">
            Back to dashboard
          </a>
        </div>
        {error.digest && <p className="errorcard__digest">Reference: {error.digest}</p>}
      </div>
    </div>
  );
}
