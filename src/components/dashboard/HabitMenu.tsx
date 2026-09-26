"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { archiveHabit, updateHabit } from "@/lib/actions/habits";
import { getLogNote, setLogNote } from "@/lib/actions/logs";
import { createHabitPause } from "@/lib/actions/pause";
import type { ISODate } from "@/lib/dates";
import { habitUnitConfig, type HabitUnitKey } from "@/lib/config";

interface HabitMenuProps {
  habitId: string;
  name: string;
  emoji: string | null;
  type: "BUILD" | "QUIT";
  goal: number | null;
  tags: string[];
  plan: "FREE" | "PRO";
  today: ISODate;
  /** Phase 1 roadmap — absent/"TIMES" = case à cocher classique (rien à éditer ici). */
  unit?: HabitUnitKey;
  targetValue?: number | null;
  unitLabel?: string | null;
}

/** V2 : édition d'une habitude (nom, emoji, goal) + archivage, dans un popover.
 *  Sprint 6 (Pro) : tags, note du jour, pause / vacation mode.
 *  Phase 2 roadmap : goal (jours cochés) et note du jour n'ont plus de sens
 *  pour QUIT, qui ne produit plus de HabitLog — masqués pour ce type.
 *  Phase 1 roadmap : l'unité n'est pas éditable après création (des logs
 *  existants perdraient leur sens — ex. "1" en TIMES vs "1" en STEPS) ; seule
 *  la cible/jour et le libellé libre (COUNT) le sont. */
export function HabitMenu({ habitId, name, emoji, type, goal, tags, plan, today, unit, targetValue, unitLabel }: HabitMenuProps) {
  const t = useTranslations("Dashboard.habitMenu");
  const ref = useRef<HTMLDetailsElement>(null);
  // .sidebar a un position:sticky (pour rester visible au scroll), qui crée
  // une stacking context à part entière — un descendant en position:fixed
  // (le panneau, pour rester dans l'écran quel que soit l'endroit cliqué,
  // voir globals.css) y reste PIÉGÉ pour le z-index : son z-index:30 n'est
  // comparé qu'AU SEIN de cette stacking context, jamais contre le contenu
  // de .dashboard__main (peint après .sidebar en ordre DOM, donc toujours
  // par-dessus, quel que soit le z-index du panneau). Le portail sort le
  // panneau du DOM de .sidebar pour de vrai — le seul moyen de retrouver un
  // z-index qui compte globalement sans retirer le sticky, dont on a besoin.
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isPro = plan === "PRO";
  const isBuild = type === "BUILD";
  const isQuantified = isBuild && !!unit && unit !== "TIMES";
  const unitConfig = unit ? habitUnitConfig(unit) : null;

  const [note, setNote] = useState<string | null>(null);
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [pauseTo, setPauseTo] = useState("");
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [pauseOk, setPauseOk] = useState(false);

  useEffect(() => {
    if (!isPro || !isBuild || noteLoaded) return;
    getLogNote({ habitId, date: today }).then((res) => {
      setNote(res.note ?? "");
      setNoteLoaded(true);
    });
  }, [isPro, isBuild, noteLoaded, habitId, today]);

  function close() {
    ref.current?.removeAttribute("open");
    setIsOpen(false);
  }

  return (
    <details
      className="habitmenu"
      ref={ref}
      // Même `name` sur tous les <details> HabitMenu : le navigateur les
      // rend mutuellement exclusifs nativement (ferme les autres à
      // l'ouverture d'un nouveau), et déclenche bien leur propre `onToggle`
      // au passage — sans ça, chaque instance gère son isOpen en isolation
      // et rien n'empêche plusieurs panneaux centrés de s'empiler au même
      // endroit à l'écran.
      name="habitmenu"
      onToggle={() => setIsOpen(!!ref.current?.open)}
    >
      <summary className="habitmenu__trigger" aria-label={t("editAria", { name })}>
        ⋯
      </summary>
      {isOpen &&
        createPortal(
          <form
            className="habitmenu__panel"
            action={(formData: FormData) => {
              const newName = String(formData.get("name") ?? "").trim();
              const newEmoji = String(formData.get("emoji") ?? "").trim();
              const goalRaw = String(formData.get("goal") ?? "").trim();
              const newGoal = goalRaw === "" ? null : Math.max(1, Math.min(31, Number(goalRaw)));
              const tagsRaw = String(formData.get("tags") ?? "").trim();
              const newTags = isPro
                ? tagsRaw
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .slice(0, 5)
                : undefined;
              const targetRaw = String(formData.get("targetValue") ?? "").trim();
              const newUnitLabel = String(formData.get("unitLabel") ?? "").trim();
              startTransition(async () => {
                await updateHabit({
                  habitId,
                  name: newName || undefined,
                  emoji: newEmoji,
                  goal: newGoal,
                  ...(newTags !== undefined && { tags: newTags }),
                  ...(isQuantified && { targetValue: targetRaw === "" ? null : Number(targetRaw) }),
                  ...(isQuantified && unit === "COUNT" && { unitLabel: newUnitLabel }),
                });
                close();
              });
            }}
          >
            <label>
              {t("name")}
              <input name="name" defaultValue={name} maxLength={40} />
            </label>
            <label>
              {t("emoji")}
              <input name="emoji" defaultValue={emoji ?? ""} maxLength={8} />
            </label>
            {isBuild && (
              <label>
                {t("goal")} <span className="habitmenu__hint">{t("goalHint")}</span>
                <input name="goal" type="number" min={1} max={31} defaultValue={goal ?? ""} />
              </label>
            )}
            {isQuantified && (
              <label>
                {t("targetPerDay")} {unitConfig?.suffix && <span className="habitmenu__hint">({unitConfig.suffix})</span>}
                <input name="targetValue" type="number" step="any" min={0} defaultValue={targetValue ?? ""} />
              </label>
            )}
            {isQuantified && unit === "COUNT" && (
              <label>
                {t("unitLabel")} <span className="habitmenu__hint">{t("unitLabelHint")}</span>
                <input name="unitLabel" defaultValue={unitLabel ?? ""} maxLength={20} />
              </label>
            )}

            <label className={isPro ? "" : "habitmenu__locked"}>
              {t("tags")} {!isPro && <span className="habitmenu__hint">{t("proOnly")}</span>}
              <input
                name="tags"
                defaultValue={tags.join(", ")}
                placeholder={t("tagsPlaceholder")}
                maxLength={100}
                disabled={!isPro}
              />
            </label>
            {!isPro && (
              <Link href="/pricing" className="habitmenu__upsell">
                {t("proUpsell")}
              </Link>
            )}

            {isPro && isBuild && (
              <div className="habitmenu__note">
                <label>
                  {t("noteForToday")}
                  <textarea
                    maxLength={280}
                    value={note ?? ""}
                    disabled={!noteLoaded}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={noteLoaded ? t("notePlaceholder") : t("loading")}
                  />
                </label>
                <button
                  type="button"
                  disabled={isPending || !noteLoaded}
                  onClick={() => {
                    setNoteError(null);
                    startTransition(async () => {
                      const res = await setLogNote({ habitId, date: today, note: note ?? "" });
                      if (!res.ok) setNoteError(res.error === "NO_LOG" ? t("noteNeedsCheck") : t("genericError"));
                    });
                  }}
                >
                  {t("saveNote")}
                </button>
                {noteError && <p className="habitmenu__error">{noteError}</p>}
              </div>
            )}

            {isPro && (
              <div className="habitmenu__pause">
                <label>
                  {t("pauseUntil")} <span className="habitmenu__hint">{t("vacationMode")}</span>
                  <input type="date" value={pauseTo} onChange={(e) => setPauseTo(e.target.value)} min={today} />
                </label>
                <button
                  type="button"
                  disabled={isPending || !pauseTo}
                  onClick={() => {
                    setPauseError(null);
                    setPauseOk(false);
                    startTransition(async () => {
                      const res = await createHabitPause({ habitId, from: today, to: pauseTo });
                      if (res.ok) {
                        setPauseOk(true);
                        setPauseTo("");
                      } else {
                        setPauseError(t("genericError"));
                      }
                    });
                  }}
                >
                  {t("pause")}
                </button>
                {pauseOk && <p className="habitmenu__ok">{t("pausedUntil", { date: pauseTo || "—" })}</p>}
                {pauseError && <p className="habitmenu__error">{pauseError}</p>}
              </div>
            )}

            <div className="habitmenu__actions">
              <button type="submit" disabled={isPending}>
                {t("save")}
              </button>
              <button
                type="button"
                className="habitmenu__archive"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await archiveHabit({ habitId });
                  });
                }}
              >
                {t("archive")}
              </button>
            </div>
          </form>,
          // Cible dédiée dans .dashboard (voir Dashboard.tsx) plutôt que
          // document.body : hérite le thème --bg/--cell/… posé sur
          // .dashboard[data-skin], que document.body n'a pas. Repli
          // défensif si jamais rendu hors de ce contexte.
          document.getElementById("habitmenu-portal") ?? document.body,
        )}
    </details>
  );
}
