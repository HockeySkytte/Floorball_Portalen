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
    </main>
  );
}
