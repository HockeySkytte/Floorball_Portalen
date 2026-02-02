import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/appContext";
import { prisma } from "@/lib/prisma";
import { getMatches } from "@/lib/sportssys";

export const dynamic = "force-dynamic";

type CalendarMode = "ALL" | "TEAM";

function formatDateTime(value: Date | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("da-DK", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function KalenderPage({
}: {}) {
  const { user, ctx, calendarMode } = await getAppContext();
  if (user?.isSuperuser && !user.isSuperuserApproved && !user.isAdmin) {
    redirect("/afventer");
  }

  const mode: CalendarMode = calendarMode;

  if (!ctx.selectedPoolId) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold">Kalender</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Vælg først Liga og Pulje i sliceren.
        </p>
      </div>
    );
  }

  type NormalizedMatch = {
    kampId: number;
    matchNo: number | null;
    startAt: Date | null;
    venue: string | null;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
    resultNote: "SV" | null;
  };

  let normalizedMatches: NormalizedMatch[] = [];

  if (ctx.selectedSeasonIsCurrent) {
    const allMatches = await (async () => {
      const puljeId = ctx.pools.find((p) => p.id === ctx.selectedPoolId)?.puljeId ?? null;
      if (!puljeId) return null;
      return getMatches(puljeId);
    })();

    if (allMatches === null) {
      return (
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold">Kalender</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Kunne ikke finde puljeId for den valgte pulje. Kør “Sync Sportssys” igen.
          </p>
        </div>
      );
    }

    normalizedMatches = allMatches;
  } else {
    const dbMatches = await prisma.competitionMatch.findMany({
      where: {
        poolId: ctx.selectedPoolId,
      },
      orderBy: [{ startAt: "asc" }, { matchNo: "asc" }, { kampId: "asc" }],
      select: {
        kampId: true,
        matchNo: true,
        startAt: true,
        venue: true,
        homeTeam: true,
        awayTeam: true,
        homeScore: true,
        awayScore: true,
      },
    });

    normalizedMatches = dbMatches.map((m) => ({ ...m, resultNote: null }));
  }

  const allMatchesNonNull = normalizedMatches;
  const teamName = ctx.selectedTeamName ?? "";
  const teamMatchesOnly = teamName
    ? allMatchesNonNull.filter((m) => m.homeTeam === teamName || m.awayTeam === teamName)
    : allMatchesNonNull;
  const visibleMatches = mode === "TEAM" && teamName ? teamMatchesOnly : allMatchesNonNull;

  const rowName = ctx.rows.find((r) => r.id === ctx.selectedRowId)?.name ?? "";
  const poolName = ctx.pools.find((p) => p.id === ctx.selectedPoolId)?.name ?? "";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Kalender</h1>
        <div className="text-sm text-zinc-600">
          {rowName}{poolName ? ` · ${poolName}` : ""}{teamName ? ` · ${teamName}` : ""}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed text-sm text-zinc-900">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-600">
              <tr>
                <th className="w-[140px] px-3 py-2 text-left md:w-[200px]">Dato</th>
                <th className="px-3 py-2 text-left">Kamp</th>
                <th className="w-[88px] px-3 py-2 text-left">Resultat</th>
                <th className="hidden w-[260px] px-3 py-2 text-left md:table-cell">Sted</th>
              </tr>
            </thead>
            <tbody>
              {visibleMatches.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-zinc-600" colSpan={4}>
                    Ingen kampe fundet.
                  </td>
                </tr>
              ) : (
                visibleMatches.map((m) => {
                  const baseScore =
                    m.homeScore != null && m.awayScore != null
                      ? `${m.homeScore}-${m.awayScore}`
                      : "-";

                  const scoreText =
                    baseScore !== "-" && m.resultNote === "SV" ? `${baseScore} (SV)` : baseScore;

                  const isTeamMatch =
                    teamName && (m.homeTeam === teamName || m.awayTeam === teamName);

                  return (
                    <tr
                      key={m.kampId}
                      className={
                        isTeamMatch && mode === "ALL"
                          ? "bg-[color:var(--row-highlight)]"
                          : "hover:bg-zinc-50"
                      }
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Link className="block" href={`/kampe/${m.kampId}`}>
                          {formatDateTime(m.startAt)}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Link className="block" href={`/kampe/${m.kampId}`}>
                          <div className="font-medium">
                            {m.homeTeam} – {m.awayTeam}
                          </div>
                          <div className="text-xs text-zinc-500">
                            Kamp #{m.matchNo ?? m.kampId}
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-semibold">
                        <Link className="block" href={`/kampe/${m.kampId}`}>
                          {scoreText}
                        </Link>
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <Link className="block" href={`/kampe/${m.kampId}`}>
                          {m.venue ?? ""}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
