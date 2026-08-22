"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/user";
import { isFuture } from "@/lib/dates";
import { extractPlainText, parseJournalMarkdown } from "@/lib/journal";

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const MarkdownSchema = z.string().trim().min(1).max(4000);
const TitleSchema = z.string().trim().max(80).optional();

const CreateEntrySchema = z.object({
  date: DateSchema,
  habitId: z.string().min(1).optional(),
  title: TitleSchema,
  markdown: MarkdownSchema,
});

/** Phase 3 roadmap — Pro (comme l'export CSV et le récap partageable). */
export async function createJournalEntry(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const data = CreateEntrySchema.parse(input);
  const user = await getCurrentUser();
  if (user.plan !== "PRO") return { ok: false, error: "PRO_REQUIRED" };
  if (isFuture(data.date, user.timezone)) throw new Error("FUTURE_DATE");

  if (data.habitId) {
    const habit = await prisma.habit.findFirst({ where: { id: data.habitId, userId: user.id }, select: { id: true } });
    if (!habit) throw new Error("NOT_FOUND");
  }

  const content = parseJournalMarkdown(data.markdown);
  const searchText = extractPlainText(content);

  await prisma.journalEntry.create({
    data: {
      userId: user.id,
      habitId: data.habitId || null,
      date: data.date,
      title: data.title || null,
      content: content as unknown as Prisma.InputJsonValue,
      searchText,
    },
  });

  revalidatePath("/app/journal");
  return { ok: true };
}

const UpdateEntrySchema = z.object({
  entryId: z.string().min(1),
  title: TitleSchema,
  markdown: MarkdownSchema,
});

export async function updateJournalEntry(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const data = UpdateEntrySchema.parse(input);
  const user = await getCurrentUser();
  if (user.plan !== "PRO") return { ok: false, error: "PRO_REQUIRED" };

  const entry = await prisma.journalEntry.findFirst({
    where: { id: data.entryId, userId: user.id },
    select: { id: true },
  });
  if (!entry) throw new Error("NOT_FOUND");

  const content = parseJournalMarkdown(data.markdown);
  const searchText = extractPlainText(content);

  await prisma.journalEntry.update({
    where: { id: data.entryId },
    data: { title: data.title || null, content: content as unknown as Prisma.InputJsonValue, searchText },
  });

  revalidatePath("/app/journal");
  return { ok: true };
}

const DeleteEntrySchema = z.object({ entryId: z.string().min(1) });

export async function deleteJournalEntry(input: unknown): Promise<{ ok: boolean }> {
  const { entryId } = DeleteEntrySchema.parse(input);
  const user = await getCurrentUser();

  const entry = await prisma.journalEntry.findFirst({
    where: { id: entryId, userId: user.id },
    select: { id: true },
  });
  if (!entry) throw new Error("NOT_FOUND");

  await prisma.journalEntry.delete({ where: { id: entryId } });
  revalidatePath("/app/journal");
  return { ok: true };
}
