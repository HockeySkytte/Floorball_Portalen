import { NextResponse } from "next/server";
import { requireLeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const leader = await requireLeader();
  const { id } = await ctx.params;
  const teamId = leader.activeTeamId;
  if (!teamId) {
    return NextResponse.json({ message: "Ingen valgt hold." }, { status: 400 });
  }

  const prismaAny = prisma as any;

  const file = await prismaAny.statsFile.findUnique({ where: { id } });
  if (!file || file.teamId !== teamId) {
    return NextResponse.json({ message: "Fil ikke fundet." }, { status: 404 });
  }

  await prismaAny.statsFile.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
