import { describe, expect, it } from "vitest";
import { blocksToMarkdown, extractPlainText, parseJournalMarkdown } from "./journal";

describe("parseJournalMarkdown — Phase 3 roadmap (journal)", () => {
  it("une ligne simple devient un paragraphe", () => {
    const blocks = parseJournalMarkdown("Rise and shine");
    expect(blocks).toEqual([{ type: "paragraph", children: [{ text: "Rise and shine" }] }]);
  });

  it("gras / italique / barré", () => {
    const blocks = parseJournalMarkdown("**great** day, *felt* good, ~~worries~~ gone");
    expect(blocks[0].children).toEqual([
      { text: "great", bold: true },
      { text: " day, " },
      { text: "felt", italic: true },
      { text: " good, " },
      { text: "worries", strike: true },
      { text: " gone" },
    ]);
  });

  it("puce", () => {
    const blocks = parseJournalMarkdown("- Morning walk");
    expect(blocks).toEqual([{ type: "bullet", children: [{ text: "Morning walk" }] }]);
  });

  it("case à cocher, cochée et non cochée", () => {
    const blocks = parseJournalMarkdown("- [x] Math\n- [ ] English");
    expect(blocks).toEqual([
      { type: "checklist", checked: true, children: [{ text: "Math" }] },
      { type: "checklist", checked: false, children: [{ text: "English" }] },
    ]);
  });

  it("lignes vides ignorées, pas de bloc vide", () => {
    const blocks = parseJournalMarkdown("Line one\n\n\nLine two");
    expect(blocks).toHaveLength(2);
  });

  it("jamais de HTML en sortie — seulement du texte + des flags booléens", () => {
    const blocks = parseJournalMarkdown("<script>alert(1)</script>");
    expect(blocks).toEqual([{ type: "paragraph", children: [{ text: "<script>alert(1)</script>" }] }]);
    // Le texte brut est conservé tel quel (React l'échappera à l'affichage) —
    // aucun marquage n'est interprété comme balise.
  });

  it("borne le nombre de blocs (une entrée n'est pas un roman)", () => {
    const huge = Array.from({ length: 500 }, (_, i) => `line ${i}`).join("\n");
    const blocks = parseJournalMarkdown(huge);
    expect(blocks.length).toBeLessThanOrEqual(200);
  });
});

describe("blocksToMarkdown — round-trip pour l'édition", () => {
  it("gras/italique/barré/puce/checklist survivent à un aller-retour", () => {
    const raw = "**great** day, *felt* good\n- Morning walk\n- [x] Exercise\n- [ ] English";
    expect(blocksToMarkdown(parseJournalMarkdown(raw))).toBe(raw);
  });
});

describe("extractPlainText", () => {
  it("concatène le texte de tous les blocs, sans le markup", () => {
    const blocks = parseJournalMarkdown("**Great** day\n- [x] Exercise");
    expect(extractPlainText(blocks)).toBe("Great day\nExercise");
  });
});
