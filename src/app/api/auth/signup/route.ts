import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { ApprovalStatus, GlobalRole } from "@prisma/client";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const leagueName = String(body?.leagueName ?? "").trim();
  const teamName = String(body?.teamName ?? "").trim();
  const accountType = String(body?.accountType ?? "").trim().toUpperCase();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");

  if (!leagueName || !teamName || !accountType || !email || !username || !password) {
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

  const league = await prisma.league.upsert({
    where: { name: leagueName },
    update: {},
    create: { name: leagueName },
    select: { id: true },
  });

  const team = await prisma.team.upsert({
    where: { leagueId_name: { leagueId: league.id, name: teamName } },
    update: {},
    create: {
      leagueId: league.id,
      name: teamName,
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
    },
  });

  return NextResponse.json({ ok: true });
}
