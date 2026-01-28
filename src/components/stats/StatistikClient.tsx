"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStatsFilters } from "@/components/stats/StatsFiltersProvider";

type StatsFile = {
  id: string;
  kind: "EVENTS" | "PLAYERS";
  originalName: string;
  createdAt: string;
  gameId: string | null;
  gameDate: string | null;
  competition: string | null;
};

type StatsEvent = {
  id: string;
  timestamp: string | null;
  period: number | null;
  event: string;
  perspective?: string | null;
  strength?: string | null;
  goalieName?: string | null;
  gNo?: number | null;
  teamName?: string | null;
  teamHome?: string | null;
  teamAway?: string | null;
  homePlayersNames?: string | null;
  awayPlayersNames?: string | null;
  p1No: number | null;
  p1Name: string | null;
  p2No: number | null;
  p2Name: string | null;
  xM: number | null;
  yM: number | null;
  gameId: string | null;
  gameDate?: string | null;
  competition: string | null;
  file: { id: string; originalName: string; createdAt: string };
};

type TabKey = "events" | "shotmap" | "heatmap" | "tabeller" | "video";

type ShotKind = "GOAL" | "SHOT" | "MISS" | "BLOCK" | "PENALTY";

function classifyShotKind(event: string): ShotKind {
  const e = String(event ?? "").trim().toLowerCase();
  if (e.includes("goal")) return "GOAL";
  if (e.includes("miss")) return "MISS";
  if (e.includes("block")) return "BLOCK";
  if (e.includes("penalty")) return "PENALTY";
  return "SHOT";
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function toHalfRinkPoint(
  xM: number,
  yM: number,
  half: "left" | "right"
): { x: number; y: number } | null {
  // Data uses center-origin meters: x in [-20,20], y in [-10,10]
  // Each half-rink displays x in [-20,0] (left) or [0,20] (right), normalized to [0,1]
  const x = clamp(xM, -20, 20);
  const y = clamp(yM, -10, 10);

  if (half === "left") {
    if (x > 0) return null;
    return { x: (x + 20) / 20, y: (y + 10) / 20 };
  }

  if (x < 0) return null;
  return { x: x / 20, y: (y + 10) / 20 };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function ShotMarker({
  kind,
  x,
  y,
  color,
}: {
  kind: ShotKind;
  x: number;
  y: number;
  color: string;
}) {
  const cx = `${(x * 100).toFixed(4)}%`;
  const cy = `${(y * 100).toFixed(4)}%`;
  const common = {
    fill: "none",
    stroke: color,
    strokeWidth: 2,
    vectorEffect: "non-scaling-stroke" as const,
  };

  switch (kind) {
    case "SHOT":
      return <circle cx={cx} cy={cy} r={6} {...common} />;
    case "MISS":
      return <polygon points={`${cx},${`${(y * 100 - 1.0).toFixed(4)}%`} ${`${(x * 100 - 0.8).toFixed(4)}%`},${`${(y * 100 + 0.7).toFixed(4)}%`} ${`${(x * 100 + 0.8).toFixed(4)}%`},${`${(y * 100 + 0.7).toFixed(4)}%`}`} {...common} />;
    case "BLOCK":
      return <rect x={`calc(${cx} - 6px)`} y={`calc(${cy} - 6px)`} width={12} height={12} rx={1} {...common} />;
    case "PENALTY":
      return <polygon points={`${cx},${`${(y * 100 - 1.0).toFixed(4)}%`} ${`${(x * 100 - 0.9).toFixed(4)}%`},${cy} ${cx},${`${(y * 100 + 1.0).toFixed(4)}%`} ${`${(x * 100 + 0.9).toFixed(4)}%`},${cy}`} {...common} />;
    case "GOAL":
    default:
      // 5-point star
      return (
        <path
          d={
            `M 0,-7 L 2,-2 L 7,-2 L 3,1 L 4,6 L 0,3 L -4,6 L -3,1 L -7,-2 L -2,-2 Z`
          }
          transform={`translate(${cx.replace("%", "")}, ${cy.replace("%", "")})`}
          transform-origin={`${cx} ${cy}`}
          {...common}
        />
      );
  }
}

function HalfRink({
  title,
  half,
  events,
  selectedTeam,
}: {
  title: string;
  half: "left" | "right";
  events: StatsEvent[];
  selectedTeam: string;
}) {
  const selected = String(selectedTeam ?? "").trim();
  const offenseColor = "var(--brand)";
  const defenseColor = "var(--surface-foreground)";

  const points = useMemo(() => {
    const out: Array<{
      id: string;
      kind: ShotKind;
      x: number;
      y: number;
      color: string;
    }> = [];

    for (const e of events) {
      if (!isFiniteNumber(e.xM) || !isFiniteNumber(e.yM)) continue;
      const p = toHalfRinkPoint(e.xM, e.yM, half);
      if (!p) continue;

      const isOffense = String(e.teamName ?? "").trim() === selected;
      out.push({
        id: e.id,
        kind: classifyShotKind(e.event),
        x: p.x,
        y: p.y,
        color: isOffense ? offenseColor : defenseColor,
      });
    }

    return out;
  }, [events, half, selected]);

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-zinc-600">{title}</div>
      <div className="relative overflow-hidden rounded-md border border-[color:var(--surface-border)] bg-[color:var(--surface)]">
        <div className="relative aspect-[1/1] w-full">
          <img
            src="/bane.png"
            alt="Bane"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: half === "left" ? "left center" : "right center" }}
          />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {points.map((p) => (
              <ShotMarker key={p.id} kind={p.kind} x={p.x} y={p.y} color={p.color} />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function StatistikClient({ isLeader }: { isLeader: boolean }) {
  const [tab, setTab] = useState<TabKey>("events");

  const { filters } = useStatsFilters();

  const eventsFileInputRef = useRef<HTMLInputElement | null>(null);
  const playersFileInputRef = useRef<HTMLInputElement | null>(null);

  const [events, setEvents] = useState<StatsEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [eventFiles, setEventFiles] = useState<StatsFile[]>([]);
  const [playerFiles, setPlayerFiles] = useState<StatsFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);

  const [uploading, setUploading] = useState<"EVENTS" | "PLAYERS" | null>(null);

  const tabs = useMemo(
    () =>
      [
        { key: "events" as const, label: "Events" },
        { key: "shotmap" as const, label: "Shot Map" },
        { key: "heatmap" as const, label: "Heat Map" },
        { key: "tabeller" as const, label: "Tabeller" },
        { key: "video" as const, label: "Video" },
      ],
    []
  );

  async function loadEvents() {
    setEventsLoading(true);
    setEventsError(null);

    try {
      const res = await fetch("/api/stats/events?limit=1000", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEvents([]);
        setEventsError(data?.message ?? "Kunne ikke hente events.");
        return;
      }

      setEvents(data?.events ?? []);
    } finally {
      setEventsLoading(false);
    }
  }

  async function loadFiles() {
    if (!isLeader) return;

    setFilesLoading(true);
    setFilesError(null);

    try {
      const [eventsRes, playersRes] = await Promise.all([
        fetch("/api/stats/files?kind=EVENTS", { cache: "no-store" }),
        fetch("/api/stats/files?kind=PLAYERS", { cache: "no-store" }),
      ]);

      const eventsData = await eventsRes.json().catch(() => ({}));
      const playersData = await playersRes.json().catch(() => ({}));

      if (!eventsRes.ok || !playersRes.ok) {
        setEventFiles([]);
        setPlayerFiles([]);
        setFilesError(
          eventsData?.message ?? playersData?.message ?? "Kunne ikke hente filer."
        );
        return;
      }

      setEventFiles(eventsData?.files ?? []);
      setPlayerFiles(playersData?.files ?? []);
    } finally {
      setFilesLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadFiles(kind: "EVENTS" | "PLAYERS", files: FileList | File[]) {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;

    setUploading(kind);
    setEventsError(null);
    setFilesError(null);

    try {
      for (const file of list) {
        const form = new FormData();
        form.set("kind", kind);
        form.set("file", file);

        const res = await fetch("/api/stats/upload", {
          method: "POST",
          body: form,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data?.message ?? `Upload fejlede (${file.name}).`;
          setEventsError(msg);
          return;
        }
      }

      await Promise.all([loadEvents(), loadFiles()]);
    } finally {
      setUploading(null);
    }
  }

  async function deleteFile(fileId: string) {
    setFilesError(null);

    const res = await fetch(`/api/stats/files/${fileId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFilesError(data?.message ?? "Kunne ikke slette fil.");
      return;
    }

    await Promise.all([loadEvents(), loadFiles()]);
  }

  function norm(value: string | null | undefined) {
    return String(value ?? "").trim().toLowerCase();
  }

  function splitOnIce(value: string | null | undefined) {
    return String(value ?? "")
      .split(" - ")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const filteredEvents = useMemo(() => {
    const pSel = norm(filters.perspektiv);
    const gameSel = norm(filters.kamp);
    const playerSel = norm(filters.spiller);
    const goalieSel = norm(filters.maalmand);
    const onIceSel = filters.paaBanen.map((x) => norm(x)).filter(Boolean);

    if (!pSel) return [];

    return events.filter((e) => {
      if (norm(e.teamName ?? e.perspective) !== pSel) return false;

      if (gameSel && norm(e.gameId) !== gameSel) return false;

      if (goalieSel && norm(e.goalieName) !== goalieSel) return false;

      if (playerSel) {
        const matches =
          norm(e.p1Name) === playerSel ||
          norm(e.p2Name) === playerSel;
        if (!matches) return false;
      }

      if (onIceSel.length > 0) {
        const names = new Set(
          [...splitOnIce(e.homePlayersNames), ...splitOnIce(e.awayPlayersNames)].map((n) =>
            norm(n)
          )
        );
        for (const name of onIceSel) if (!names.has(name)) return false;
      }

      return true;
    });
  }, [events, filters]);

  const shotMapEvents = useMemo(() => {
    const selectedTeam = String(filters.perspektiv ?? "").trim();
    if (!selectedTeam) return [];

    const gameSel = norm(filters.kamp);
    const playerSel = norm(filters.spiller);
    const goalieSel = norm(filters.maalmand);
    const onIceSel = filters.paaBanen.map((x) => norm(x)).filter(Boolean);

    return events.filter((e) => {
      // Only show shot-like events on the map
      const kind = classifyShotKind(e.event);
      if (kind === "PENALTY" || kind === "BLOCK" || kind === "MISS" || kind === "SHOT" || kind === "GOAL") {
        // ok
      }

      if (gameSel && norm(e.gameId) !== gameSel) return false;
      if (goalieSel && norm(e.goalieName) !== goalieSel) return false;

      if (playerSel) {
        const matches = norm(e.p1Name) === playerSel || norm(e.p2Name) === playerSel;
        if (!matches) return false;
      }

      if (onIceSel.length > 0) {
        const names = new Set(
          [...splitOnIce(e.homePlayersNames), ...splitOnIce(e.awayPlayersNames)].map((n) => norm(n))
        );
        for (const name of onIceSel) if (!names.has(name)) return false;
      }

      // Require coordinates
      if (!isFiniteNumber(e.xM) || !isFiniteNumber(e.yM)) return false;
      return true;
    });
  }, [events, filters]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Statistik</h1>
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "rounded-md bg-[var(--brand)] px-3 py-1.5 text-sm font-medium text-[var(--brand-foreground)]"
                : "rounded-md border border-[color:var(--surface-border)] bg-transparent px-3 py-1.5 text-sm"
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "events" ? (
        <section className="space-y-6">
          {isLeader ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-[color:var(--surface-border)] p-4">
                <h2 className="text-lg font-semibold">Upload Events (CSV)</h2>

                <div className="mt-3 flex flex-col gap-2">
                  <input
                    ref={eventsFileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) void uploadFiles("EVENTS", files);
                      e.currentTarget.value = "";
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploading === "EVENTS"}
                    onClick={() => eventsFileInputRef.current?.click()}
                    className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  >
                    Upload
                  </button>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Filer</h3>
                    <button
                      type="button"
                      onClick={loadFiles}
                      disabled={filesLoading}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs disabled:opacity-50"
                    >
                      Opdater
                    </button>
                  </div>

                  {eventFiles.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-600">Ingen filer.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {eventFiles.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-2"
                        >
                          <div className="min-w-0 text-sm">
                            <div className="truncate font-medium">{f.originalName}</div>
                            <div className="text-xs text-zinc-600">
                              {new Date(f.createdAt).toLocaleString("da-DK")}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteFile(f.id)}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
                          >
                            Slet
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-[color:var(--surface-border)] p-4">
                <h2 className="text-lg font-semibold">Upload Players (CSV)</h2>

                <div className="mt-3 flex flex-col gap-2">
                  <input
                    ref={playersFileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) void uploadFiles("PLAYERS", files);
                      e.currentTarget.value = "";
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploading === "PLAYERS"}
                    onClick={() => playersFileInputRef.current?.click()}
                    className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  >
                    Upload
                  </button>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Filer</h3>
                    <button
                      type="button"
                      onClick={loadFiles}
                      disabled={filesLoading}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs disabled:opacity-50"
                    >
                      Opdater
                    </button>
                  </div>

                  {playerFiles.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-600">Ingen filer.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {playerFiles.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-2"
                        >
                          <div className="min-w-0 text-sm">
                            <div className="truncate font-medium">{f.originalName}</div>
                            <div className="text-xs text-zinc-600">
                              {new Date(f.createdAt).toLocaleString("da-DK")}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteFile(f.id)}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
                          >
                            Slet
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {filesError ? <p className="text-sm text-red-600">{filesError}</p> : null}
            </div>
          ) : null}

          <div className="rounded-md border border-[color:var(--surface-border)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Events</h2>
              <button
                type="button"
                onClick={loadEvents}
                disabled={eventsLoading}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Opdater
              </button>
            </div>

            {eventsError ? <p className="mt-2 text-sm text-red-600">{eventsError}</p> : null}

            {filteredEvents.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-600">Ingen events.</p>
            ) : (
              <div className="mt-4 max-h-[60vh] overflow-auto">
                <table className="min-w-[900px] w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-[color:var(--surface)]">
                    <tr className="border-b border-[color:var(--surface-border)] text-left">
                      <th className="bg-[color:var(--surface)] py-2 pr-3">Tid</th>
                      <th className="bg-[color:var(--surface)] py-2 pr-3">Periode</th>
                      <th className="bg-[color:var(--surface)] py-2 pr-3">Event</th>
                      <th className="bg-[color:var(--surface)] py-2 pr-3">P1</th>
                      <th className="bg-[color:var(--surface)] py-2 pr-3">P2</th>
                      <th className="bg-[color:var(--surface)] py-2 pr-3">X</th>
                      <th className="bg-[color:var(--surface)] py-2 pr-3">Y</th>
                      <th className="bg-[color:var(--surface)] py-2 pr-3">Fil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((e) => (
                      <tr key={e.id} className="border-b border-[color:var(--surface-border)]">
                        <td className="py-2 pr-3">
                          {e.timestamp
                            ? new Date(e.timestamp).toLocaleString("da-DK")
                            : "-"}
                        </td>
                        <td className="py-2 pr-3">{e.period ?? "-"}</td>
                        <td className="py-2 pr-3 font-medium">{e.event}</td>
                        <td className="py-2 pr-3">
                          {e.p1No ?? ""}{e.p1Name ? ` ${e.p1Name}` : ""}
                        </td>
                        <td className="py-2 pr-3">
                          {e.p2No ?? ""}{e.p2Name ? ` ${e.p2Name}` : ""}
                        </td>
                        <td className="py-2 pr-3">{e.xM ?? "-"}</td>
                        <td className="py-2 pr-3">{e.yM ?? "-"}</td>
                        <td className="py-2 pr-3 text-xs text-zinc-600">
                          {e.file?.originalName ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : tab === "shotmap" ? (
        <section className="space-y-6">
          <div className="rounded-md border border-[color:var(--surface-border)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Shot Map</h2>
              <button
                type="button"
                onClick={loadEvents}
                disabled={eventsLoading}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Opdater
              </button>
            </div>

            {eventsError ? (
              <p className="mt-2 text-sm text-red-600">{eventsError}</p>
            ) : null}

            {String(filters.perspektiv ?? "").trim().length === 0 ? (
              <p className="mt-4 text-sm text-zinc-600">Vælg et Perspektiv.</p>
            ) : shotMapEvents.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-600">Ingen events.</p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
                <HalfRink
                  title="Defensive End"
                  half="left"
                  events={shotMapEvents}
                  selectedTeam={String(filters.perspektiv ?? "").trim()}
                />
                <HalfRink
                  title="Offensive End"
                  half="right"
                  events={shotMapEvents}
                  selectedTeam={String(filters.perspektiv ?? "").trim()}
                />
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-700">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-[color:var(--surface-foreground)]" />
                <span>Shot</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-0 w-0 border-l-[7px] border-r-[7px] border-b-[12px] border-l-transparent border-r-transparent border-b-[color:var(--surface-foreground)]" />
                <span>Miss</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 border-2 border-[color:var(--surface-foreground)]" />
                <span>Block</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rotate-45 border-2 border-[color:var(--surface-foreground)]" />
                <span>Penalty</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base text-[color:var(--surface-foreground)]">★</span>
                <span>Goal</span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-md border border-[color:var(--surface-border)] p-4">
          <h2 className="text-lg font-semibold">
            {tabs.find((t) => t.key === tab)?.label}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">Kommer snart.</p>
        </section>
      )}
    </div>
  );
}
