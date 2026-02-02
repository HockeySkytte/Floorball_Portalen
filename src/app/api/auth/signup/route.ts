import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { AgeGroup, ApprovalStatus, Gender, GlobalRole } from "@prisma/client";

function parseGender(value: unknown): Gender | null {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "MEN") return Gender.MEN;
  if (v === "WOMEN") return Gender.WOMEN;
  return null;
}

function parseAgeGroup(value: unknown): AgeGroup | null {
  const v = String(value ?? "").trim().toUpperCase();
  return (Object.values(AgeGroup) as string[]).includes(v) ? (v as AgeGroup) : null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const gender = parseGender(body?.gender);
  const ageGroup = parseAgeGroup(body?.ageGroup);
  const competitionRowId = String(body?.competitionRowId ?? "").trim();
  const competitionPoolId = String(body?.competitionPoolId ?? "").trim();
  const competitionTeamName = String(body?.competitionTeamName ?? "").trim();

  const accountType = String(body?.accountType ?? "").trim().toUpperCase();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");

  if (
    !gender ||
    !ageGroup ||
    !competitionRowId ||
    !competitionPoolId ||
    !competitionTeamName ||
    !accountType ||
    !email ||
    !username ||
    !password
  ) {
    return NextResponse.json(
      { message: "Udfyld venligst alle felter." },
      { status: 400 }
    );
  }

  const allowedAccountTypes = ["USER", "SUPERUSER"] as const;
  if (!allowedAccountTypes.includes(accountType as (typeof allowedAccountTypes)[number])) {
    return NextResponse.json({ message: "Ugyldig brugertype." }, { status: 400 });
  }

  const globalRole =
    accountType === "SUPERUSER" ? GlobalRole.SUPERUSER : GlobalRole.USER;

  if (password.length < 6) {
    return NextResponse.json(
      { message: "Kodeord skal være mindst 6 tegn." },
      { status: 400 }
    );
  }

  const row = await prisma.competitionRow.findUnique({
    where: { id: competitionRowId },
    select: { id: true, name: true, gender: true, ageGroup: true },
  });

  if (!row) {
    return NextResponse.json({ message: "Ugyldig liga." }, { status: 400 });
  }
  if (row.gender !== gender || row.ageGroup !== ageGroup) {
    return NextResponse.json(
      { message: "Liga matcher ikke det valgte køn/alder." },
      { status: 400 }
    );
  }

  const pool = await prisma.competitionPool.findUnique({
    where: { id: competitionPoolId },
    select: { id: true, rowId: true },
  });

  if (!pool || pool.rowId !== row.id) {
    return NextResponse.json({ message: "Ugyldig pulje." }, { status: 400 });
  }

  const poolTeam = await prisma.competitionPoolTeam.findUnique({
    where: { poolId_name: { poolId: pool.id, name: competitionTeamName } },
    select: { name: true },
  });

  if (!poolTeam) {
    return NextResponse.json({ message: "Ugyldigt hold." }, { status: 400 });
  }

  // Keep internal League/Team populated for legacy parts of the app.
  const league = await prisma.league.upsert({
    where: { name: row.name },
    update: {},
    create: { name: row.name },
    select: { id: true },
  });

  const team = await prisma.team.upsert({
    where: { leagueId_name: { leagueId: league.id, name: poolTeam.name } },
    update: {},
    create: {
      leagueId: league.id,
      name: poolTeam.name,
      themePrimary: "RED",
      themeSecondary: "WHITE",
    },
    select: { id: true },
  });

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { message: "Email eller brugernavn er allerede i brug." },
      { status: 409 }
    );
  }

  const superuserStatus =
    globalRole === GlobalRole.SUPERUSER
      ? ApprovalStatus.PENDING_ADMIN
      : ApprovalStatus.APPROVED;

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      globalRole,
      superuserStatus,
      leagueId: league.id,
      teamId: team.id,
      email,
      username,
      passwordHash,
      gender,
      ageGroup,
      competitionRowId: row.id,
      competitionPoolId: pool.id,
      competitionTeamName: poolTeam.name,
    },
  });

  return NextResponse.json({ ok: true });
}
