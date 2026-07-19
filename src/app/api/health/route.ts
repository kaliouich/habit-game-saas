import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Probes k8s : vérifie que le process ET la DB répondent. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: true });
  } catch {
    return Response.json({ ok: false, db: false }, { status: 503 });
  }
}
