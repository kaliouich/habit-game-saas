/**
 * Phase 3 roadmap — journal. `content` (JournalEntry.content, Json) est un
 * arbre STRUCTURÉ, jamais du HTML : un éditeur qui écrirait du HTML en base
 * ouvrirait une porte XSS permanente (contenu réaffiché à l'auteur, et
 * potentiellement dans un futur récap public). Le rendu (JournalEntryView)
 * marche sur cet arbre via un switch fermé — jamais dangerouslySetInnerHTML.
 *
 * Volontairement sobre (AGENTS §6 du roadmap) : gras/italique/barré + listes
 * à puces + cases à cocher, PAS de surlignage couleur (identité e-ink).
 */

export interface JournalInline {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
}

export type JournalBlock =
  | { type: "paragraph"; children: JournalInline[] }
  | { type: "bullet"; children: JournalInline[] }
  | { type: "checklist"; checked: boolean; children: JournalInline[] };

const MAX_BLOCKS = 200; // une entrée de journal, pas un roman
const MAX_LINE_LENGTH = 2000;

function parseInline(text: string): JournalInline[] {
  const tokens: JournalInline[] = [];
  const re = /\*\*(.+?)\*\*|~~(.+?)~~|\*(.+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > lastIndex) tokens.push({ text: text.slice(lastIndex, match.index) });
    if (match[1] !== undefined) tokens.push({ text: match[1], bold: true });
    else if (match[2] !== undefined) tokens.push({ text: match[2], strike: true });
    else if (match[3] !== undefined) tokens.push({ text: match[3], italic: true });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) tokens.push({ text: text.slice(lastIndex) });
  return tokens.length > 0 ? tokens : [{ text: "" }];
}

/** Syntaxe volontairement minimale : `**gras**`, `*italique*`, `~~barré~~`,
 *  `- item` (puce), `- [ ] item` / `- [x] item` (case à cocher). Chaque ligne
 *  non vide devient un bloc — pas de paragraphes multi-lignes. */
export function parseJournalMarkdown(raw: string): JournalBlock[] {
  const lines = raw.split("\n").slice(0, MAX_BLOCKS);
  const blocks: JournalBlock[] = [];
  for (const rawLine of lines) {
    const line = rawLine.slice(0, MAX_LINE_LENGTH);
    if (line.trim() === "") continue;

    const checklistMatch = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
    if (checklistMatch) {
      blocks.push({
        type: "checklist",
        checked: checklistMatch[1].toLowerCase() === "x",
        children: parseInline(checklistMatch[2]),
      });
      continue;
    }

    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      blocks.push({ type: "bullet", children: parseInline(bulletMatch[1]) });
      continue;
    }

    blocks.push({ type: "paragraph", children: parseInline(line) });
  }
  return blocks;
}

/** Texte brut pour l'index de recherche (JournalEntry.searchText) — jamais réaffiché. */
export function extractPlainText(blocks: JournalBlock[]): string {
  return blocks.map((b) => b.children.map((c) => c.text).join("")).join("\n");
}

/** Inverse de parseJournalMarkdown — alimente le formulaire d'édition (pas de
 *  markdown brut stocké séparément : l'arbre structuré reste la seule source
 *  de vérité, ceci ne fait que le re-sérialiser). */
export function blocksToMarkdown(blocks: JournalBlock[]): string {
  return blocks
    .map((b) => {
      const inline = b.children
        .map((c) => {
          let t = c.text;
          if (c.bold) t = `**${t}**`;
          if (c.italic) t = `*${t}*`;
          if (c.strike) t = `~~${t}~~`;
          return t;
        })
        .join("");
      if (b.type === "bullet") return `- ${inline}`;
      if (b.type === "checklist") return `- [${b.checked ? "x" : " "}] ${inline}`;
      return inline;
    })
    .join("\n");
}
