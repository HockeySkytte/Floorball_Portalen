import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AgeGroup, Gender } from "@prisma/client";
import { getMatches, getPools, getSeasonOptions, getStandings, searchRows } from "@/lib/sportssys";

export async function POST() {
  await requireAdmin();

  const seasons = await getSeasonOptions();
  const current = seasons.find((s) => s.value === "0") ?? null;

  const historical = seasons
    .filter((s) => s.value !== "0")
    .filter((s) => typeof s.startYear === "number" && Number.isFinite(s.startYear));

  const genders: Gender[] = [Gender.MEN, Gender.WOMEN];
  const ageGroups = Object.values(AgeGroup) as AgeGroup[];

  let seasonsCount = 0;
  let rowsCount = 0;
  let poolsCount = 0;
  let teamsCount = 0;
  let matchesCount = 0;

  for (const seasonOpt of historical) {
    const startYear = seasonOpt.startYear as number;
    const label = seasonOpt.label || `${startYear}-${startYear + 1}`;

    const season = await prisma.competitionSeason.upsert({
      where: { startYear },
      update: { label, isCurrent: false },
      create: { startYear, label, isCurrent: false },
    });
    seasonsCount += 1;

    for (const gender of genders) {
      for (const ageGroup of ageGroups) {
        const rows = await searchRows({ gender, ageGroup, seasonValue: seasonOpt.value });

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

            const matches = await getMatches(pool.puljeId);
            for (const m of matches) {
              await prisma.competitionMatch.upsert({
                where: { kampId: m.kampId },
                update: {
                  poolId: poolRecord.id,
                  matchNo: m.matchNo,
                  startAt: m.startAt,
                  venue: m.venue,
                  homeTeam: m.homeTeam,
                  awayTeam: m.awayTeam,
                  homeScore: m.homeScore,
                  awayScore: m.awayScore,
                },
                create: {
                  kampId: m.kampId,
                  poolId: poolRecord.id,
                  matchNo: m.matchNo,
                  startAt: m.startAt,
                  venue: m.venue,
                  homeTeam: m.homeTeam,
                  awayTeam: m.awayTeam,
                  homeScore: m.homeScore,
                  awayScore: m.awayScore,
                },
              });
              matchesCount += 1;
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    currentSeason: current?.startYear ? { startYear: current.startYear, label: current.label } : null,
    counts: {
      seasons: seasonsCount,
      rows: rowsCount,
      pools: poolsCount,
      teams: teamsCount,
      matches: matchesCount,
    },
  });
}
