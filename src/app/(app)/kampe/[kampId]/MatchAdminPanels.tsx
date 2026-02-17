"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Side = "home" | "away" | "events" | null;

type PlayerRow = {
  role: string;
  number: string;
  name: string;
  born: string;
};

type EventRow = {
  period: string;
  time: string;
  side: string;
  number: string;
  goal: string;
  assist: string;
  penalty: string;
  code: string;
};

const EVENT_ROW_COUNT = 50;

type PenaltyMinutes = "" | "2" | "4" | "2+10";

type CodeOption = {
  code: string;
  description: string;
};

const PENALTY_OPTIONS: Array<{ value: PenaltyMinutes; label: string }> = [
  { value: "", label: "\u00A0" },
  { value: "2", label: "2" },
  { value: "4", label: "4" },
  { value: "2+10", label: "2+10" },
];

const CODE_OPTIONS_BY_PENALTY: Record<PenaltyMinutes, CodeOption[]> = {
  "": [
    { code: "401", description: "Time Out" },
    { code: "402", description: "Straffeslag" },
  ],
  "2": [
    { code: "201", description: "Ukorrekt slag" },
    { code: "202", description: "Låsning af stav" },
    { code: "203", description: "Løfte stav" },
    { code: "204", description: "Ukorrekt spark" },
    { code: "205", description: "Fastholdning" },
    { code: "206", description: "Højt spark eller høj stav" },
    { code: "207", description: "Ukorrekt skub" },
    { code: "208", description: "Hårdt spil" },
    { code: "209", description: "Måling af stav" },
    { code: "210", description: "Spil uden stav" },
    { code: "211", description: "Undlade at fjerne knækket stav" },
    { code: "212", description: "Obstruktion" },
    { code: "213", description: "Ukorrekt afstand" },
    { code: "214", description: "Liggende spil" },
    { code: "215", description: "Spil med hånden" },
    { code: "216", description: "Ukorrekt udskiftning" },
    { code: "217", description: "For mange spillere på banen" },
    { code: "218", description: "Ukorrekt indtræden på banen" },
    { code: "219", description: "Forsinkelse af spillet" },
    { code: "220", description: "Protester" },
    { code: "221", description: "Ukorrekt udstyr" },
    { code: "222", description: "Gentagne forseelser" },
  ],
  "4": [
    { code: "501", description: "Voldsomt slag" },
    { code: "502", description: "Farligt spil" },
    { code: "503", description: "Hægtning" },
    { code: "504", description: "Hårdt spil" },
    { code: "301", description: "Matchstraf 1" },
    { code: "302", description: "Matchstraf 2" },
    { code: "303", description: "Matchstraf 3" },
  ],
  "2+10": [{ code: "101", description: "Dårlig opførsel" }],
};

function norm(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSortedNumbers(rows: Array<{ number: string }>): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = norm(r?.number);
    if (!v) continue;
    set.add(v);
  }
  return Array.from(set).sort((a, b) => {
    const an = Number.parseInt(a, 10);
    const bn = Number.parseInt(b, 10);
    if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
    return a.localeCompare(b, "da");
  });
}

function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

function formatTimeFromDigits(digits: string): string {
  const d = digitsOnly(digits).slice(0, 4);
  if (!d) return "";
  if (d.length < 4) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

function isValidTime(value: string): boolean {
  const v = norm(value);
  if (!v) return true;
  const m = v.match(/^(\d{2}):(\d{2})$/);
  if (!m) return false;
  const minutes = Number.parseInt(m[1], 10);
  const seconds = Number.parseInt(m[2], 10);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 99) return false;
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 59) return false;
  return true;
}

function parseScore(value: string): { home: number; away: number } | null {
  const v = norm(value);
  if (!v) return null;
  const m = v.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) return null;
  const home = Number.parseInt(m[1], 10);
  const away = Number.parseInt(m[2], 10);
  if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) return null;
  return { home, away };
}

function lastKnownScoreBefore(events: EventRow[], rowIndex: number): { home: number; away: number } {
  for (let i = rowIndex - 1; i >= 0; i -= 1) {
    const s = parseScore(events[i]?.goal ?? "");
    if (s) return s;
  }
  return { home: 0, away: 0 };
}

function nextGoalScore(events: EventRow[], rowIndex: number, side: "H" | "U"): string {
  const last = lastKnownScoreBefore(events, rowIndex);
  const next = side === "H" ? { home: last.home + 1, away: last.away } : { home: last.home, away: last.away + 1 };
  return `${next.home}-${next.away}`;
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_v, i) => i);
}

function emptyPlayer(): PlayerRow {
  return { role: "", number: "", name: "", born: "" };
}

function emptyEvent(): EventRow {
  return { period: "", time: "", side: "", number: "", goal: "", assist: "", penalty: "", code: "" };
}

function fillArray<T>(n: number, factory: () => T): T[] {
  return Array.from({ length: n }, factory);
}

export default function MatchAdminPanels({
  kampId,
  homeTeam,
  awayTeam,
}: {
  kampId: number;
  homeTeam: string | null;
  awayTeam: string | null;
}) {
  const [open, setOpen] = useState<Side>(null);

  const [playersHome, setPlayersHome] = useState<PlayerRow[]>(() => fillArray(20, emptyPlayer));
  const [playersAway, setPlayersAway] = useState<PlayerRow[]>(() => fillArray(20, emptyPlayer));
  const [events, setEvents] = useState<EventRow[]>(() => fillArray(EVENT_ROW_COUNT, emptyEvent));

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  const homeRows = useMemo(() => range(20), []);
  const awayRows = useMemo(() => range(20), []);
  const eventRows = useMemo(() => range(EVENT_ROW_COUNT), []);

  // Load existing saved protocol once when the admin tools are first used.
  useEffect(() => {
    if (!open) return;
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    let cancelled = false;
    setLoading(true);
    setSaveError(null);

    fetch(`/api/match-data/${kampId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled) return;

        const nextHome = fillArray(20, emptyPlayer);
        const nextAway = fillArray(20, emptyPlayer);
        const nextEvents = fillArray(EVENT_ROW_COUNT, emptyEvent);

        for (const r of data?.players?.home ?? []) {
          if (typeof r?.rowIndex !== "number") continue;
          if (r.rowIndex < 0 || r.rowIndex >= nextHome.length) continue;
          nextHome[r.rowIndex] = {
            role: String(r.role ?? ""),
            number: String(r.number ?? ""),
            name: String(r.name ?? ""),
            born: String(r.born ?? ""),
          };
        }
        for (const r of data?.players?.away ?? []) {
          if (typeof r?.rowIndex !== "number") continue;
          if (r.rowIndex < 0 || r.rowIndex >= nextAway.length) continue;
          nextAway[r.rowIndex] = {
            role: String(r.role ?? ""),
            number: String(r.number ?? ""),
            name: String(r.name ?? ""),
            born: String(r.born ?? ""),
          };
        }
        for (const r of data?.events ?? []) {
          if (typeof r?.rowIndex !== "number") continue;
          if (r.rowIndex < 0 || r.rowIndex >= nextEvents.length) continue;
          nextEvents[r.rowIndex] = {
            period: String(r.period ?? ""),
            time: String(r.time ?? ""),
            side: String(r.side ?? ""),
            number: String(r.number ?? ""),
            goal: String(r.goal ?? ""),
            assist: String(r.assist ?? ""),
            penalty: String(r.penalty ?? ""),
            code: String(r.code ?? ""),
          };
        }

        setPlayersHome(nextHome);
        setPlayersAway(nextAway);
        setEvents(nextEvents);
      })
      .catch((e) => {
        if (cancelled) return;
        setSaveError(String(e?.message ?? e));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, kampId]);

  // Debounced autosave when data changes (only while a drawer is open).
  useEffect(() => {
    if (!open) return;
    if (!hydratedRef.current) return;

    const t = window.setTimeout(() => {
      setSaving(true);
      setSaveError(null);
      fetch(`/api/match-data/${kampId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playersHome, playersAway, events }),
      })
        .then((r) => {
          if (!r.ok) return r.json().catch(() => null).then((b) => {
            throw new Error(String(b?.message ?? `HTTP ${r.status}`));
          });
        })
        .catch((e) => {
          setSaveError(String(e?.message ?? e));
        })
        .finally(() => {
          setSaving(false);
        });
    }, 600);

    return () => window.clearTimeout(t);
  }, [open, kampId, playersHome, playersAway, events]);

  async function uploadMatch() {
    setUploading(true);
    setUploadMessage(null);
    setUploadError(null);
    try {
      const invalid = validateEventsBeforeUpload(events, playersHome, playersAway);
      if (invalid) {
        throw new Error(invalid);
      }

      // Ensure we upload the latest edits (autosave is debounced).
      await fetch(`/api/match-data/${kampId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playersHome, playersAway, events }),
      }).then((r) => {
        if (!r.ok)
          return r
            .json()
            .catch(() => null)
            .then((b) => {
              throw new Error(String(b?.message ?? `Kunne ikke gemme før upload (HTTP ${r.status})`));
            });
      });

      const res = await fetch(`/api/match-upload/${kampId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(String(data?.message ?? `HTTP ${res.status}`));
      }
      const lineupsCount = Number(data?.counts?.lineups ?? 0);
      const eventsCount = Number(data?.counts?.events ?? 0);
      setUploadMessage(`Uploadet: ${lineupsCount} lineups, ${eventsCount} events.`);
    } catch (e) {
      setUploadError(String((e as any)?.message ?? e));
    } finally {
      setUploading(false);
    }
  }

  async function prefillFromLatest(which: "home" | "away") {
    const teamName = which === "home" ? String(homeTeam ?? "").trim() : String(awayTeam ?? "").trim();
    if (!teamName) {
      setPrefillError("Mangler holdnavn for kampen.");
      return;
    }

    setPrefillLoading(true);
    setPrefillError(null);
    try {
      const qp = new URLSearchParams({
        teamName,
        excludeKampId: String(kampId),
      });

      const res = await fetch(`/api/match-roster-latest?${qp.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.message ?? `HTTP ${res.status}`));

      const next = fillArray(20, emptyPlayer);
      for (const r of data?.rows ?? []) {
        if (typeof r?.rowIndex !== "number") continue;
        if (r.rowIndex < 0 || r.rowIndex >= next.length) continue;
        next[r.rowIndex] = {
          role: String(r.role ?? ""),
          number: String(r.number ?? ""),
          name: String(r.name ?? ""),
          born: String(r.born ?? ""),
        };
      }

      if (which === "home") setPlayersHome(next);
      else setPlayersAway(next);
    } catch (e) {
      setPrefillError(String((e as any)?.message ?? e));
    } finally {
      setPrefillLoading(false);
    }
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen("home")}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900"
        >
          Indtast Hjemmehold
        </button>
        <button
          type="button"
          onClick={() => setOpen("away")}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900"
        >
          Indtast Udehold
        </button>
        <button
          type="button"
          onClick={() => setOpen("events")}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900"
        >
          Indtast Events
        </button>
        <button
          type="button"
          onClick={uploadMatch}
          disabled={uploading}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900"
        >
          {uploading ? "Uploader…" : "Upload Kamp"}
        </button>
      </div>

      {uploadMessage || uploadError ? (
        <div className="mt-2 text-xs">
          {uploadMessage ? <div className="text-emerald-700">{uploadMessage}</div> : null}
          {uploadError ? <div className="text-red-600">{uploadError}</div> : null}
        </div>
      ) : null}

      {open === "home" ? (
        <RightDrawer widthClass="w-[min(460px,100%)]" title="Indtast Hjemmehold" onClose={() => setOpen(null)}>
          <StatusLine loading={loading} saving={saving} error={saveError} />
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => prefillFromLatest("home")}
              disabled={prefillLoading}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900"
            >
              {prefillLoading ? "Henter…" : "Hent seneste"}
            </button>
            {prefillError ? <div className="text-xs text-red-600">{prefillError}</div> : null}
          </div>
          <PlayersTable rows={homeRows} value={playersHome} onChange={setPlayersHome} />
        </RightDrawer>
      ) : null}

      {open === "away" ? (
        <RightDrawer widthClass="w-[min(460px,100%)]" title="Indtast Udehold" onClose={() => setOpen(null)}>
          <StatusLine loading={loading} saving={saving} error={saveError} />
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => prefillFromLatest("away")}
              disabled={prefillLoading}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900"
            >
              {prefillLoading ? "Henter…" : "Hent seneste"}
            </button>
            {prefillError ? <div className="text-xs text-red-600">{prefillError}</div> : null}
          </div>
          <PlayersTable rows={awayRows} value={playersAway} onChange={setPlayersAway} />
        </RightDrawer>
      ) : null}

      {open === "events" ? (
        <LeftDrawer widthClass="w-[min(760px,100%)]" title="Indtast Events" onClose={() => setOpen(null)}>
          <StatusLine loading={loading} saving={saving} error={saveError} />
          <EventsTable
            rows={eventRows}
            kampId={kampId}
            value={events}
            onChange={setEvents}
            playersHome={playersHome}
            playersAway={playersAway}
          />
        </LeftDrawer>
      ) : null}
    </>
  );
}

function StatusLine({
  loading,
  saving,
  error,
}: {
  loading: boolean;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="mb-3 flex items-center justify-between text-xs">
      <div className="text-zinc-600">
        {loading ? "Henter…" : saving ? "Gemmer…" : ""}
      </div>
      {error ? <div className="text-red-600">{error}</div> : null}
    </div>
  );
}

function DrawerShell({
  side,
  widthClass,
  title,
  onClose,
  children,
}: {
  side: "left" | "right";
  widthClass: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div
        className={
          "absolute top-0 h-full bg-[var(--surface)] text-[var(--surface-foreground)] shadow-2xl " +
          widthClass +
          " " +
          (side === "right" ? "right-0" : "left-0")
        }
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4">
          <div className="text-lg font-semibold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900"
          >
            Luk
          </button>
        </div>
        <div className="h-[calc(100%-64px)] overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function RightDrawer(props: Omit<Parameters<typeof DrawerShell>[0], "side">) {
  return <DrawerShell side="right" {...props} />;
}

function LeftDrawer(props: Omit<Parameters<typeof DrawerShell>[0], "side">) {
  return <DrawerShell side="left" {...props} />;
}

function PlayersTable({
  rows,
  value,
  onChange,
}: {
  rows: number[];
  value: PlayerRow[];
  onChange: (next: PlayerRow[]) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div>
        <table className="w-full table-fixed text-sm text-zinc-900">
          <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-600">
            <tr>
              <th className="w-[68px] px-2 py-2 text-left">C/G</th>
              <th className="w-[56px] px-2 py-2 text-left">Nr.</th>
              <th className="px-2 py-2 text-left">Navn</th>
              <th className="w-[78px] px-2 py-2 text-left">Født</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i} className="hover:bg-zinc-50">
                <td className="px-2 py-2">
                  <select
                    className="w-full rounded-md border border-zinc-300 bg-white px-1.5 py-1 text-sm"
                    value={value[i]?.role ?? ""}
                    onChange={(e) => {
                      const next = value.slice();
                      next[i] = { ...(next[i] ?? emptyPlayer()), role: e.target.value };
                      onChange(next);
                    }}
                  >
                    <option value="">&nbsp;</option>
                    <option value="C">C</option>
                    <option value="G">G</option>
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    inputMode="numeric"
                    className="w-full rounded-md border border-zinc-300 px-1.5 py-1 text-sm"
                    value={value[i]?.number ?? ""}
                    onChange={(e) => {
                      const next = value.slice();
                      next[i] = { ...(next[i] ?? emptyPlayer()), number: e.target.value };
                      onChange(next);
                    }}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    className="w-full min-w-0 rounded-md border border-zinc-300 px-1.5 py-1 text-sm"
                    value={value[i]?.name ?? ""}
                    onChange={(e) => {
                      const next = value.slice();
                      next[i] = { ...(next[i] ?? emptyPlayer()), name: e.target.value };
                      onChange(next);
                    }}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    placeholder="DDMMYY"
                    className="w-full rounded-md border border-zinc-300 px-1.5 py-1 text-sm"
                    value={value[i]?.born ?? ""}
                    onChange={(e) => {
                      const next = value.slice();
                      next[i] = { ...(next[i] ?? emptyPlayer()), born: e.target.value };
                      onChange(next);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EventsTable({
  rows,
  kampId,
  value,
  onChange,
  playersHome,
  playersAway,
}: {
  rows: number[];
  kampId: number;
  value: EventRow[];
  onChange: (next: EventRow[]) => void;
  playersHome: PlayerRow[];
  playersAway: PlayerRow[];
}) {
  const homeNumbers = useMemo(() => uniqueSortedNumbers(playersHome), [playersHome]);
  const awayNumbers = useMemo(() => uniqueSortedNumbers(playersAway), [playersAway]);

  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-600">KampId: {kampId}</div>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div>
          <table className="w-full table-fixed text-sm text-zinc-900">
            <thead className="bg-zinc-50 text-[11px] uppercase text-zinc-600">
              <tr>
                <th className="w-[60px] px-2 py-2 text-left">Periode</th>
                <th className="w-[72px] px-2 py-2 text-left">Tid</th>
                <th className="w-[68px] px-2 py-2 text-left">H/U</th>
                <th className="w-[80px] px-2 py-2 text-left">Nr.</th>
                <th className="w-[80px] px-2 py-2 text-left">Mål</th>
                <th className="w-[64px] px-2 py-2 text-left">Assist</th>
                <th className="w-[76px] px-2 py-2 text-left">Udvisning</th>
                <th className="w-[76px] px-2 py-2 text-left">Kode</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i} className="hover:bg-zinc-50">
                  <td className="px-2 py-2">
                    <select
                      className="w-full rounded-md border border-zinc-300 bg-white px-1.5 py-1 text-sm"
                      value={value[i]?.period ?? ""}
                      onChange={(e) => {
                        const next = value.slice();
                        next[i] = { ...(next[i] ?? emptyEvent()), period: e.target.value };
                        onChange(next);
                      }}
                    >
                      <option value="">&nbsp;</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="OT">OT</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      inputMode="numeric"
                      placeholder="mmss"
                      className="w-full rounded-md border border-zinc-300 px-1.5 py-1 text-sm"
                      value={value[i]?.time ?? ""}
                      onChange={(e) => {
                        const prev = norm(value[i]?.time);
                        const prevDigits = digitsOnly(prev);
                        const nextDigits = digitsOnly(e.target.value).slice(-4);
                        const nextTime = formatTimeFromDigits(nextDigits);

                        // If the user reached a full mmss entry, ensure seconds are valid.
                        if (nextDigits.length === 4 && !isValidTime(nextTime)) {
                          const fallbackTime = formatTimeFromDigits(prevDigits);
                          const next = value.slice();
                          next[i] = { ...(next[i] ?? emptyEvent()), time: fallbackTime };
                          onChange(next);
                          return;
                        }

                        const next = value.slice();
                        next[i] = { ...(next[i] ?? emptyEvent()), time: nextTime };
                        onChange(next);
                      }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="w-full rounded-md border border-zinc-300 bg-white px-1.5 py-1 text-sm"
                      value={value[i]?.side ?? ""}
                      onChange={(e) => {
                        const nextSide = e.target.value;
                        const next = value.slice();
                        const cur = next[i] ?? emptyEvent();
                        const numbers = nextSide === "H" ? homeNumbers : nextSide === "U" ? awayNumbers : [];
                        const numberOk = !norm(cur.number) || numbers.includes(norm(cur.number));
                        const assistOk = !norm(cur.assist) || numbers.includes(norm(cur.assist));
                        const nextRow: EventRow = {
                          ...cur,
                          side: nextSide,
                          number: numberOk ? cur.number : "",
                          assist: assistOk ? cur.assist : "",
                        };
                        next[i] = nextRow;
                        onChange(next);
                      }}
                    >
                      <option value="">&nbsp;</option>
                      <option value="H">H</option>
                      <option value="U">U</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="w-full rounded-md border border-zinc-300 bg-white px-1.5 py-1 text-sm disabled:bg-zinc-100"
                      value={value[i]?.number ?? ""}
                      disabled={!(value[i]?.side === "H" || value[i]?.side === "U")}
                      onChange={(e) => {
                        const next = value.slice();
                        next[i] = { ...(next[i] ?? emptyEvent()), number: e.target.value };
                        onChange(next);
                      }}
                    >
                      <option value="">&nbsp;</option>
                      {(value[i]?.side === "H" ? homeNumbers : value[i]?.side === "U" ? awayNumbers : []).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="w-full rounded-md border border-zinc-300 bg-white px-1.5 py-1 text-sm disabled:bg-zinc-100"
                      value={value[i]?.goal ?? ""}
                      disabled={!(value[i]?.side === "H" || value[i]?.side === "U")}
                      onChange={(e) => {
                        const next = value.slice();
                        const cur = next[i] ?? emptyEvent();
                        const nextGoal = e.target.value;
                        next[i] = { ...cur, goal: nextGoal, assist: nextGoal ? cur.assist : "" };
                        onChange(next);
                      }}
                    >
                      <option value="">&nbsp;</option>
                      {(() => {
                        const side = value[i]?.side;
                        if (side !== "H" && side !== "U") return null;
                        const computed = nextGoalScore(value, i, side);
                        const cur = norm(value[i]?.goal);
                        const opts = new Set<string>();
                        opts.add(computed);
                        if (cur && cur !== computed) opts.add(cur);
                        return Array.from(opts).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ));
                      })()}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="w-full rounded-md border border-zinc-300 bg-white px-1.5 py-1 text-sm disabled:bg-zinc-100"
                      value={value[i]?.assist ?? ""}
                      disabled={!(value[i]?.goal && (value[i]?.side === "H" || value[i]?.side === "U"))}
                      onChange={(e) => {
                        const next = value.slice();
                        next[i] = { ...(next[i] ?? emptyEvent()), assist: e.target.value };
                        onChange(next);
                      }}
                    >
                      <option value="">&nbsp;</option>
                      {(value[i]?.side === "H" ? homeNumbers : value[i]?.side === "U" ? awayNumbers : []).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="w-full rounded-md border border-zinc-300 bg-white px-1.5 py-1 text-sm"
                      value={(value[i]?.penalty ?? "") as PenaltyMinutes}
                      onChange={(e) => {
                        const nextPenalty = (e.target.value as PenaltyMinutes) ?? "";
                        const next = value.slice();
                        const cur = next[i] ?? emptyEvent();

                        const allowedCodes = new Set(CODE_OPTIONS_BY_PENALTY[nextPenalty].map((o) => o.code));
                        const nextCode = !norm(cur.code) || allowedCodes.has(norm(cur.code)) ? cur.code : "";

                        next[i] = { ...cur, penalty: nextPenalty, code: nextCode };
                        onChange(next);
                      }}
                    >
                      {PENALTY_OPTIONS.map((o) => (
                        <option key={o.value || "_"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <CodeSelect
                      value={value[i]?.code ?? ""}
                      penalty={(value[i]?.penalty ?? "") as PenaltyMinutes}
                      onChange={(nextCode) => {
                        const next = value.slice();
                        next[i] = { ...(next[i] ?? emptyEvent()), code: nextCode };
                        onChange(next);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CodeSelect({
  value,
  penalty,
  onChange,
}: {
  value: string;
  penalty: PenaltyMinutes;
  onChange: (next: string) => void;
}) {
  const options = CODE_OPTIONS_BY_PENALTY[penalty];
  const allowed = new Set(options.map((o) => o.code));
  const safeValue = allowed.has(norm(value)) ? norm(value) : "";

  return (
    <div className="relative">
      <div className="relative w-full rounded-md border border-zinc-300 bg-white px-1.5 py-1 pr-6 text-sm">
        {safeValue ? safeValue : <span className="text-zinc-400">&nbsp;</span>}
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500">▾</span>
      </div>
      <select
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">&nbsp;</option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.code} {o.description}
          </option>
        ))}
      </select>
    </div>
  );
}

function validateEventsBeforeUpload(events: EventRow[], playersHome: PlayerRow[], playersAway: PlayerRow[]): string | null {
  const homeNumbers = new Set(uniqueSortedNumbers(playersHome));
  const awayNumbers = new Set(uniqueSortedNumbers(playersAway));
  const validPeriods = new Set(["1", "2", "3", "OT"]);

  for (let i = 0; i < events.length; i += 1) {
    const e = events[i] ?? emptyEvent();
    const rowNo = i + 1;
    const any = Boolean(
      norm(e.period) ||
        norm(e.time) ||
        norm(e.side) ||
        norm(e.number) ||
        norm(e.goal) ||
        norm(e.assist) ||
        norm(e.penalty) ||
        norm(e.code)
    );
    if (!any) continue;

    if (!validPeriods.has(norm(e.period))) return `Række ${rowNo}: Periode skal være 1, 2, 3 eller OT.`;
    if (!isValidTime(e.time)) return `Række ${rowNo}: Tid skal være i format MM:SS og SS skal være 00-59.`;

    const side = norm(e.side);
    if (side !== "H" && side !== "U") return `Række ${rowNo}: H/U mangler.`;

    const roster = side === "H" ? homeNumbers : awayNumbers;
    const num = norm(e.number);
    if (num && !roster.has(num)) return `Række ${rowNo}: Nr. (${num}) findes ikke på holdlisten.`;

    const assist = norm(e.assist);
    if (assist && !roster.has(assist)) return `Række ${rowNo}: Assist (${assist}) findes ikke på holdlisten.`;

    const penalty = (norm(e.penalty) as PenaltyMinutes) || "";
    if (!(penalty === "" || penalty === "2" || penalty === "4" || penalty === "2+10")) {
      return `Række ${rowNo}: Udvisning skal være blank, 2, 4 eller 2+10.`;
    }

    const allowedCodes = new Set(CODE_OPTIONS_BY_PENALTY[penalty].map((o) => o.code));
    const code = norm(e.code);
    if (code && !allowedCodes.has(code)) {
      return `Række ${rowNo}: Kode (${code}) passer ikke til valgt udvisning.`;
    }

    if (assist && !norm(e.goal)) {
      return `Række ${rowNo}: Assist kræver at der er valgt et mål.`;
    }
  }

  return null;
}
