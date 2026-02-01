import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      globalRole: user.globalRole,
      superuserStatus: user.superuserStatus,
      league: user.activeLeague ? { id: user.activeLeague.id, name: user.activeLeague.name } : null,
      team: user.activeTeam ? { id: user.activeTeam.id, name: user.activeTeam.name } : null,
    },
  });
}
