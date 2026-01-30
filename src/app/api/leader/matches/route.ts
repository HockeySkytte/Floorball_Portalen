import { NextResponse } from "next/server";
import { requireLeaderOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeTitle(input: unknown) {
  return String(input ?? "").trim();
}

function normalizeUrl(input: unknown) {
  return String(input ?? "").trim();
}

export async function GET() {
  const user = await requireLeaderOrAdmin();
  const teamId = user.activeTeamId;
  if (!teamId) {
    return NextResponse.json({ message: "Ingen valgt hold." }, { status: 400 });
  }

  const matches = await prisma.match.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      videoUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ teamId, matches });
}

export async function POST(req: Request) {
  const user = await requireLeaderOrAdmin();
  const teamId = user.activeTeamId;
  if (!teamId) {
    return NextResponse.json({ message: "Ingen valgt hold." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const title = normalizeTitle(body?.title);
  const videoUrl = normalizeUrl(body?.videoUrl);

  if (!title) {
    return NextResponse.json({ message: "Titel mangler." }, { status: 400 });
  }
  if (!videoUrl) {
    return NextResponse.json({ message: "Video URL mangler." }, { status: 400 });
  }

  const created = await prisma.match.create({
    data: {
      teamId,
      title,
      videoUrl,
    },
    select: {
      id: true,
      title: true,
      videoUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, match: created });
}

export async function DELETE(req: Request) {
  const user = await requireLeaderOrAdmin();
  const teamId = user.activeTeamId;
  if (!teamId) {
    return NextResponse.json({ message: "Ingen valgt hold." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const matchId = String(body?.matchId ?? "").trim();
  if (!matchId) {
    return NextResponse.json({ message: "matchId mangler." }, { status: 400 });
  }

  const existing = await prisma.match.findUnique({ where: { id: matchId } });
  if (!existing || existing.teamId !== teamId) {
    return NextResponse.json({ message: "Ugyldig kamp." }, { status: 404 });
  }

  await prisma.match.delete({ where: { id: matchId } });
  return NextResponse.json({ ok: true });
}
