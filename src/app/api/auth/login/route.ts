import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { verifyPassword } from "@/lib/password";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const emailOrUsername = String(body?.emailOrUsername ?? "").trim();
  const password = String(body?.password ?? "");

  if (!emailOrUsername || !password) {
    return NextResponse.json(
      { message: "Udfyld venligst alle felter." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername }],
    },
  });

  if (!user) {
    return NextResponse.json(
      { message: "Forkert login." },
      { status: 401 }
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { message: "Forkert login." },
      { status: 401 }
    );
  }

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  return NextResponse.json({ ok: true });
}
