import { prisma } from "@/lib/prisma";
import type { SessionData } from "@/lib/session";
import { getAgeGroupLabel, type AgeGroupValue, isAgeGroupValue } from "@/lib/ageGroups";

function getCurrentSeasonStartYear(now = new Date()): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 7 ? y : y - 1;
}

export type CompetitionFilterContext = {
  seasons: Array<{ startYear: number; label: string; isCurrent: boolean }>;
  selectedSeasonStartYear: number | null;
  selectedSeasonId: string | null;
  selectedSeasonIsCurrent: boolean;

  selectedGender: "MEN" | "WOMEN";
  ageGroups: Array<{ value: AgeGroupValue; label: string }>;
  selectedAgeGroup: AgeGroupValue | null;

  rows: Array<{ id: string; name: string }>;
  selectedRowId: string | null;

  pools: Array<{ id: string; puljeId: number; name: string }>;
  selectedPoolId: string | null;

  poolTeams: Array<{ name: string }>;
  selectedTeamName: string | null;
};

export async function getCompetitionFilterContext({
  user,
  session,
}: {
  user: {
    gender: "MEN" | "WOMEN";
    ageGroup: string;
    competitionRowId: string | null;
    competitionPoolId: string | null;
    competitionTeamName: string | null;
  } | null;
  session: SessionData;
}): Promise<CompetitionFilterContext> {
  const currentStartYear = getCurrentSeasonStartYear();

  const seasonsFromDb = await prisma.competitionSeason.findMany({
    where: {
      OR: [
        { isCurrent: true, startYear: { lte: currentStartYear } },
        {
          rows: {
            some: {
              pools: {
                some: {},
              },
            },
          },
        },
      ],
    },
    select: { id: true, startYear: true, isCurrent: true },
    orderBy: { startYear: "desc" },
  });

  const seasons = seasonsFromDb.map((s) => ({
    startYear: s.startYear,
    label: `${s.startYear}-${s.startYear + 1}`,
    isCurrent: s.isCurrent,
  }));

  const currentSeason = seasonsFromDb.find((s) => s.isCurrent) ?? null;
  const requestedStartYear = session.selectedCompetitionSeasonStartYear;
  const selectedSeasonStartYear =
    typeof requestedStartYear === "number" && seasonsFromDb.some((s) => s.startYear === requestedStartYear)
      ? requestedStartYear
      : currentSeason?.startYear ?? seasonsFromDb[0]?.startYear ?? null;

  const selectedSeasonRecord =
    selectedSeasonStartYear != null
      ? seasonsFromDb.find((s) => s.startYear === selectedSeasonStartYear) ?? null
      : null;

  const selectedSeasonId = selectedSeasonRecord?.id ?? null;
  const selectedSeasonIsCurrent = selectedSeasonRecord?.isCurrent ?? false;

  const selectedGender = (session.selectedGender ?? user?.gender ?? "MEN") as
    | "MEN"
    | "WOMEN";

  const ageGroupSource = selectedSeasonId
    ? await prisma.competitionRow.findMany({
        where: {
          seasonId: selectedSeasonId,
          gender: selectedGender,
          pools: { some: {} },
        },
        select: { ageGroup: true },
      })
    : [];

  const availableAgeGroups = Array.from(
    new Set(ageGroupSource.map((r) => r.ageGroup))
  ).filter((g): g is AgeGroupValue => isAgeGroupValue(String(g)));

  const ageGroups = availableAgeGroups.map((value) => ({
    value,
    label: getAgeGroupLabel(value),
  }));

  const userAgeGroup = user?.ageGroup ?? "";
  let selectedAgeGroup: AgeGroupValue | null =
    (session.selectedAgeGroup ?? (isAgeGroupValue(userAgeGroup) ? userAgeGroup : null)) ?? null;

  if (selectedAgeGroup && !availableAgeGroups.includes(selectedAgeGroup)) {
    selectedAgeGroup = null;
  }
  if (!selectedAgeGroup) {
    selectedAgeGroup = availableAgeGroups[0] ?? null;
  }

  const rows =
    selectedSeasonId && selectedAgeGroup
      ? await prisma.competitionRow.findMany({
          where: {
            seasonId: selectedSeasonId,
            gender: selectedGender,
            ageGroup: selectedAgeGroup,
            pools: { some: {} },
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  let selectedRowId: string | null =
    session.selectedCompetitionRowId ?? user?.competitionRowId ?? rows[0]?.id ?? null;

  if (selectedRowId && !rows.some((r) => r.id === selectedRowId)) {
    selectedRowId = rows[0]?.id ?? null;
  }

  const pools = selectedRowId
    ? await prisma.competitionPool.findMany({
        where: { rowId: selectedRowId, teams: { some: {} } },
        select: { id: true, puljeId: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  let selectedPoolId: string | null =
    session.selectedCompetitionPoolId ?? user?.competitionPoolId ?? pools[0]?.id ?? null;

  if (selectedPoolId && !pools.some((p) => p.id === selectedPoolId)) {
    selectedPoolId = pools[0]?.id ?? null;
  }

  const poolTeams = selectedPoolId
    ? await prisma.competitionPoolTeam.findMany({
        where: { poolId: selectedPoolId },
        select: { name: true },
        orderBy: [{ rank: "asc" }, { name: "asc" }],
      })
    : [];

  let selectedTeamName: string | null =
    session.selectedCompetitionTeamName ??
    user?.competitionTeamName ??
    poolTeams[0]?.name ??
    null;

  if (selectedTeamName && !poolTeams.some((t) => t.name === selectedTeamName)) {
    selectedTeamName = poolTeams[0]?.name ?? null;
  }

  return {
    seasons,
    selectedSeasonStartYear,
    selectedSeasonId,
    selectedSeasonIsCurrent,
    selectedGender,
    ageGroups,
    selectedAgeGroup,
    rows,
    selectedRowId,
    pools,
    selectedPoolId,
    poolTeams,
    selectedTeamName,
  };
}
