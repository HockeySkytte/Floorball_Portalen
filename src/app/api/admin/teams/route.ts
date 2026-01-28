import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TeamColor } from "@prisma/client";

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const themePrimary = String(body?.themePrimary ?? "RED").trim();
  const themeSecondary = String(body?.themeSecondary ?? "WHITE").trim();

  if (!name) {
    return NextResponse.json(
      { message: "Holdnavn mangler." },
      { status: 400 }
    );
  }

  const existing = await prisma.team.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { message: "Hold findes allerede." },
      { status: 409 }
    );
  }

  const allowed = [
    TeamColor.RED,
    TeamColor.WHITE,
    TeamColor.BLACK,
    TeamColor.BLUE,
    TeamColor.GREEN,
  ] as const;

  if (!allowed.includes(themePrimary as (typeof allowed)[number])) {
    return NextResponse.json(
      { message: "Ugyldig primær farve." },
      { status: 400 }
    );
  }

  if (!allowed.includes(themeSecondary as (typeof allowed)[number])) {
    return NextResponse.json(
      { message: "Ugyldig sekundær farve." },
      { status: 400 }
    );
  }

  if (
    themeSecondary !== TeamColor.WHITE &&
    themeSecondary !== TeamColor.BLACK
  ) {
    return NextResponse.json(
      { message: "Sekundær farve skal være hvid eller sort." },
      { status: 400 }
    );
  }

  const team = await prisma.team.create({
    data: {
      name,
      themePrimary: themePrimary as TeamColor,
      themeSecondary: themeSecondary as TeamColor,
    },
  });
  return NextResponse.json({ team: { id: team.id, name: team.name } });
}
