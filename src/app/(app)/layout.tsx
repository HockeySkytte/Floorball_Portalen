import Link from "next/link";
import TopNav from "@/components/TopNav";
import MobileAppHeader from "@/components/MobileAppHeader";
import AppSidebarContent from "@/components/AppSidebarContent";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/appContext";
import GuestDefaultsBootstrap from "@/components/GuestDefaultsBootstrap";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, ctx, calendarMode, statsAggregationMode, viewMode } = await getAppContext();

  if (user?.isSuperuser && !user.isSuperuserApproved && !user.isAdmin) {
    redirect("/afventer");
  }

  const isAdmin = user?.isAdmin ?? false;

  const {
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
  } = ctx;

  const selectedTeamLogoUrl = null;

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
          seasons={seasons}
          selectedSeasonStartYear={selectedSeasonStartYear}
          selectedGender={selectedGender}
          ageGroups={ageGroups}
          selectedAgeGroup={selectedAgeGroup}
          rows={rows}
          selectedRowId={selectedRowId}
          pools={pools}
          selectedPoolId={selectedPoolId}
          poolTeams={poolTeams}
          selectedTeamName={selectedTeamName}
          calendarMode={calendarMode}
          statsAggregationMode={statsAggregationMode}
        />
      </aside>

      {/* Right side: topbar starts AFTER sidebar */}
      <div className="flex min-h-dvh min-w-0 flex-col">
        <GuestDefaultsBootstrap enabled={!Boolean(user)} />
        <div className="hidden md:block">
          <TopNav
            viewMode={viewMode}
            user={user ? { username: user.username, isAdmin } : null}
          />
        </div>

        <MobileAppHeader
          user={user ? { username: user.username } : null}
          isAdmin={isAdmin}
          viewMode={viewMode}
          seasons={seasons}
          selectedSeasonStartYear={selectedSeasonStartYear}
          selectedGender={selectedGender}
          ageGroups={ageGroups}
          selectedAgeGroup={selectedAgeGroup}
          rows={rows}
          selectedRowId={selectedRowId}
          pools={pools}
          selectedPoolId={selectedPoolId}
          poolTeams={poolTeams}
          selectedTeamName={selectedTeamName}
          calendarMode={calendarMode}
          statsAggregationMode={statsAggregationMode}
          logoUrl={selectedTeamLogoUrl}
        />

        <main className="flex-1 min-w-0 p-4 text-[var(--surface-foreground)] md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
