import { NextResponse } from "next/server";
import { requireSuperuserOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PlayerRow = {
  role?: string | null;
  number?: string | null;
  name?: string | null;
  born?: string | null;
};

type EventRow = {
  period?: string | null;
  time?: string | null;
  side?: string | null;
  number?: string | null;
  goal?: string | null;
  assist?: string | null;
  penalty?: string | null;
  code?: string | null;
};

function parseKampId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isNonEmptyPlayer(r: PlayerRow): boolean {
  return Boolean(
    String(r.role ?? "").trim() ||
      String(r.number ?? "").trim() ||
      String(r.name ?? "").trim() ||
      String(r.born ?? "").trim()
  );
}

function isNonEmptyEvent(r: EventRow): boolean {
  return Boolean(
    String(r.period ?? "").trim() ||
      String(r.time ?? "").trim() ||
      String(r.side ?? "").trim() ||
      String(r.number ?? "").trim() ||
      String(r.goal ?? "").trim() ||
      String(r.assist ?? "").trim() ||
      String(r.penalty ?? "").trim() ||
      String(r.code ?? "").trim()
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kampId: string }> }
) {
  await requireSuperuserOrAdmin();
  const { kampId: raw } = await params;
  const kampId = parseKampId(raw);
  if (!kampId) {
    return NextResponse.json({ message: "Ugyldigt kampId." }, { status: 400 });
  }

  const [home, away, events, uploadedLineups, uploadedEvents] = await Promise.all([
    prisma.matchProtocolPlayer.findMany({
      where: { kampId, side: "HOME" },
      orderBy: { rowIndex: "asc" },
      select: { rowIndex: true, role: true, number: true, name: true, born: true },
    }),
    prisma.matchProtocolPlayer.findMany({
      where: { kampId, side: "AWAY" },
      orderBy: { rowIndex: "asc" },
      select: { rowIndex: true, role: true, number: true, name: true, born: true },
    }),
    prisma.matchProtocolEvent.findMany({
      where: { kampId },
      orderBy: { rowIndex: "asc" },
      select: {
        rowIndex: true,
        period: true,
        time: true,
        side: true,
        number: true,
        goal: true,
        assist: true,
        penalty: true,
        code: true,
      },
    }),
    prisma.matchUploadLineup.findMany({
      where: { kampId },
      orderBy: [{ venue: "asc" }, { rowIndex: "asc" }],
      select: { venue: true, rowIndex: true, cG: true, number: true, name: true, birthday: true },
    }),
    prisma.matchUploadEvent.findMany({
      where: { kampId },
      orderBy: { rowIndex: "asc" },
      select: {
        rowIndex: true,
        venue: true,
        period: true,
        time: true,
        player1: true,
        player2: true,
        score: true,
        pim: true,
        code: true,
      },
    }),
  ]);

  // Prefer protocol rows (draft edits) if any exist; otherwise fall back to uploaded DB rows.
  const hasProtocol = home.length > 0 || away.length > 0 || events.length > 0;
  const hasUploaded = uploadedLineups.length > 0 || uploadedEvents.length > 0;

  if (!hasProtocol && hasUploaded) {
    const uploadedHome = (uploadedLineups as Array<{
      venue: string;
      rowIndex: number;
      cG: string | null;
      number: string | null;
      name: string | null;
      birthday: string | null;
    }>)
      .filter((r) => String(r.venue ?? "").toLowerCase().startsWith("h"))
      .map((r) => ({
        rowIndex: r.rowIndex,
        role: r.cG,
        number: r.number,
        name: r.name,
        born: r.birthday,
      }));

    const uploadedAway = (uploadedLineups as Array<{
      venue: string;
      rowIndex: number;
      cG: string | null;
      number: string | null;
      name: string | null;
      birthday: string | null;
    }>)
      .filter((r) => String(r.venue ?? "").toLowerCase().startsWith("u"))
      .map((r) => ({
        rowIndex: r.rowIndex,
        role: r.cG,
        number: r.number,
        name: r.name,
        born: r.birthday,
      }));

    const uploadedEventsMapped = (uploadedEvents as Array<{
      rowIndex: number;
      venue: string;
      period: string | null;
      time: string | null;
      player1: string | null;
      player2: string | null;
      score: string | null;
      pim: string | null;
      code: string | null;
    }>).map((r) => ({
      rowIndex: r.rowIndex,
      period: r.period,
      time: r.time,
      side: String(r.venue ?? "").toLowerCase().startsWith("h") ? "H" : String(r.venue ?? "").toLowerCase().startsWith("u") ? "U" : null,
      number: r.player1,
      goal: r.score,
      assist: r.player2,
      penalty: r.pim,
      code: r.code,
    }));

    return NextResponse.json({
      players: {
        home: uploadedHome,
        away: uploadedAway,
      },
      events: uploadedEventsMapped,
    });
  }

  return NextResponse.json({
    players: {
      home,
      away,
    },
    events,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ kampId: string }> }
) {
  await requireSuperuserOrAdmin();
  const { kampId: raw } = await params;
  const kampId = parseKampId(raw);
  if (!kampId) {
    return NextResponse.json({ message: "Ugyldigt kampId." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const playersHome: PlayerRow[] = Array.isArray(body?.playersHome) ? body.playersHome : [];
  const playersAway: PlayerRow[] = Array.isArray(body?.playersAway) ? body.playersAway : [];
  const events: EventRow[] = Array.isArray(body?.events) ? body.events : [];

  await prisma.$transaction(async (tx) => {
    await tx.matchProtocolPlayer.deleteMany({ where: { kampId } });
    await tx.matchProtocolEvent.deleteMany({ where: { kampId } });

    const homeData = playersHome
      .slice(0, 20)
      .map((r, idx) => ({
        kampId,
        side: "HOME" as const,
        rowIndex: idx,
        role: String(r.role ?? "").trim() || null,
        number: String(r.number ?? "").trim() || null,
        name: String(r.name ?? "").trim() || null,
        born: String(r.born ?? "").trim() || null,
      }))
      .filter((r) => isNonEmptyPlayer(r));

    const awayData = playersAway
      .slice(0, 20)
      .map((r, idx) => ({
        kampId,
        side: "AWAY" as const,
        rowIndex: idx,
        role: String(r.role ?? "").trim() || null,
        number: String(r.number ?? "").trim() || null,
        name: String(r.name ?? "").trim() || null,
        born: String(r.born ?? "").trim() || null,
      }))
      .filter((r) => isNonEmptyPlayer(r));

    const eventData = events
      .slice(0, 60)
      .map((r, idx) => ({
        kampId,
        rowIndex: idx,
        period: String(r.period ?? "").trim() || null,
        time: String(r.time ?? "").trim() || null,
        side: String(r.side ?? "").trim() || null,
        number: String(r.number ?? "").trim() || null,
        goal: String(r.goal ?? "").trim() || null,
        assist: String(r.assist ?? "").trim() || null,
        penalty: String(r.penalty ?? "").trim() || null,
        code: String(r.code ?? "").trim() || null,
      }))
      .filter((r) => isNonEmptyEvent(r));

    if (homeData.length) {
      await tx.matchProtocolPlayer.createMany({ data: homeData });
    }
    if (awayData.length) {
      await tx.matchProtocolPlayer.createMany({ data: awayData });
    }
    if (eventData.length) {
      await tx.matchProtocolEvent.createMany({ data: eventData });
    }
  });

  return NextResponse.json({ ok: true });
}
