"use client";

import LeagueSlicer, { type LeagueOption } from "@/components/LeagueSlicer";
import TeamSlicer, { type TeamOption } from "@/components/TeamSlicer";
import GenderSlicer from "@/components/GenderSlicer";

export default function AppSidebarContent({
  leagues,
  selectedLeagueId,
  teams,
  selectedTeamId,
  selectedGender,
}: {
  leagues: LeagueOption[];
  selectedLeagueId: string | null;
  teams: TeamOption[];
  selectedTeamId: string | null;
  selectedGender: "MEN" | "WOMEN" | null;
}) {
  return (
    <>
      <div className="mt-4 space-y-4">
        <GenderSlicer selectedGender={selectedGender} />
        <LeagueSlicer leagues={leagues} selectedLeagueId={selectedLeagueId} />
        <TeamSlicer teams={teams} selectedTeamId={selectedTeamId} />
      </div>
    </>
  );
}
