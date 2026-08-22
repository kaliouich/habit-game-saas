import type { JournalBlock, JournalInline } from "@/lib/journal";

/** Rend un run inline en imbriquant les balises sémantiques nécessaires —
 *  jamais dangerouslySetInnerHTML : React échappe `run.text` comme tout texte. */
function InlineRun({ run }: { run: JournalInline }) {
  let node: React.ReactNode = run.text;
  if (run.bold) node = <strong>{node}</strong>;
  if (run.italic) node = <em>{node}</em>;
  if (run.strike) node = <s>{node}</s>;
  return node;
}

/** Marche sur l'arbre structuré via un switch fermé (allowlist) — une forme de
 *  bloc inconnue (contenu altéré) est ignorée plutôt que de planter le rendu. */
export function JournalEntryView({ blocks }: { blocks: JournalBlock[] }) {
  return (
    <div className="journalentry__body">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "paragraph":
            return (
              <p key={i}>
                {b.children.map((c, j) => (
                  <InlineRun key={j} run={c} />
                ))}
              </p>
            );
          case "bullet":
            return (
              <p key={i} className="journalentry__bullet">
                {b.children.map((c, j) => (
                  <InlineRun key={j} run={c} />
                ))}
              </p>
            );
          case "checklist":
            return (
              <p key={i} className="journalentry__checklist">
                <input type="checkbox" checked={b.checked} disabled readOnly />
                {b.children.map((c, j) => (
                  <InlineRun key={j} run={c} />
                ))}
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
