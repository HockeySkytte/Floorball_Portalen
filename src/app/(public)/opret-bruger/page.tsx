import { prisma } from "@/lib/prisma";
import SignupClient from "./SignupClient";

export default async function SignupPage() {
  const currentSeason = await prisma.competitionSeason.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });

  const rows = currentSeason
    ? await prisma.competitionRow.findMany({
        where: { seasonId: currentSeason.id, pools: { some: {} } },
        select: { id: true, name: true, gender: true, ageGroup: true },
        orderBy: [{ gender: "asc" }, { name: "asc" }],
      })
    : [];

  const pools = currentSeason
    ? await prisma.competitionPool.findMany({
        where: { row: { seasonId: currentSeason.id }, teams: { some: {} } },
        select: { id: true, name: true, rowId: true },
        orderBy: [{ rowId: "asc" }, { name: "asc" }],
      })
    : [];

  const poolTeams = currentSeason
    ? await prisma.competitionPoolTeam.findMany({
        where: { pool: { row: { seasonId: currentSeason.id } } },
        select: { poolId: true, name: true, rank: true },
        orderBy: [{ poolId: "asc" }, { rank: "asc" }, { name: "asc" }],
      })
    : [];

  if (!currentSeason || rows.length === 0) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">Opret bruger</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Der er endnu ikke indlæst liga-data. Kontakt en admin og kør sync.
        </p>
      </main>
    );
  }

  return <SignupClient rows={rows} pools={pools} poolTeams={poolTeams} />;
}
