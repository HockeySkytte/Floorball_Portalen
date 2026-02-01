import { ApprovalStatus, GlobalRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      league: true,
      team: { include: { league: true } },
    },
  });

  if (!user) return null;

  const isAdmin = user.globalRole === GlobalRole.ADMIN;
  const isSuperuser = user.globalRole === GlobalRole.SUPERUSER;
  const isSuperuserApproved =
    isAdmin || !isSuperuser || user.superuserStatus === ApprovalStatus.APPROVED;

  let activeLeagueId: string | null = user.leagueId ?? null;
  let activeTeamId: string | null = user.teamId ?? null;

  const selectedTeamId = session.selectedTeamId ?? null;
  const selectedLeagueId = session.selectedLeagueId ?? null;

  if (selectedTeamId) {
    const selectedTeam = await prisma.team.findUnique({
      where: { id: selectedTeamId },
      select: { id: true, leagueId: true },
    });

    if (selectedTeam) {
      activeTeamId = selectedTeam.id;
      activeLeagueId = selectedTeam.leagueId;
    } else {
      session.selectedTeamId = undefined;
      await session.save();
    }
  }

  if (!activeTeamId && selectedLeagueId) {
    const firstTeam = await prisma.team.findFirst({
      where: { leagueId: selectedLeagueId },
      orderBy: { name: "asc" },
      select: { id: true, leagueId: true },
    });

    activeLeagueId = selectedLeagueId;
    activeTeamId = firstTeam?.id ?? null;
  }

  if (!activeTeamId) {
    const firstTeam = await prisma.team.findFirst({
      orderBy: [{ leagueId: "asc" }, { name: "asc" }],
      select: { id: true, leagueId: true },
    });

    activeTeamId = firstTeam?.id ?? null;
    activeLeagueId = firstTeam?.leagueId ?? activeLeagueId;
  }

  const activeTeam = activeTeamId
    ? await prisma.team.findUnique({
        where: { id: activeTeamId },
        include: { league: true },
      })
    : null;

  const activeLeague = activeTeam?.league
    ? activeTeam.league
    : activeLeagueId
      ? await prisma.league.findUnique({ where: { id: activeLeagueId } })
      : null;

  const activeGender = session.selectedGender ?? user.gender;

  return {
    ...user,
    isAdmin,
    isSuperuser,
    isSuperuserApproved,
    activeLeague,
    activeLeagueId: activeLeague?.id ?? null,
    activeTeam,
    activeTeamId: activeTeam?.id ?? null,
    activeGender,

    // Legacy compatibility (to be removed when old leader/membership features are deleted)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    memberships: [] as any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeMembership: null as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeRole: null as any,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");
  return user;
}

export async function requireApprovedUser() {
  // In this project, normal users do not require approval.
  // Superusers require admin approval (unless you're an admin).
  const user = await requireUser();
  if (user.isAdmin) return user;
  if (user.isSuperuser && !user.isSuperuserApproved) {
    throw new Error("NOT_APPROVED");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireApprovedUser();
  if (!user.isAdmin) throw new Error("NOT_AUTHORIZED");
  return user;
}

export async function requireTeamId() {
  const user = await requireApprovedUser();
  if (!user.activeTeamId) throw new Error("NO_TEAM");
  return { user, teamId: user.activeTeamId };
}

export async function requireSuperuserOrAdmin() {
  const user = await requireApprovedUser();
  if (user.isAdmin) return user;
  if (!user.isSuperuser) throw new Error("NOT_AUTHORIZED");
  if (!user.isSuperuserApproved) throw new Error("NOT_APPROVED");
  return user;
}

// Legacy aliases (keep old route handlers compiling while we delete them)
export async function requireLeader() {
  return requireSuperuserOrAdmin();
}

export async function requireLeaderOrAdmin() {
  return requireSuperuserOrAdmin();
}
