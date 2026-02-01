import { NextResponse } from "next/server";
import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  await requireApprovedUser();
  const body = await req.json().catch(() => null);
  const leagueId = String(body?.leagueId ?? "").trim();

  if (!leagueId) {
    return NextResponse.json({ message: "leagueId mangler." }, { status: 400 });
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true },
  });

  if (!league) {
    return NextResponse.json({ message: "Ugyldig liga." }, { status: 400 });
  }

  const firstTeam = await prisma.team.findFirst({
    where: { leagueId },
    orderBy: { name: "asc" },
    select: { id: true },
  });

  const session = await getSession();
  session.selectedLeagueId = leagueId;
  session.selectedTeamId = firstTeam?.id;
  await session.save();

  return NextResponse.json({ ok: true });
}
