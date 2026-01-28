import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  userId?: string;
  selectedTeamId?: string;
};

const sessionOptions: SessionOptions = {
  cookieName: "floorball_session",
  password: process.env.SESSION_PASSWORD ?? "",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession() {
  if (!process.env.SESSION_PASSWORD || process.env.SESSION_PASSWORD.length < 32) {
    throw new Error(
      "SESSION_PASSWORD mangler eller er for kort (min. 32 tegn)."
    );
  }

  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
