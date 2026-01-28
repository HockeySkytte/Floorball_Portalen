import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { ApprovalStatus, TeamRole } from "@prisma/client";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const teamId = String(body?.teamId ?? "").trim();
  const roleInput = String(body?.role ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");

  if (!teamId || !roleInput || !email || !username || !password) {
    return NextResponse.json(
      { message: "Udfyld venligst alle felter." },
      { status: 400 }
    );
  }

  const allowedRoles = [TeamRole.LEADER, TeamRole.PLAYER, TeamRole.SUPPORTER] as const;
  if (!allowedRoles.includes(roleInput as (typeof allowedRoles)[number])) {
    return NextResponse.json({ message: "Ugyldig rolle." }, { status: 400 });
  }

  const role = roleInput as TeamRole;

  if (password.length < 6) {
    return NextResponse.json(
      { message: "Kodeord skal være mindst 6 tegn." },
      { status: 400 }
    );
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return NextResponse.json({ message: "Ugyldigt hold." }, { status: 400 });
  }

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

  const status =
    role === TeamRole.LEADER ? ApprovalStatus.PENDING_ADMIN : ApprovalStatus.PENDING_LEADER;

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      memberships: {
        create: {
          teamId,
          role,
          status,
        },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
