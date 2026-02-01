"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AccountType = "USER" | "SUPERUSER";

export default function SignupPage() {
  const router = useRouter();
  const [leagueName, setLeagueName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("USER");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueName,
          teamName,
          accountType,
          email,
          username,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Kunne ikke oprette bruger.");
        return;
      }

      setSuccess(
        accountType === "SUPERUSER"
          ? "Din superbruger afventer admin-godkendelse."
          : "Bruger oprettet. Du kan nu logge ind."
      );

      setEmail("");
      setUsername("");
      setPassword("");
      setLeagueName("");
      setTeamName("");

      setTimeout(() => {
        router.push("/login");
      }, 800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Opret bruger</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Liga</label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            placeholder="Fx 1. division"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Hold</label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Fx FC Example"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Brugertype</label>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as AccountType)}
            required
          >
            <option value="USER">Bruger</option>
            <option value="SUPERUSER">Superbruger</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Brugernavn</label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Kodeord</label>
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-700">{success}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[var(--brand)] px-4 py-2 text-[var(--brand-foreground)] disabled:opacity-50"
        >
          {loading ? "Opretter..." : "Opret bruger"}
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-600">
        Har du allerede en bruger?{" "}
        <a className="underline" href="/login">
          Log ind
        </a>
      </p>
    </main>
  );
}
