"use client";

import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const showSportssysFooter = pathname.startsWith("/kalender") || pathname.startsWith("/stilling");

  return (
    <>
      <div className="mt-0">
        <div className="mb-3 flex items-center gap-3">
          <img
            src="https://scontent-cph2-1.xx.fbcdn.net/v/t39.30808-6/270859681_459382205720278_242342008159134090_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=N7D1qcmG0WMQ7kNvwE7O9kG&_nc_oc=AdmDZlXD79Os_iSNMrvmXOo_ndIfy1mBWcDyxha3Da1hco-SXRtb7GW5lCU2DKyG2IU&_nc_zt=23&_nc_ht=scontent-cph2-1.xx&_nc_gid=o6BsrdJFU77SXS8xu9Uq4g&oh=00_Aft8WdLNbamK8sLp0TiJd-2gNtfrcfEhYVLfr4acuwJPSw&oe=6986696C"
            alt="Floorball Portalen"
            className="h-[75px] w-[75px] rounded-full object-cover shadow-sm ring-1 ring-white/60"
          />

          <div className="leading-tight">
            <div className="text-2xl font-normal text-[var(--brand-foreground)]">
              <span className="block">Floorball</span>
              <span className="block">Portalen</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SeasonSlicer seasons={seasons} selectedStartYear={selectedSeasonStartYear} />
          <GenderSlicer selectedGender={selectedGender} />
          <AgeGroupSlicer ageGroups={ageGroups} selectedAgeGroup={selectedAgeGroup} />
          <CompetitionRowSlicer rows={rows} selectedRowId={selectedRowId} />
          <CompetitionPoolSlicer pools={pools} selectedPoolId={selectedPoolId} />
          <CompetitionTeamSlicer teams={poolTeams} selectedTeamName={selectedTeamName} />
          <CalendarModeSlicer mode={calendarMode} hasTeam={Boolean(selectedTeamName)} />
          <StatsAggregationModeSlicer mode={statsAggregationMode} />
        </div>

        {showSportssysFooter ? (
          <div className="mt-6 text-base font-semibold italic text-[var(--brand-foreground)]">
            Data fra{" "}
            <a
              href="https://floorballresultater.sportssys.dk/tms/Turneringer-og-resultater/Soegning.aspx"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-white underline decoration-white/70 underline-offset-2"
            >
              Sportssys
            </a>
          </div>
        ) : null}
      </div>
    </>
  );
}
