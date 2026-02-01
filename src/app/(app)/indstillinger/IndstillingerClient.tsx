"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LeagueOption = { id: string; name: string };
type TeamOption = { id: string; name: string; leagueId: string };

type Gender = "MEN" | "WOMEN";

export default function IndstillingerClient({
  leagues,
  teams,
  initialLeagueId,
  initialTeamId,
  initialGender,
}: {
  leagues: LeagueOption[];
  teams: TeamOption[];
  initialLeagueId: string | null;
  initialTeamId: string | null;
  initialGender: Gender;
}) {
  const router = useRouter();

  const [leagueId, setLeagueId] = useState(initialLeagueId ?? leagues[0]?.id ?? "");
  const filteredTeams = useMemo(
    () => teams.filter((t) => t.leagueId === leagueId),
    [teams, leagueId]
  );

  const [teamId, setTeamId] = useState(
    initialTeamId && filteredTeams.some((t) => t.id === initialTeamId)
      ? initialTeamId
      : filteredTeams[0]?.id ?? ""
  );

  const [gender, setGender] = useState<Gender>(initialGender);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function onChangeLeague(nextLeagueId: string) {
    setLeagueId(nextLeagueId);
    const nextTeams = teams.filter((t) => t.leagueId === nextLeagueId);
    setTeamId(nextTeams[0]?.id ?? "");
  }

  async function save() {
    setSaving(true);
    setError(null);
    setOk(null);

    try {
      const res = await fetch("/api/auth/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId, teamId, gender }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!res.ok) {
        setError(data?.message ?? "Kunne ikke gemme indstillinger.");
        return;
      }

      setOk("Gemt.");
      router.refresh();
    } catch {
      setError("Kunne ikke gemme indstillinger.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="text-2xl font-semibold">Indstillinger</h1>
      <p className="mt-2 text-sm opacity-80">
        Vælg standardfiltre for Liga, Hold og Køn.
      </p>

      <div className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm">
        <div>
          <div className="text-sm font-semibold">Køn</div>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
          >
            <option value="MEN">Mænd</option>
            <option value="WOMEN">Damer</option>
          </select>
        </div>

        <div>
          <div className="text-sm font-semibold">Liga</div>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            value={leagueId}
            onChange={(e) => onChangeLeague(e.target.value)}
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-sm font-semibold">Hold</div>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            disabled={filteredTeams.length <= 1}
          >
            {filteredTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {error}
          </div>
        ) : null}

        {ok ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
            {ok}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || !leagueId}
            className="rounded-md bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            {saving ? "Gemmer..." : "Gem"}
          </button>
        </div>
      </div>
    </div>
  );
}
