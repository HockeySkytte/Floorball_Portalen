"use client";

import Link from "next/link";
import { useState } from "react";
import SeasonSlicer, { type SeasonOption } from "@/components/SeasonSlicer";
import GenderSlicer from "@/components/GenderSlicer";
import AgeGroupSlicer from "@/components/AgeGroupSlicer";
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
import type { AgeGroupValue } from "@/lib/ageGroups";

export type MobileAppHeaderUser = {
  username: string;
};

export type ViewMode = "LIGHT" | "DARK";

export default function MobileAppHeader({
  user,
  isAdmin,
  viewMode,
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
  logoUrl,
}: {
  user: MobileAppHeaderUser | null;
  isAdmin: boolean;
  viewMode: ViewMode;
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
  logoUrl: string | null;
}) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function setViewMode(mode: ViewMode) {
    await fetch("/api/ui/select-view-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    window.location.reload();
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleMenu() {
    setMenuOpen((v) => {
      const next = !v;
      if (next) setFiltersOpen(false);
      return next;
    });
  }

  function toggleFilters() {
    setFiltersOpen((v) => {
      const next = !v;
      if (next) setMenuOpen(false);
      return next;
    });
  }

  return (
    <div className="sticky top-0 z-50 md:hidden">
      <div className="bg-[image:var(--sidebar-gradient)] bg-cover bg-no-repeat text-[var(--brand-foreground)]">
        <div className="flex items-start justify-between px-5 pt-5">
          <div>
            <div className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-12 w-12 rounded-md object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : null}
              <span>Floorball Portalen</span>
            </div>
            <div className="mt-1 text-sm opacity-80">{user?.username ?? "Gæst"}</div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              className="grid h-12 w-12 place-items-center rounded-xl border border-white/20 bg-white/10"
              title="Menu"
            >
              <span className="text-xl leading-none">≡</span>
            </button>
            <button
              type="button"
              onClick={toggleFilters}
              aria-expanded={filtersOpen}
              className="grid h-12 w-12 place-items-center rounded-xl border border-white/20 bg-white/10"
              title="Filtre"
            >
              <span className="text-xl leading-none">⎚</span>
            </button>
          </div>
        </div>

        {/* Menu (mobile) */}
        {menuOpen ? (
          <div className="mt-5 px-4 pb-4">
            <div className="overflow-hidden rounded-xl border border-white/15 bg-white/5">
              <nav className="divide-y divide-white/10">
                <Link
                  className="block px-4 py-4 text-lg font-semibold"
                  href="/kalender"
                  onClick={closeMenu}
                >
                  Kalender
                </Link>
                <Link
                  className="block px-4 py-4 text-lg font-semibold"
                  href="/stilling"
                  onClick={closeMenu}
                >
                  Stilling
                </Link>
                <Link
                  className="block px-4 py-4 text-lg font-semibold"
                  href="/statistik"
                  onClick={closeMenu}
                >
                  Statistik
                </Link>

                <a
                  className="block px-4 py-4 text-lg font-semibold"
                  href="https://sports-tagging.netlify.app/floorball/"
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={closeMenu}
                >
                  Shot Plotter
                </a>
                {isAdmin ? (
                  <Link
                    className="block px-4 py-4 text-lg font-semibold"
                    href="/admin"
                    onClick={closeMenu}
                  >
                    Admin
                  </Link>
                ) : null}

                <div className="px-4 py-4">
                  <div className="text-sm font-semibold opacity-90">View</div>
                  <div className="mt-2 flex overflow-hidden rounded-md border border-white/20 bg-white/10">
                    <button
                      type="button"
                      onClick={() => void setViewMode("LIGHT")}
                      className={
                        "flex-1 px-3 py-2 text-sm font-semibold " +
                        (viewMode === "LIGHT" ? "bg-white/20" : "hover:bg-white/10")
                      }
                    >
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => void setViewMode("DARK")}
                      className={
                        "flex-1 px-3 py-2 text-sm font-semibold " +
                        (viewMode === "DARK" ? "bg-white/20" : "hover:bg-white/10")
                      }
                    >
                      Dark
                    </button>
                  </div>
                </div>

                {user ? (
                  <>
                    <Link
                      className="block px-4 py-4 text-lg font-semibold"
                      href="/indstillinger"
                      onClick={closeMenu}
                    >
                      Indstillinger
                    </Link>

                    <button
                      type="button"
                      onClick={logout}
                      className="block w-full px-4 py-4 text-left text-lg font-semibold"
                    >
                      Log ud
                    </button>
                  </>
                ) : (
                  <Link
                    className="block px-4 py-4 text-lg font-semibold"
                    href="/login"
                    onClick={closeMenu}
                  >
                    Log ind
                  </Link>
                )}
              </nav>
            </div>
          </div>
        ) : null}

        {/* Filters (mobile) */}
        {filtersOpen ? (
          <div className="mt-5 px-5 pb-5">
            <div className="flex items-center justify-between rounded-full border border-white/15 bg-white/5 px-4 py-3">
              <div className="text-sm font-semibold opacity-90">
                {rows.find((r) => r.id === selectedRowId)?.name ?? ""}
              </div>
            </div>

            <div className="mt-4">
              <SeasonSlicer seasons={seasons} selectedStartYear={selectedSeasonStartYear} />
            </div>

            <div className="mt-4">
              <GenderSlicer selectedGender={selectedGender} />
            </div>

            <div className="mt-4">
              <AgeGroupSlicer ageGroups={ageGroups} selectedAgeGroup={selectedAgeGroup} />
            </div>

            <div className="mt-4">
              <CompetitionRowSlicer rows={rows} selectedRowId={selectedRowId} />
            </div>

            <div className="mt-4">
              <CompetitionPoolSlicer pools={pools} selectedPoolId={selectedPoolId} />
            </div>

            <div className="mt-4">
              <CompetitionTeamSlicer teams={poolTeams} selectedTeamName={selectedTeamName} />
            </div>

            <div className="mt-4">
              <CalendarModeSlicer mode={calendarMode} hasTeam={Boolean(selectedTeamName)} />
            </div>

            <div className="mt-4">
              <StatsAggregationModeSlicer mode={statsAggregationMode} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
