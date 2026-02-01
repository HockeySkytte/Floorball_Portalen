import { NextResponse } from "next/server";
import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Gender } from "@prisma/client";

function parseGender(value: unknown): Gender | null {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "MEN") return Gender.MEN;
  if (v === "WOMEN") return Gender.WOMEN;
  return null;
}

export async function POST(req: Request) {
  const user = await requireApprovedUser();
  const body = await req.json().catch(() => null);

  const leagueId = String(body?.leagueId ?? "").trim();
  const teamIdRaw = String(body?.teamId ?? "").trim();
  const teamId = teamIdRaw.length > 0 ? teamIdRaw : null;

  const gender = parseGender(body?.gender);

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

  let validatedTeamId: string | null = null;
  if (teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, leagueId: true },
    });

    if (!team) {
      return NextResponse.json({ message: "Ugyldigt hold." }, { status: 400 });
    }

    if (team.leagueId !== leagueId) {
      return NextResponse.json(
        { message: "Holdet tilhører ikke den valgte liga." },
        { status: 400 }
      );
    }

    validatedTeamId = team.id;
  } else {
    const firstTeam = await prisma.team.findFirst({
      where: { leagueId },
      orderBy: { name: "asc" },
      select: { id: true },
    });

    validatedTeamId = firstTeam?.id ?? null;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      leagueId,
      teamId: validatedTeamId,
      ...(gender ? { gender } : {}),
    },
  });

  const session = await getSession();
  session.selectedLeagueId = leagueId;
  session.selectedTeamId = validatedTeamId ?? undefined;
  if (gender) session.selectedGender = gender;
  await session.save();

  return NextResponse.json({ ok: true });
}
