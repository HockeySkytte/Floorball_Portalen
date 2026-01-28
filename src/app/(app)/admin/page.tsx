"use client";

import { useEffect, useState } from "react";

type PendingLeaderMembership = {
  id: string;
  userId: string;
  email: string;
  username: string;
  teamName: string;
  createdAt: string;
};

type Team = { id: string; name: string };

type TeamColor = "RED" | "WHITE" | "BLACK" | "BLUE" | "GREEN";

const colorLabels: Record<TeamColor, string> = {
  RED: "Rød",
  WHITE: "Hvid",
  BLACK: "Sort",
  BLUE: "Blå",
  GREEN: "Grøn",
};

export default function AdminPage() {
  const [teamName, setTeamName] = useState("");
  const [themePrimary, setThemePrimary] = useState<TeamColor>("RED");
  const [themeSecondary, setThemeSecondary] = useState<"WHITE" | "BLACK">("WHITE");
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingLeaderMembership[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const [members, setMembers] = useState<
    {
      id: string;
      userId: string;
      username: string;
      email: string;
      role: "LEADER" | "PLAYER" | "SUPPORTER";
      status: "PENDING_ADMIN" | "PENDING_LEADER" | "APPROVED" | "REJECTED";
      createdAt: string;
      approvedAt: string | null;
    }[]
  >([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  async function loadPending() {
    setLoadingPending(true);
    setPendingError(null);

    try {
      const res = await fetch("/api/admin/pending-leaders");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPendingError(data?.message ?? "Kunne ikke hente afventende ledere.");
        setPending([]);
        return;
      }

      setPending(data?.memberships ?? []);
    } finally {
      setLoadingPending(false);
    }
  }

  async function loadMembers() {
    setMembersLoading(true);
    setMembersError(null);

    try {
      const res = await fetch("/api/admin/memberships", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMembers([]);
        setMembersError(data?.message ?? "Kunne ikke hente medlemmer.");
        return;
      }

      setMembers(data?.memberships ?? []);
    } finally {
      setMembersLoading(false);
    }
  }

  useEffect(() => {
    loadPending();
    loadMembers();
  }, []);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setTeamError(null);
    setTeamSuccess(null);

    const name = teamName.trim();
    if (!name) {
      setTeamError("Holdnavn mangler.");
      return;
    }

    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, themePrimary, themeSecondary }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setTeamError(data?.message ?? "Kunne ikke oprette hold.");
      return;
    }

    const team = data?.team as Team | undefined;
    setTeamSuccess(team ? `Hold oprettet: ${team.name}` : "Hold oprettet.");
    setTeamName("");
  }

  async function approveLeader(membershipId: string, approve: boolean) {
    const res = await fetch("/api/admin/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, approve }),
    });

    if (res.ok) {
      await loadPending();
      await loadMembers();
    }
    else {
      const data = await res.json().catch(() => ({}));
      setPendingError(data?.message ?? "Kunne ikke opdatere bruger.");
    }
  }

  async function deleteMembership(membershipId: string) {
    setMembersError(null);
    const res = await fetch(`/api/admin/memberships/${membershipId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMembersError(data?.message ?? "Kunne ikke slette medlem.");
      return;
    }

    await loadMembers();
  }

  return (
    <main className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Opret hold og godkend leder-brugere.
        </p>
      </section>

      <section className="rounded-md border bg-white p-4">
        <h2 className="text-lg font-semibold">Opret hold</h2>
        <form onSubmit={createTeam} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            className="sm:col-span-2 rounded-md border border-zinc-300 px-3 py-2"
            placeholder="Holdnavn"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
          <select
            className="rounded-md border border-zinc-300 bg-white px-3 py-2"
            value={themePrimary}
            onChange={(e) => setThemePrimary(e.target.value as TeamColor)}
          >
            {Object.entries(colorLabels).map(([value, label]) => (
              <option key={value} value={value}>
                Primær: {label}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-zinc-300 bg-white px-3 py-2"
            value={themeSecondary}
            onChange={(e) => setThemeSecondary(e.target.value as "WHITE" | "BLACK")}
          >
            <option value="WHITE">Sekundær: {colorLabels.WHITE}</option>
            <option value="BLACK">Sekundær: {colorLabels.BLACK}</option>
          </select>
          <button className="sm:col-span-4 rounded-md bg-[var(--brand)] px-4 py-2 text-[var(--brand-foreground)]">
            Opret
          </button>
        </form>
        {teamError ? <p className="mt-2 text-sm text-red-600">{teamError}</p> : null}
        {teamSuccess ? <p className="mt-2 text-sm text-green-700">{teamSuccess}</p> : null}
      </section>

      <section className="rounded-md border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Medlemmer (valgt hold)</h2>
          <button
            type="button"
            onClick={loadMembers}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
            disabled={membersLoading}
          >
            Opdater
          </button>
        </div>

        {membersError ? <p className="mt-2 text-sm text-red-600">{membersError}</p> : null}

        {members.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">Ingen medlemmer.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-sm">
                  <div className="font-medium">{m.username}</div>
                  <div className="text-zinc-600">
                    {m.email} • {m.role} • {m.status}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => deleteMembership(m.id)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
                  >
                    Slet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-md border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Afventende ledere</h2>
          <button
            type="button"
            onClick={loadPending}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
            disabled={loadingPending}
          >
            Opdater
          </button>
        </div>

        {pendingError ? <p className="mt-2 text-sm text-red-600">{pendingError}</p> : null}

        {pending.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">
            Ingen afventende leder-brugere.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {pending.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-sm">
                  <div className="font-medium">{u.username}</div>
                  <div className="text-zinc-600">
                    {u.email} • {u.teamName}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approveLeader(u.id, true)}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white"
                  >
                    Godkend
                  </button>
                  <button
                    type="button"
                    onClick={() => approveLeader(u.id, false)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
                  >
                    Afvis
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
