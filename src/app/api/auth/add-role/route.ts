import { NextResponse } from "next/server";
import { ApprovalStatus, TeamRole } from "@prisma/client";
import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await requireApprovedUser();
  const body = await req.json().catch(() => null);

  const teamId = String(body?.teamId ?? "").trim();
  const roleInput = String(body?.role ?? "").trim();

  if (!teamId || !roleInput) {
    return NextResponse.json(
      { message: "teamId og rolle skal udfyldes." },
      { status: 400 }
    );
  }

  const allowedRoles = [TeamRole.LEADER, TeamRole.PLAYER, TeamRole.SUPPORTER] as const;
  if (!allowedRoles.includes(roleInput as (typeof allowedRoles)[number])) {
    return NextResponse.json({ message: "Ugyldig rolle." }, { status: 400 });
  }

  const role = roleInput as TeamRole;

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
  if (!team) {
    return NextResponse.json({ message: "Ugyldigt hold." }, { status: 400 });
  }

  const existing = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId: user.id, teamId } },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { message: "Du har allerede en rolle på dette hold." },
      { status: 409 }
    );
  }

  const status =
    role === TeamRole.LEADER
      ? ApprovalStatus.PENDING_ADMIN
      : ApprovalStatus.PENDING_LEADER;

  await prisma.teamMembership.create({
    data: {
      userId: user.id,
      teamId,
      role,
      status,
    },
  });

  return NextResponse.json({ ok: true });
}
