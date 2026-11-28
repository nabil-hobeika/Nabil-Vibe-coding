"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { patients, visits } from "@/db/schema";
import { AuthzError, requireStaff } from "@/lib/authz/guards";
import { getSession, type SessionPayload } from "@/lib/auth/session";

const visitSchema = z.object({
  patientId: z.string().min(1),
  visitDate: z.string().min(1),
  reason: z.string().min(1),
  notes: z.string().optional(),
});

export type AddVisitState = { error: string | null };

// Staff-only write guard. A patient (or signed-out) caller gets a returned
// error for the form to display instead of an uncaught AuthzError (HTTP 500).
async function staffSessionOrError(): Promise<
  { session: SessionPayload; error?: undefined } | { session?: undefined; error: string }
> {
  const session = await getSession();
  if (!session) return { error: "Please sign in to change visit records." };
  try {
    requireStaff(session);
    return { session };
  } catch (err) {
    if (err instanceof AuthzError) {
      return { error: "You don't have permission to change visit records." };
    }
    throw err;
  }
}

export async function addVisitAction(
  _prevState: AddVisitState,
  formData: FormData,
): Promise<AddVisitState> {
  // Staff-only write: the app-layer stand-in for the RLS policy that denies
  // patients INSERT on `visits` (see lib/authz/guards.ts).
  const auth = await staffSessionOrError();
  if (auth.error !== undefined) return { error: auth.error };
  const { session } = auth;

  const parsed = visitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { patientId, visitDate, reason, notes } = parsed.data;

  // The patient must belong to the caller's practice.
  const [patient] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.practiceId, session.practiceId)))
    .limit(1);
  if (!patient) return { error: "Patient not found." };

  await db.insert(visits).values({
    practiceId: session.practiceId,
    patientId,
    visitDate,
    reason,
    notes: notes || null,
    createdBy: session.userId,
  });

  revalidatePath(`/staff/patients/${patientId}`);
  revalidatePath(`/profile/${patientId}`);
  return { error: null };
}

const updateVisitSchema = visitSchema.extend({ visitId: z.string().min(1) });

export async function updateVisitAction(
  _prevState: AddVisitState,
  formData: FormData,
): Promise<AddVisitState> {
  const auth = await staffSessionOrError();
  if (auth.error !== undefined) return { error: auth.error };
  const { session } = auth;

  const parsed = updateVisitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { visitId, patientId, visitDate, reason, notes } = parsed.data;

  await db
    .update(visits)
    .set({ visitDate, reason, notes: notes || null })
    .where(and(eq(visits.id, visitId), eq(visits.practiceId, session.practiceId)));

  revalidatePath(`/staff/patients/${patientId}`);
  revalidatePath(`/profile/${patientId}`);
  return { error: null };
}

const deleteVisitSchema = z.object({
  visitId: z.string().min(1),
  patientId: z.string().min(1),
});

export async function deleteVisitAction(
  _prevState: AddVisitState,
  formData: FormData,
): Promise<AddVisitState> {
  const auth = await staffSessionOrError();
  if (auth.error !== undefined) return { error: auth.error };
  const { session } = auth;

  const parsed = deleteVisitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { visitId, patientId } = parsed.data;

  await db
    .delete(visits)
    .where(and(eq(visits.id, visitId), eq(visits.practiceId, session.practiceId)));

  revalidatePath(`/staff/patients/${patientId}`);
  revalidatePath(`/profile/${patientId}`);
  return { error: null };
}
