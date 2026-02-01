import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import MobileAppHeader from "@/components/MobileAppHeader";
import AppSidebarContent from "@/components/AppSidebarContent";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isSuperuser && !user.isSuperuserApproved && !user.isAdmin) {
    redirect("/afventer");
  }

  const isAdmin = user.isAdmin;
  const session = await getSession();

  const leagues = await prisma.league.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const selectedGender = session.selectedGender ?? user.gender ?? "MEN";

  let selectedLeagueId: string | null =
    session.selectedLeagueId ?? user.leagueId ?? leagues[0]?.id ?? null;

  if (selectedLeagueId && !leagues.some((l) => l.id === selectedLeagueId)) {
    selectedLeagueId = leagues[0]?.id ?? null;
  }

  const teams = selectedLeagueId
    ? await prisma.team.findMany({
        where: { leagueId: selectedLeagueId },
        select: { id: true, name: true, logoUrl: true },
        orderBy: { name: "asc" },
      })
    : [];

  let selectedTeamId: string | null =
    session.selectedTeamId ?? user.teamId ?? teams[0]?.id ?? null;
  if (selectedTeamId && !teams.some((t) => t.id === selectedTeamId)) {
    selectedTeamId = teams[0]?.id ?? null;
  }

  const selectedTeamLogoUrl = teams.find((t) => t.id === selectedTeamId)?.logoUrl ?? null;

  return (
    <div className="grid min-h-dvh w-full grid-cols-1 md:grid-cols-[280px_1fr]">
      {/* Desktop: left slicer pane */}
      <aside className="hidden min-h-dvh flex-col bg-[image:var(--sidebar-gradient)] bg-cover bg-no-repeat p-4 text-[var(--brand-foreground)] md:flex">
        <Link
          className="flex items-center gap-3 text-xl font-semibold tracking-tight"
          href="/kalender"
          aria-label="Floorball Portalen"
        >
          {selectedTeamLogoUrl ? (
            <img
              src={selectedTeamLogoUrl}
              alt="Logo"
              className="h-16 w-16 object-contain"
            />
          ) : null}
          <span>Floorball Portalen</span>
        </Link>

        <AppSidebarContent
          leagues={leagues}
          selectedLeagueId={selectedLeagueId}
          teams={teams}
          selectedTeamId={selectedTeamId}
          selectedGender={selectedGender}
        />
      </aside>

      {/* Right side: topbar starts AFTER sidebar */}
      <div className="flex min-h-dvh min-w-0 flex-col">
        <div className="hidden md:block">
          <TopNav user={{ username: user.username, isAdmin }} />
        </div>

        <MobileAppHeader
          user={{ username: user.username }}
          isAdmin={isAdmin}
          leagues={leagues}
          selectedLeagueId={selectedLeagueId}
          teams={teams}
          selectedTeamId={selectedTeamId}
          selectedGender={selectedGender}
          logoUrl={selectedTeamLogoUrl}
        />

        <main className="flex-1 min-w-0 p-4 text-[var(--surface-foreground)] md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
