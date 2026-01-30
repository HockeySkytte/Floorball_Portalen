"use client";

import { useEffect, useState } from "react";

type PendingUser = {
  id: string;
  userId: string;
  email: string;
  username: string;
  role: "PLAYER" | "SUPPORTER";
  createdAt: string;
};

export default function LeaderPage() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [matches, setMatches] = useState<
    {
      id: string;
      title: string;
      videoUrl: string;
      createdAt: string;
    }[]
  >([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/leader/pending");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Kunne ikke hente afventende brugere.");
        setPending([]);
        return;
      }

      setPending(data?.memberships ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function loadMatches() {
    setMatchesLoading(true);
    setMatchesError(null);

    try {
      const res = await fetch("/api/leader/matches", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMatchesError(data?.message ?? "Kunne ikke hente kampe.");
        setMatches([]);
        return;
      }
      setMatches(data?.matches ?? []);
    } finally {
      setMatchesLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, []);

  async function approve(membershipId: string, approve: boolean) {
    const res = await fetch("/api/leader/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, approve }),
    });

    if (res.ok) await load();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? "Kunne ikke opdatere bruger.");
    }
  }

  async function createMatch(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    const videoUrl = newUrl.trim();
    if (!title || !videoUrl) return;

    setCreating(true);
    setMatchesError(null);
    try {
      const res = await fetch("/api/leader/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, videoUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMatchesError(data?.message ?? "Kunne ikke oprette kamp.");
        return;
      }
      setNewTitle("");
      setNewUrl("");
      await loadMatches();
    } finally {
      setCreating(false);
    }
  }

  async function deleteMatch(matchId: string) {
    const ok = window.confirm("Slet kampen?");
    if (!ok) return;

    setMatchesError(null);
    const res = await fetch("/api/leader/matches", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMatchesError(data?.message ?? "Kunne ikke slette kamp.");
      return;
    }
    await loadMatches();
  }

  return (
    <main className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Leder</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Godkend spillere og supportere til dit hold.
        </p>
      </section>

      <section className="rounded-md border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Afventende brugere</h2>
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
            disabled={loading}
          >
            Opdater
          </button>
        </div>

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        {pending.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">Ingen afventende brugere.</p>
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
                    {u.email} • {u.role === "PLAYER" ? "Spiller" : "Supporter"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approve(u.id, true)}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white"
                  >
                    Godkend
                  </button>
                  <button
                    type="button"
                    onClick={() => approve(u.id, false)}
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

      <section className="rounded-md border bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Kampe</h2>
          <button
            type="button"
            onClick={loadMatches}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
            disabled={matchesLoading}
          >
            Opdater
          </button>
        </div>

        <p className="mt-2 text-sm text-zinc-600">Tilføj en kamp (Titel + Video URL). Kampene kan afspilles under Kampe.</p>

        {matchesError ? <p className="mt-2 text-sm text-red-600">{matchesError}</p> : null}

        <form onSubmit={createMatch} className="mt-4 grid gap-2 sm:grid-cols-3">
          <input
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            placeholder="Titel"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />
          <input
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            placeholder="Video URL (YouTube)"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            required
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={creating}
          >
            {creating ? "Gemmer…" : "Tilføj"}
          </button>
        </form>

        {matchesLoading ? <p className="mt-3 text-sm text-zinc-600">Henter…</p> : null}

        {matches.length === 0 && !matchesLoading ? (
          <p className="mt-4 text-sm text-zinc-600">Ingen kampe endnu.</p>
        ) : null}

        {matches.length > 0 ? (
          <div className="mt-4 space-y-2">
            {matches.map((m) => (
              <div key={m.id} className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{m.title}</div>
                  <div className="truncate text-xs text-zinc-600">{m.videoUrl}</div>
                </div>
                <div className="flex gap-2">
                  <a
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
                    href="/kampe"
                  >
                    Afspil
                  </a>
                  <button
                    type="button"
                    onClick={() => deleteMatch(m.id)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
                  >
                    Slet
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
