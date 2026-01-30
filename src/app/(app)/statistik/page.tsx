import { TeamRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import StatistikClient from "@/components/stats/StatistikClient";
import StatsSidebarSlicers from "@/components/stats/StatsSidebarSlicers";

export default async function StatistikPage() {
  const user = await getCurrentUser();
  const isLeader = !!user && (user.isAdmin || user.activeRole === TeamRole.LEADER);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-4">
        <div className="text-sm font-semibold">Filtre</div>
        <StatsSidebarSlicers />
      </div>
      <StatistikClient isLeader={isLeader} />
    </div>
  );
}
