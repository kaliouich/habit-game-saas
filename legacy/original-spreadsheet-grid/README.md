# Grille "tableur" d'origine (réplique vidéo V3 + V10)

Sauvegarde de la grille mensuelle telle qu'elle existait avant la refonte
"warrior board" (Sprint 7). Conservée à la demande explicite du propriétaire du
projet : c'est la réplique pixel-perfect de la vidéo de spec du 2026-07-12, donc
la référence historique du produit.

## Contenu

| Fichier | Origine |
|---|---|
| `MonthGrid.tsx` | `src/components/dashboard/MonthGrid.tsx` |
| `DayCheckbox.tsx` | `src/components/dashboard/DayCheckbox.tsx` |
| `MoodCell.tsx` | `src/components/dashboard/MoodCell.tsx` |
| `grid.css` | section « Grille mensuelle (V3) » de `src/app/globals.css` |

## Ce que c'était

Un `<table>` dense : une ligne par habitude, une colonne par jour du mois,
en-têtes Week 1..5 + jour de la semaine + numéro, checkbox 18 px par cellule,
ligne `Mood` en `tfoot`. Scroll horizontal sur mobile.

## Restaurer

1. Recopier les trois `.tsx` dans `src/components/dashboard/`.
2. Réinjecter `grid.css` dans `src/app/globals.css` (remplace la section
   « Warrior board »).
3. Dans `Dashboard.tsx`, réimporter `MonthGrid` à la place de `WarriorBoard`.

Attention : ces fichiers sont un instantané, **ils ne sont pas maintenus**. Les
props ont pu évoluer depuis (ex. `pausedDates`, boucliers). Vérifier le
typecheck après restauration.
