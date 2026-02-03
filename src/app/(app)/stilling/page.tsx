import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/appContext";
import { prisma } from "@/lib/prisma";
import { getStandings } from "@/lib/sportssys";

export const dynamic = "force-dynamic";

function fmt(value: number | null) {
  return value == null ? "-" : String(value);
}

export default async function StillingPage() {
  const { user, ctx } = await getAppContext();
  if (user?.isSuperuser && !user.isSuperuserApproved && !user.isAdmin) {
    redirect("/afventer");
  }

  if (ctx.isPokalturnering) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold">Stilling</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Der er ingen stilling for Pokalturneringen.
        </p>
      </div>
    );
  }

  if (!ctx.selectedPoolId) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold">Stilling</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Vælg først Liga og Pulje i sliceren.
        </p>
      </div>
    );
  }

  const rawStandings = ctx.selectedSeasonIsCurrent
    ? await (async () => {
        const puljeId = ctx.pools.find((p) => p.id === ctx.selectedPoolId)?.puljeId ?? null;
        if (!puljeId) return null;
        return getStandings(puljeId);
      })()
    : await prisma.competitionPoolTeam.findMany({
        where: { poolId: ctx.selectedPoolId },
        orderBy: [{ rank: "asc" }, { name: "asc" }],
        select: {
          name: true,
          rank: true,
          played: true,
          wins: true,
          draws: true,
          losses: true,
          goalsFor: true,
          goalsAgainst: true,
          points: true,
        },
      });

  if (ctx.selectedSeasonIsCurrent && rawStandings === null) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold">Stilling</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Kunne ikke finde puljeId for den valgte pulje. Kør “Sync Sportssys” igen.
        </p>
      </div>
    );
  }

  const normalized = (rawStandings ?? []).map((t) =>
    "team" in t
      ? t
      : {
          rank: t.rank ?? 0,
          team: t.name,
          played: t.played,
          wins: t.wins,
          draws: t.draws,
          losses: t.losses,
          goalsFor: t.goalsFor,
          goalsAgainst: t.goalsAgainst,
          points: t.points,
        }
  );

  const rowName = ctx.rows.find((r) => r.id === ctx.selectedRowId)?.name ?? "";
  const poolName = ctx.pools.find((p) => p.id === ctx.selectedPoolId)?.name ?? "";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Stilling</h1>
        <div className="text-sm text-zinc-600">
          {rowName}{poolName ? ` · ${poolName}` : ""}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-zinc-900">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Hold</th>
                <th className="px-3 py-2 text-right">K</th>
                <th className="px-3 py-2 text-right">V</th>
                <th className="px-3 py-2 text-right">U</th>
                <th className="px-3 py-2 text-right">T</th>
                <th className="px-3 py-2 text-right">Mål</th>
                <th className="px-3 py-2 text-right">P</th>
              </tr>
            </thead>
            <tbody>
              {normalized.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-zinc-600" colSpan={8}>
                    Ingen stilling fundet.
                  </td>
                </tr>
              ) : (
                normalized.map((t) => {
                  const gf = t.goalsFor;
                  const ga = t.goalsAgainst;
                  const goals =
                    gf != null && ga != null ? `${gf}-${ga}` : gf != null ? `${gf}-?` : "-";
                  const isSelected = ctx.selectedTeamName === t.team;

                  return (
                    <tr
                      key={t.team}
                      className={
                        isSelected ? "bg-[color:var(--row-highlight)]" : "hover:bg-zinc-50"
                      }
                    >
                      <td className="px-3 py-2 whitespace-nowrap font-semibold">
                        {fmt(t.rank)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{t.team}</div>
                      </td>
                      <td className="px-3 py-2 text-right">{fmt(t.played)}</td>
                      <td className="px-3 py-2 text-right">{fmt(t.wins)}</td>
                      <td className="px-3 py-2 text-right">{fmt(t.draws)}</td>
                      <td className="px-3 py-2 text-right">{fmt(t.losses)}</td>
                      <td className="px-3 py-2 text-right">{goals}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {fmt(t.points)}
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
