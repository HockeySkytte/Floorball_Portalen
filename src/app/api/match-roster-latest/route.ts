import { NextResponse } from "next/server";
import { requireSuperuserOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function norm(value: unknown): string {
  return String(value ?? "").trim();
}

function normKey(value: unknown): string {
  return norm(value).toLocaleLowerCase("da-DK");
}

function venueFromMatch(teamName: string, homeTeam: string, awayTeam: string): "Hjemme" | "Ude" | null {
  const t = normKey(teamName);
  if (!t) return null;
  if (normKey(homeTeam) === t) return "Hjemme";
  if (normKey(awayTeam) === t) return "Ude";
  return null;
}

function matchHasTeam(teamName: string, homeTeam: string, awayTeam: string): boolean {
  const t = normKey(teamName);
  return Boolean(t && (normKey(homeTeam) === t || normKey(awayTeam) === t));
}

function toPlayerRow(p: { rowIndex: number; role: string | null; number: string | null; name: string | null; born: string | null }) {
  return {
    rowIndex: p.rowIndex,
    role: p.role ?? "",
    number: p.number ?? "",
    name: p.name ?? "",
    born: p.born ?? "",
  };
}

type MatchRow = { kampId: number; startAt: Date | null; homeTeam: string; awayTeam: string };

type PlayerRow = { rowIndex: number; role: string; number: string; name: string; born: string };

function roleRank(role: string): number {
  const r = normKey(role);
  if (r === "c") return 0;
  if (r === "g") return 1;
  return 2;
}

function numberKey(numberValue: string): number {
  const cleaned = norm(numberValue);
  if (!cleaned) return 999999;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 999999;
}

function sortAndReindexRows(rows: PlayerRow[]): PlayerRow[] {
  const sorted = [...rows].sort((a, b) => {
    const ra = roleRank(a.role);
    const rb = roleRank(b.role);
    if (ra !== rb) return ra - rb;

    const na = numberKey(a.number);
    const nb = numberKey(b.number);
    if (na !== nb) return na - nb;

    return normKey(a.name).localeCompare(normKey(b.name), "da-DK");
  });

  return sorted.slice(0, 20).map((r, idx) => ({ ...r, rowIndex: idx }));
}

export async function GET(req: Request) {
  await requireSuperuserOrAdmin();

  const url = new URL(req.url);
  const teamName = norm(url.searchParams.get("teamName"));
  const excludeKampId = Number.parseInt(String(url.searchParams.get("excludeKampId") ?? ""), 10);

  if (!teamName) {
    return NextResponse.json({ message: "Mangler teamName." }, { status: 400 });
  }

  // Find latest match in DB for the team where uploaded Lineups exist.
  const teamMatches: MatchRow[] = await prisma.competitionMatch.findMany({
    where: {
      kampId: excludeKampId ? { not: excludeKampId } : undefined,
      startAt: { not: null },
      OR: [
        { homeTeam: { equals: teamName, mode: "insensitive" } },
        { awayTeam: { equals: teamName, mode: "insensitive" } },
      ],
    },
    orderBy: { startAt: "desc" },
    select: { kampId: true, startAt: true, homeTeam: true, awayTeam: true },
    take: 50,
  });

  if (teamMatches.length === 0) {
    return NextResponse.json(
      { message: "Ingen kamp fundet i databasen for det valgte hold." },
      { status: 404 }
    );
  }

  let chosen: { match: MatchRow; venue: "Hjemme" | "Ude" } | null = null;
  for (const m of teamMatches) {
    if (!matchHasTeam(teamName, m.homeTeam, m.awayTeam)) continue;
    const venue = venueFromMatch(teamName, m.homeTeam, m.awayTeam);
    if (!venue) continue;

    const exists = await prisma.matchUploadLineup.findFirst({
      where: { kampId: m.kampId, venue },
      select: { id: true },
    });

    if (exists) {
      chosen = { match: m, venue };
      break;
    }
  }

  if (chosen) {
    const uploaded = await prisma.matchUploadLineup.findMany({
      where: { kampId: chosen.match.kampId, venue: chosen.venue },
      orderBy: { rowIndex: "asc" },
      select: { cG: true, number: true, name: true, birthday: true },
    });

    const rows = sortAndReindexRows(
      uploaded.map((r: { cG: string | null; number: string | null; name: string | null; birthday: string | null }) => ({
        rowIndex: 0,
        role: r.cG ?? "",
        number: r.number ?? "",
        name: r.name ?? "",
        born: r.birthday ?? "",
      }))
    );

    return NextResponse.json({
      sourceKampId: chosen.match.kampId,
      venue: chosen.venue,
      rows,
    });
  }

  // If no uploaded Lineups exist, fall back to latest saved protocol roster (still sorted).
  for (const m of teamMatches) {
    if (!matchHasTeam(teamName, m.homeTeam, m.awayTeam)) continue;
    const venue = venueFromMatch(teamName, m.homeTeam, m.awayTeam);
    if (!venue) continue;
    const side = venue === "Hjemme" ? "HOME" : "AWAY";

    const protocol = await prisma.matchProtocolPlayer.findMany({
      where: { kampId: m.kampId, side },
      orderBy: { rowIndex: "asc" },
      select: { role: true, number: true, name: true, born: true },
      take: 50,
    });

    if (protocol.length > 0) {
      const rows = sortAndReindexRows(
        protocol.map((p: { role: string | null; number: string | null; name: string | null; born: string | null }) => ({
          rowIndex: 0,
          role: p.role ?? "",
          number: p.number ?? "",
          name: p.name ?? "",
          born: p.born ?? "",
        }))
      );

      return NextResponse.json({
        sourceKampId: m.kampId,
        venue,
        rows,
      });
    }
  }

  return NextResponse.json(
    {
      message:
        "Der er ingen uploadet holdliste (Lineups) for holdets seneste kampe, og der er heller ingen gemt holdliste i kladden.",
    },
    { status: 404 }
  );
}
