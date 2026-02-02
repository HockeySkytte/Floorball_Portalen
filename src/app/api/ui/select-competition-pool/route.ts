import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const poolId = String(body?.poolId ?? "").trim();

  if (!poolId) {
    return NextResponse.json({ message: "poolId mangler." }, { status: 400 });
  }

  const pool = await prisma.competitionPool.findUnique({
    where: { id: poolId },
    select: { id: true, rowId: true },
  });

  if (!pool) {
    return NextResponse.json({ message: "Ugyldig pulje." }, { status: 400 });
  }

  const session = await getSession();
  session.selectedCompetitionRowId = pool.rowId;
  session.selectedCompetitionPoolId = pool.id;
  session.selectedCompetitionTeamName = undefined;
  if (!session.userId) session.guestDefaultsApplied = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
