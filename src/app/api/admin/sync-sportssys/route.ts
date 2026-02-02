import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AgeGroup, Gender } from "@prisma/client";
import {
  getSeasonOptions,
  getPools,
  getStandings,
  searchRows,
} from "@/lib/sportssys";

export async function POST() {
  await requireAdmin();

  const seasons = await getSeasonOptions();
  const current = seasons.find((s) => s.value === "0") ?? null;
  const startYear = current?.startYear ?? new Date().getFullYear();
  const label = current?.label ?? `${startYear}-${startYear + 1}`;

  // Ensure exactly one current season.
  await prisma.competitionSeason.updateMany({
    where: { isCurrent: true },
    data: { isCurrent: false },
  });

  const season = await prisma.competitionSeason.upsert({
    where: { startYear },
    update: { label, isCurrent: true },
    create: { startYear, label, isCurrent: true },
  });

  const genders: Gender[] = [Gender.MEN, Gender.WOMEN];
  const ageGroups = Object.values(AgeGroup) as AgeGroup[];
  let rowsCount = 0;
  let poolsCount = 0;
  let teamsCount = 0;

  for (const gender of genders) {
    for (const ageGroup of ageGroups) {
      const rows = await searchRows({ gender, ageGroup, seasonValue: "0" });

      for (const row of rows) {
        const rowRecord = await prisma.competitionRow.upsert({
          where: { raekkeId: row.raekkeId },
          update: { name: row.name, gender, ageGroup, seasonId: season.id },
          create: {
            raekkeId: row.raekkeId,
            name: row.name,
            gender,
            ageGroup,
            seasonId: season.id,
          },
        });
        rowsCount += 1;

        const pools = await getPools(row.raekkeId);
        for (const pool of pools) {
          const poolRecord = await prisma.competitionPool.upsert({
            where: { puljeId: pool.puljeId },
            update: { name: pool.name, rowId: rowRecord.id },
            create: { puljeId: pool.puljeId, name: pool.name, rowId: rowRecord.id },
          });
          poolsCount += 1;

          // Store standings mostly for slicer ordering/team lists.
          const standings = await getStandings(pool.puljeId);
          for (const team of standings) {
            await prisma.competitionPoolTeam.upsert({
              where: { poolId_name: { poolId: poolRecord.id, name: team.team } },
              update: {
                rank: team.rank,
                played: team.played,
                wins: team.wins,
                draws: team.draws,
                losses: team.losses,
                goalsFor: team.goalsFor,
                goalsAgainst: team.goalsAgainst,
                points: team.points,
              },
              create: {
                poolId: poolRecord.id,
                name: team.team,
                rank: team.rank,
                played: team.played,
                wins: team.wins,
                draws: team.draws,
                losses: team.losses,
                goalsFor: team.goalsFor,
                goalsAgainst: team.goalsAgainst,
                points: team.points,
              },
            });
            teamsCount += 1;
          }
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    season: { startYear, label },
    counts: {
      rows: rowsCount,
      pools: poolsCount,
      teams: teamsCount,
      matches: 0,
    },
  });
}
