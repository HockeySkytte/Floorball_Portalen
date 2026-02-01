import { NextResponse } from "next/server";
import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  await requireApprovedUser();
  const body = await req.json().catch(() => null);
  const teamId = String(body?.teamId ?? "").trim();

  if (!teamId) {
    return NextResponse.json({ message: "teamId mangler." }, { status: 400 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, leagueId: true },
  });

  if (!team) {
    return NextResponse.json({ message: "Ugyldigt hold." }, { status: 400 });
  }

  const session = await getSession();
  session.selectedLeagueId = team.leagueId;
  session.selectedTeamId = teamId;
  await session.save();

  return NextResponse.json({ ok: true });
}
