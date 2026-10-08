import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { patientGuardians } from "@/db/schema";
import { getSession, type SessionPayload } from "@/lib/auth/session";

export class AuthzError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthzError";
  }
}

/** Throws if there is no logged-in user. Use at the top of every Server Action. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthzError("Not signed in");
  return session;
}

/** Throws unless the caller is staff or the doctor. */
export function requireStaff(session: SessionPayload): void {
  if (session.role !== "staff" && session.role !== "doctor") {
    throw new AuthzError("Staff access required");
  }
}

/**
 * Throws unless the session belongs to staff/doctor, or to a guardian of the
 * given patient (i.e. the patient themself or whoever manages them as a
 * dependent). This is the app-layer stand-in for what will become a Postgres
 * RLS policy on `patients`/`appointments` once we move off local SQLite.
 */
export async function requirePatientAccess(
  session: SessionPayload,
  patientId: string,
): Promise<void> {
  if (session.role === "staff" || session.role === "doctor") return;

  const [link] = await db
    .select({ id: patientGuardians.id })
    .from(patientGuardians)
    .where(
      and(
        eq(patientGuardians.patientId, patientId),
        eq(patientGuardians.appUserId, session.userId),
      ),
    )
    .limit(1);

  if (!link) throw new AuthzError("No access to this patient");
}
