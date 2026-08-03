"use client";

/**
 * Déclenche la boîte d'impression du navigateur, qui propose « Enregistrer au
 * format PDF » sur toutes les plateformes (y compris iOS/Android). Évite une
 * dépendance de génération PDF côté serveur pour un rendu vectoriel natif.
 */
export function PrintButton({ label = "Download PDF" }: { label?: string }) {
  return (
    <button type="button" className="btn btn--primary report__print" onClick={() => window.print()}>
      ⬇ {label}
    </button>
  );
}
