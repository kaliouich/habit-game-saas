"use client";

import { useEffect, useRef } from "react";

/**
 * Centre la colonne du jour dans la grille au chargement.
 *
 * La grille fait 31 colonnes : sur téléphone on n'en voit que ~9, et elle
 * s'ouvrait toujours sur le 1er du mois — donc il fallait scroller
 * horizontalement pour atteindre aujourd'hui, c'est-à-dire pour faire la
 * seule action quotidienne du produit.
 *
 * On règle `scrollLeft` à la main plutôt que d'utiliser `scrollIntoView`, qui
 * déplacerait aussi le scroll vertical de la page.
 */
export function ScrollToToday() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = anchor.current?.closest<HTMLElement>(".gridwrap");
    if (!wrap) return;

    const today = wrap.querySelector<HTMLElement>('[data-today="1"]');
    if (!today) return; // mois passé/futur : pas de colonne « aujourd'hui »

    const target = today.offsetLeft - wrap.clientWidth / 2 + today.offsetWidth / 2;
    wrap.scrollLeft = Math.max(0, target);
  }, []);

  return <span ref={anchor} hidden aria-hidden />;
}
