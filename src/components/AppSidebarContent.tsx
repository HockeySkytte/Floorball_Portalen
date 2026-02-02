"use client";

import SeasonSlicer, { type SeasonOption } from "@/components/SeasonSlicer";
import GenderSlicer from "@/components/GenderSlicer";
import AgeGroupSlicer from "@/components/AgeGroupSlicer";
import type { AgeGroupValue } from "@/lib/ageGroups";
import CompetitionRowSlicer, {
  type CompetitionRowOption,
} from "@/components/CompetitionRowSlicer";
import CompetitionPoolSlicer, {
  type CompetitionPoolOption,
} from "@/components/CompetitionPoolSlicer";
import CompetitionTeamSlicer, {
  type CompetitionTeamOption,
} from "@/components/CompetitionTeamSlicer";
import CalendarModeSlicer, { type CalendarMode } from "@/components/CalendarModeSlicer";
import StatsAggregationModeSlicer, { type StatsAggregationMode } from "@/components/StatsAggregationModeSlicer";

export default function AppSidebarContent({
  seasons,
  selectedSeasonStartYear,
  selectedGender,
  ageGroups,
  selectedAgeGroup,
  rows,
  selectedRowId,
  pools,
  selectedPoolId,
  poolTeams,
  selectedTeamName,
  calendarMode,
  statsAggregationMode,
}: {
  seasons: SeasonOption[];
  selectedSeasonStartYear: number | null;
  selectedGender: "MEN" | "WOMEN" | null;
  ageGroups: Array<{ value: AgeGroupValue; label: string }>;
  selectedAgeGroup: AgeGroupValue | null;
  rows: CompetitionRowOption[];
  selectedRowId: string | null;
  pools: CompetitionPoolOption[];
  selectedPoolId: string | null;
  poolTeams: CompetitionTeamOption[];
  selectedTeamName: string | null;
  calendarMode: CalendarMode;
  statsAggregationMode: StatsAggregationMode;
}) {
  return (
    <>
      <div className="mt-4 space-y-4">
        <SeasonSlicer seasons={seasons} selectedStartYear={selectedSeasonStartYear} />
        <GenderSlicer selectedGender={selectedGender} />
        <AgeGroupSlicer ageGroups={ageGroups} selectedAgeGroup={selectedAgeGroup} />
        <CompetitionRowSlicer rows={rows} selectedRowId={selectedRowId} />
        <CompetitionPoolSlicer pools={pools} selectedPoolId={selectedPoolId} />
        <CompetitionTeamSlicer teams={poolTeams} selectedTeamName={selectedTeamName} />
        <CalendarModeSlicer mode={calendarMode} hasTeam={Boolean(selectedTeamName)} />
        <StatsAggregationModeSlicer mode={statsAggregationMode} />
      </div>
    </>
  );
}
