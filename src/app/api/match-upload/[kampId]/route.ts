import { NextResponse } from "next/server";
import { requireSuperuserOrAdmin } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { getCompetitionFilterContext } from "@/lib/competitionFilters";
import { prisma } from "@/lib/prisma";
import { getMatches } from "@/lib/sportssys";

function parseKampId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function norm(value: unknown): string {
  return String(value ?? "").trim();
}

function venueFromSide(value: string, fallback = ""): string {
  const v = norm(value).toLowerCase();
  if (!v) return fallback;
  if (v === "h" || v === "home" || v === "hjemme") return "Hjemme";
  if (v === "u" || v === "away" || v === "ude") return "Ude";
  return fallback;
}

function deriveEventType({ score, pim, code }: { score: string; pim: string; code: string }): string {
  if (norm(score)) return "Goal";
  if (norm(pim)) return "Penalty";
  const c = norm(code);
  if (c === "401") return "Time Out";
  if (c === "402") return "Straffeslag";
  return "";
}

function isNonEmptyLineup(r: {
  cG: string | null;
  number: string | null;
  name: string | null;
  birthday: string | null;
}): boolean {
  return Boolean(norm(r.cG) || norm(r.number) || norm(r.name) || norm(r.birthday));
}

function isNonEmptyUploadEvent(r: {
  period: string | null;
  time: string | null;
  venue: string;
  player1: string | null;
  player2: string | null;
  score: string | null;
  event: string | null;
  pim: string | null;
  code: string | null;
}): boolean {
  return Boolean(
    norm(r.period) ||
      norm(r.time) ||
      norm(r.venue) ||
      norm(r.player1) ||
      norm(r.player2) ||
      norm(r.score) ||
      norm(r.event) ||
      norm(r.pim) ||
      norm(r.code)
  );
}

async function resolveMatchMeta(kampId: number) {
  const dbMatch = await prisma.competitionMatch.findUnique({
    where: { kampId },
    include: { pool: { include: { row: true } } },
  });

  if (dbMatch) {
    return {
      date: dbMatch.startAt ?? null,
      liga: dbMatch.pool.row.name,
      pulje: dbMatch.pool.name,
    };
  }

  const user = await requireSuperuserOrAdmin();
  const session = await getSession();
  const ctx = await getCompetitionFilterContext({
    user: {
      gender: user.gender,
      ageGroup: user.ageGroup,
      competitionRowId: user.competitionRowId,
      competitionPoolId: user.competitionPoolId,
      competitionTeamName: user.competitionTeamName,
    },
    session,
  });

  const rowName = ctx.rows.find((r) => r.id === ctx.selectedRowId)?.name ?? "";
  const poolName = ctx.pools.find((p) => p.id === ctx.selectedPoolId)?.name ?? "";

  let date: Date | null = null;
  if (ctx.selectedSeasonIsCurrent && ctx.selectedPoolId) {
    const puljeId = ctx.pools.find((p) => p.id === ctx.selectedPoolId)?.puljeId ?? null;
    if (puljeId) {
      const matches = await getMatches(puljeId);
      const match = matches.find((m) => m.kampId === kampId) ?? null;
      date = match?.startAt ?? null;
    }
  }

  return {
    date,
    liga: rowName,
    pulje: poolName,
  };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ kampId: string }> }
) {
  // Auth is required; resolveMatchMeta will also validate selection if the match is not in DB.
  await requireSuperuserOrAdmin();

  const { kampId: raw } = await params;
  const kampId = parseKampId(raw);
  if (!kampId) {
    return NextResponse.json({ message: "Ugyldigt kampId." }, { status: 400 });
  }

  const meta = await resolveMatchMeta(kampId);

  const [players, events] = await Promise.all([
    prisma.matchProtocolPlayer.findMany({
      where: { kampId },
      orderBy: [{ side: "asc" }, { rowIndex: "asc" }],
      select: { side: true, rowIndex: true, role: true, number: true, name: true, born: true },
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
  ]);

  const lineups = players
    .map((p) => {
      const venue = p.side === "HOME" ? "Hjemme" : "Ude";
      const cG = (norm(p.role) || "").toUpperCase();
      return {
        kampId,
        rowIndex: p.rowIndex,
        date: meta.date,
        liga: meta.liga || "",
        pulje: meta.pulje || "",
        venue,
        cG: cG === "C" || cG === "G" ? cG : null,
        number: norm(p.number) || null,
        name: norm(p.name) || null,
        birthday: norm(p.born) || null,
      };
    })
    .filter((r) => isNonEmptyLineup(r));

  const uploadEvents = events
    .map((e) => {
      const venue = venueFromSide(e.side ?? "", "");
      const score = norm(e.goal) || "";
      const pim = norm(e.penalty) || "";
      const code = norm(e.code) || "";
      const event = deriveEventType({ score, pim, code });

      return {
        kampId,
        rowIndex: e.rowIndex,
        date: meta.date,
        liga: meta.liga || "",
        pulje: meta.pulje || "",
        venue,
        period: norm(e.period) || null,
        time: norm(e.time) || null,
        player1: norm(e.number) || null,
        player2: norm(e.assist) || null,
        score: score || null,
        event: event || null,
        pim: pim || null,
        code: code || null,
      };
    })
    .filter((r) => isNonEmptyUploadEvent(r));

  await prisma.$transaction(async (tx) => {
    await tx.matchUploadLineup.deleteMany({ where: { kampId } });
    await tx.matchUploadEvent.deleteMany({ where: { kampId } });

    if (lineups.length) {
      await tx.matchUploadLineup.createMany({ data: lineups });
    }
    if (uploadEvents.length) {
      await tx.matchUploadEvent.createMany({ data: uploadEvents });
    }
  });

  return NextResponse.json({
    ok: true,
    counts: {
      lineups: lineups.length,
      events: uploadEvents.length,
    },
  });
}
