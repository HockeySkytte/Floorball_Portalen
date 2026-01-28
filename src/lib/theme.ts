import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function getThemeTeam() {
  const user = await getCurrentUser();
  if (user?.activeTeam) return user.activeTeam;

  const session = await getSession();
  if (!session.selectedTeamId) return null;

  return prisma.team.findUnique({
    where: { id: session.selectedTeamId },
  });
}
