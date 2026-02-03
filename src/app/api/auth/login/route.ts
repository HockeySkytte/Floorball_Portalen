import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";

async function ensureBootstrapAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!adminEmail || !adminPassword) return;

  const defaultLeague = await prisma.league.upsert({
    where: { id: "league_default" },
    update: { name: "Standard Liga" },
    create: { id: "league_default", name: "Standard Liga" },
  });

  const passwordHash = await hashPassword(adminPassword);

  // IMPORTANT: Shared auth DB across apps can have multiple users with the same email
  // in different leagues. Never attempt to "move" a user across leagues or overwrite
  // their email during bootstrap; only operate within the default league.
  const existingAdminByEmailInLeague = await prisma.user.findFirst({
    where: { leagueId: defaultLeague.id, email: adminEmail },
    select: { id: true, username: true, teamId: true },
  });

  if (!existingAdminByEmailInLeague) {
    const usernameCandidates = ["floorball_admin", "admin", `admin_${defaultLeague.id}`];
    let usernameToUse = usernameCandidates[0]!;
    for (const candidate of usernameCandidates) {
      const taken = await prisma.user.findFirst({
        where: { username: candidate },
        select: { id: true },
      });
      if (!taken) {
        usernameToUse = candidate;
        break;
      }
    }

    await prisma.user.create({
      data: {
        globalRole: "ADMIN",
        superuserStatus: "APPROVED",
        leagueId: defaultLeague.id,
        email: adminEmail,
        username: usernameToUse,
        passwordHash,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: existingAdminByEmailInLeague.id },
      data: {
        globalRole: "ADMIN",
        superuserStatus: "APPROVED",
        passwordHash,
      },
    });
  }

  const teams = ["U19 herrelandsholdet", "U17 herrelandsholdet"];
  for (const name of teams) {
    await prisma.team.upsert({
      where: { leagueId_name: { leagueId: defaultLeague.id, name } },
      update: {
        themePrimary: "RED",
        themeSecondary: "WHITE",
      },
      create: {
        leagueId: defaultLeague.id,
        name,
        themePrimary: "RED",
        themeSecondary: "WHITE",
      },
    });
  }

  const firstTeam = await prisma.team.findFirst({
    where: { leagueId: defaultLeague.id },
    orderBy: { name: "asc" },
    select: { id: true },
  });

  // Ensure admin has a reasonable default context.
  if (firstTeam) {
    const adminUser = await prisma.user.findFirst({
      where: { leagueId: defaultLeague.id, email: adminEmail },
      select: { id: true, teamId: true },
    });

    if (adminUser && !adminUser.teamId) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { teamId: firstTeam.id },
      });
    }
  }
}

function isLikelyMissingMigrations(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /does not exist/i.test(message) ||
    /relation .* does not exist/i.test(message) ||
    /table .* does not exist/i.test(message) ||
    /P2021/i.test(message) ||
    /P2022/i.test(message)
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const emailOrUsername = String(body?.emailOrUsername ?? "").trim();
    const password = String(body?.password ?? "");

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { message: "Udfyld venligst alle felter." },
        { status: 400 }
      );
    }

    // If DB is empty on first deploy (no seed), allow bootstrapping admin + default teams.
    const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD ?? "";
    const isAdminAttempt =
      !!adminEmail &&
      !!adminPassword &&
      password === adminPassword &&
      (emailOrUsername.toLowerCase() === adminEmail || emailOrUsername === "admin");

    if (isAdminAttempt) {
      await ensureBootstrapAdmin();
    }

    const session = await getSession();
    const preferredLeagueId = session.selectedLeagueId ?? null;
    const identifierEmail = emailOrUsername.toLowerCase();

    const candidates = await prisma.user.findMany({
      where: {
        OR: [{ email: identifierEmail }, { username: emailOrUsername }],
      },
      select: {
        id: true,
        leagueId: true,
        teamId: true,
        passwordHash: true,
        updatedAt: true,
      },
      take: 20,
    });

    const orderedCandidates = [...candidates].sort((a, b) => {
      const aPref = preferredLeagueId && a.leagueId === preferredLeagueId ? 0 : 1;
      const bPref = preferredLeagueId && b.leagueId === preferredLeagueId ? 0 : 1;
      if (aPref !== bPref) return aPref - bPref;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    let user: (typeof orderedCandidates)[number] | null = null;
    for (const candidate of orderedCandidates) {
      const ok = await verifyPassword(password, candidate.passwordHash);
      if (ok) {
        user = candidate;
        break;
      }
    }

    if (!user) {
      return NextResponse.json({ message: "Forkert login." }, { status: 401 });
    }

    session.userId = user.id;
    session.selectedLeagueId = user.leagueId;
    if (user.teamId) session.selectedTeamId = user.teamId;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("/api/auth/login failed", error);

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("SESSION_PASSWORD")) {
      return NextResponse.json(
        { message: "Server-konfiguration fejl (SESSION_PASSWORD)." },
        { status: 500 }
      );
    }

    if (isLikelyMissingMigrations(error)) {
      return NextResponse.json(
        { message: "Database er ikke initialiseret endnu." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Serverfejl." }, { status: 500 });
  }
}
