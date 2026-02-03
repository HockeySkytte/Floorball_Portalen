import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/appContext";
import { prisma } from "@/lib/prisma";
import { getMatches } from "@/lib/sportssys";
import MatchReportViewer from "./MatchReportViewer";
import MatchAdminPanels from "./MatchAdminPanels";
import MatchStatsServer from "./MatchStatsServer";

type Tab = "report" | "stats";

function parseKampId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseTab(searchParams?: Record<string, string | string[] | undefined>): Tab {
  const raw = searchParams?.tab;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return String(v ?? "").toLowerCase() === "stats" ? "stats" : "report";
}

function formatDate(value: Date | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("da-DK", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export default async function KampPage({
  params,
  searchParams,
}: {
  params: Promise<{ kampId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, ctx } = await getAppContext();
  if (user?.isSuperuser && !user.isSuperuserApproved && !user.isAdmin) {
    redirect("/afventer");
  }

  const { kampId: kampIdParam } = await params;
  const kampId = parseKampId(kampIdParam);
  if (!kampId) {
    redirect("/kalender");
  }

  const resolvedSearchParams = (await searchParams) ?? undefined;
  const tab = parseTab(resolvedSearchParams);

  const canEdit = Boolean(user?.isAdmin || user?.isSuperuser);
  const rowName = ctx.rows.find((r) => r.id === ctx.selectedRowId)?.name ?? "";
  const poolName = ctx.pools.find((p) => p.id === ctx.selectedPoolId)?.name ?? "";

  let match:
    | {
        startAt: Date | null;
        homeTeam: string;
        awayTeam: string;
        homeScore: number | null;
        awayScore: number | null;
      }
    | null = null;

  if (!ctx.selectedPoolId) {
    redirect("/kalender");
  }

  if (ctx.selectedSeasonIsCurrent) {
    if (ctx.isPokalturnering) {
      const dbMatch = await prisma.competitionMatch.findUnique({
        where: { kampId },
        select: {
          startAt: true,
          homeTeam: true,
          awayTeam: true,
          homeScore: true,
          awayScore: true,
        },
      });

      if (dbMatch) {
        match = dbMatch;
      } else {
        const underlying = ctx.effectivePoolIds.length
          ? await prisma.competitionPool.findMany({
              where: { id: { in: ctx.effectivePoolIds } },
              select: { puljeId: true },
            })
          : [];
        const puljeIds = Array.from(new Set(underlying.map((p) => p.puljeId).filter((n) => n && n > 0)));
        for (const puljeId of puljeIds) {
          const matches = await getMatches(puljeId);
          const found = matches.find((m) => m.kampId === kampId) ?? null;
          if (found) {
            match = found;
            break;
          }
        }
      }
    } else {
      const puljeId = ctx.pools.find((p) => p.id === ctx.selectedPoolId)?.puljeId ?? null;
      if (!puljeId) {
        redirect("/kalender");
      }
      const matches = await getMatches(puljeId);
      match = matches.find((m) => m.kampId === kampId) ?? null;
    }
  } else {
    const dbMatch = await prisma.competitionMatch.findUnique({
      where: { kampId },
      select: {
        startAt: true,
        homeTeam: true,
        awayTeam: true,
        homeScore: true,
        awayScore: true,
      },
    });
    match = dbMatch;
  }

  const matchTitle = match ? `${match.homeTeam} – ${match.awayTeam}` : "";
  const scoreText =
    match && match.homeScore != null && match.awayScore != null
      ? `${match.homeScore}-${match.awayScore}`
      : "-";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-1">
          {matchTitle ? (
          <h1 className="text-3xl font-semibold text-zinc-900">{matchTitle}</h1>
        ) : (
          <h1 className="text-3xl font-semibold text-zinc-900">Kamp {kampId}</h1>
        )}
        <div className="mt-1 text-sm text-zinc-600">
          KampId: {kampId}
          {match?.startAt ? ` · Dato: ${formatDate(match.startAt)}` : ""}
          {rowName ? ` · Liga: ${rowName}` : ""}
          {poolName ? ` · Pulje: ${poolName}` : ""}
          {match ? ` · Resultat: ${scoreText}` : ""}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Link
          href={{ pathname: `/kampe/${kampId}`, query: { tab: "report" } }}
          className={
            tab === "report"
              ? "rounded-md bg-[color:var(--brand)] px-3 py-1.5 text-sm font-semibold text-[var(--brand-foreground)]"
              : "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900"
          }
        >
          Kamprapport
        </Link>
        <Link
          href={{ pathname: `/kampe/${kampId}`, query: { tab: "stats" } }}
          className={
            tab === "stats"
              ? "rounded-md bg-[color:var(--brand)] px-3 py-1.5 text-sm font-semibold text-[var(--brand-foreground)]"
              : "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900"
          }
        >
          Statistik
        </Link>
      </div>

      {tab === "report" && canEdit ? (
        <MatchAdminPanels
          kampId={kampId}
          homeTeam={match?.homeTeam ?? null}
          awayTeam={match?.awayTeam ?? null}
        />
      ) : null}

      <div className="mt-6">
        {tab === "report" ? (
          <MatchReportViewer kampId={kampId} />
        ) : (
          <MatchStatsServer
            kampId={kampId}
            matchDate={match?.startAt ?? null}
            homeTeam={match?.homeTeam ?? ""}
            awayTeam={match?.awayTeam ?? ""}
          />
        )}
      </div>
    </div>
  );
}
