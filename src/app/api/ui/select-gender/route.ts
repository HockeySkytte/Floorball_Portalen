import { NextResponse } from "next/server";
import { requireApprovedUser } from "@/lib/auth";
import { getSession } from "@/lib/session";

function parseGender(value: unknown): "MEN" | "WOMEN" | null {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "MEN") return "MEN";
  if (v === "WOMEN") return "WOMEN";
  return null;
}

export async function POST(req: Request) {
  await requireApprovedUser();
  const body = await req.json().catch(() => null);
  const gender = parseGender(body?.gender);

  if (!gender) {
    return NextResponse.json({ message: "Ugyldigt køn." }, { status: 400 });
  }

  const session = await getSession();
  session.selectedGender = gender;
  await session.save();

  return NextResponse.json({ ok: true });
}
