"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAgeGroupLabel, type AgeGroupValue } from "@/lib/ageGroups";

type AccountType = "USER" | "SUPERUSER";
type Gender = "MEN" | "WOMEN";
type AgeGroup = AgeGroupValue;

type CompetitionRowOption = {
  id: string;
  name: string;
  gender: Gender;
  ageGroup: AgeGroup;
};

type CompetitionPoolOption = { id: string; name: string; rowId: string };

type CompetitionPoolTeamOption = {
  poolId: string;
  name: string;
  rank: number | null;
};

export default function SignupClient({
  rows,
  pools,
  poolTeams,
}: {
  rows: CompetitionRowOption[];
  pools: CompetitionPoolOption[];
  poolTeams: CompetitionPoolTeamOption[];
}) {
  const router = useRouter();

  const [gender, setGender] = useState<Gender>("MEN");

  const availableAgeGroups = useMemo(() => {
    const set = new Set<AgeGroup>();
    for (const r of rows) {
      if (r.gender === gender) set.add(r.ageGroup);
    }
    return Array.from(set);
  }, [rows, gender]);

  const [ageGroup, setAgeGroup] = useState<AgeGroup>(
    (availableAgeGroups[0] ?? "SENIOR")
  );

  const filteredRows = useMemo(
    () => rows.filter((r) => r.gender === gender && r.ageGroup === ageGroup),
    [rows, gender, ageGroup]
  );

  const [rowId, setRowId] = useState(filteredRows[0]?.id ?? "");

  const filteredPools = useMemo(
    () => pools.filter((p) => p.rowId === rowId),
    [pools, rowId]
  );

  const [poolId, setPoolId] = useState(filteredPools[0]?.id ?? "");

  const filteredTeams = useMemo(() => {
    const list = poolTeams.filter((t) => t.poolId === poolId);
    return list.sort((a, b) => {
      const ar = a.rank ?? 999;
      const br = b.rank ?? 999;
      if (ar !== br) return ar - br;
      return a.name.localeCompare(b.name, "da");
    });
  }, [poolTeams, poolId]);

  const [teamName, setTeamName] = useState(filteredTeams[0]?.name ?? "");

  const [accountType, setAccountType] = useState<AccountType>("USER");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function onChangeGender(next: Gender) {
    setGender(next);
    const nextAgeGroups = Array.from(
      new Set(rows.filter((r) => r.gender === next).map((r) => r.ageGroup))
    );
    const nextAgeGroup = (nextAgeGroups[0] ?? "SENIOR") as AgeGroup;
    setAgeGroup(nextAgeGroup);

    const nextRows = rows.filter(
      (r) => r.gender === next && r.ageGroup === nextAgeGroup
    );
    const nextRowId = nextRows[0]?.id ?? "";
    setRowId(nextRowId);

    const nextPools = pools.filter((p) => p.rowId === nextRowId);
    const nextPoolId = nextPools[0]?.id ?? "";
    setPoolId(nextPoolId);

    const nextTeams = poolTeams.filter((t) => t.poolId === nextPoolId);
    setTeamName(nextTeams[0]?.name ?? "");
  }

  function onChangeAgeGroup(next: AgeGroup) {
    setAgeGroup(next);
    const nextRows = rows.filter((r) => r.gender === gender && r.ageGroup === next);
    const nextRowId = nextRows[0]?.id ?? "";
    setRowId(nextRowId);

    const nextPools = pools.filter((p) => p.rowId === nextRowId);
    const nextPoolId = nextPools[0]?.id ?? "";
    setPoolId(nextPoolId);

    const nextTeams = poolTeams.filter((t) => t.poolId === nextPoolId);
    setTeamName(nextTeams[0]?.name ?? "");
  }

  function onChangeRow(nextRowId: string) {
    setRowId(nextRowId);
    const nextPools = pools.filter((p) => p.rowId === nextRowId);
    const nextPoolId = nextPools[0]?.id ?? "";
    setPoolId(nextPoolId);
    const nextTeams = poolTeams.filter((t) => t.poolId === nextPoolId);
    setTeamName(nextTeams[0]?.name ?? "");
  }

  function onChangePool(nextPoolId: string) {
    setPoolId(nextPoolId);
    const nextTeams = poolTeams.filter((t) => t.poolId === nextPoolId);
    setTeamName(nextTeams[0]?.name ?? "");
  }

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
          gender,
          ageGroup,
          competitionRowId: rowId,
          competitionPoolId: poolId,
          competitionTeamName: teamName,
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
          <label className="block text-sm font-medium">Køn</label>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2"
            value={gender}
            onChange={(e) => onChangeGender(e.target.value as Gender)}
          >
            <option value="MEN">Mænd</option>
            <option value="WOMEN">Damer</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Alder</label>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2"
            value={ageGroup}
            onChange={(e) => onChangeAgeGroup(e.target.value as AgeGroup)}
            disabled={availableAgeGroups.length <= 1}
          >
            {availableAgeGroups.map((g) => (
              <option key={g} value={g}>
                {getAgeGroupLabel(g)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Liga</label>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2"
            value={rowId}
            onChange={(e) => onChangeRow(e.target.value)}
            disabled={filteredRows.length <= 1}
          >
            {filteredRows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Pulje</label>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2"
            value={poolId}
            onChange={(e) => onChangePool(e.target.value)}
            disabled={filteredPools.length <= 1}
          >
            {filteredPools.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Hold</label>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            disabled={filteredTeams.length <= 1}
          >
            {filteredTeams.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
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
          disabled={loading || !rowId || !poolId || !teamName}
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
