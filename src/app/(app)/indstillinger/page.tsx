import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/session";
import IndstillingerClient from "./IndstillingerClient";

export default async function IndstillingerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isSuperuser && !user.isSuperuserApproved && !user.isAdmin) {
    redirect("/afventer");
  }

  const session = await getSession();

  const leagues = await prisma.league.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const teams = await prisma.team.findMany({
    select: { id: true, name: true, leagueId: true },
    orderBy: [{ leagueId: "asc" }, { name: "asc" }],
  });

  const initialLeagueId = session.selectedLeagueId ?? user.leagueId ?? leagues[0]?.id ?? null;
  const initialTeamId = session.selectedTeamId ?? user.teamId ?? null;
  const initialGender = (session.selectedGender ?? user.gender ?? "MEN") as "MEN" | "WOMEN";

  return (
    <IndstillingerClient
      leagues={leagues}
      teams={teams}
      initialLeagueId={initialLeagueId}
      initialTeamId={initialTeamId}
      initialGender={initialGender}
    />
  );
}
