import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers } from "@/db/schema";

const SESSION_COOKIE = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  role: "patient" | "staff" | "doctor";
  practiceId: string;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// The cookie only proves who signed in. The user is looked up on every request
// (once per request, thanks to cache()) so a session whose user no longer
// exists, e.g. after `npm run db:reset`, counts as signed out instead of
// silently matching no rows. Role and practice come from the database so a
// stale cookie can't carry outdated values.
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    userId = (payload as unknown as SessionPayload).userId;
  } catch {
    return null;
  }

  const [user] = await db
    .select({ id: appUsers.id, role: appUsers.role, practiceId: appUsers.practiceId })
    .from(appUsers)
    .where(eq(appUsers.id, userId))
    .limit(1);
  if (!user) return null;

  return { userId: user.id, role: user.role, practiceId: user.practiceId };
});
