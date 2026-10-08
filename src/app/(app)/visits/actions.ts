"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { visits } from "@/db/schema";
import { requireSession, requireStaff } from "@/lib/authz/guards";

const visitSchema = z.object({
  patientId: z.string().min(1),
  visitDate: z.string().min(1),
  reason: z.string().min(1),
  notes: z.string().optional(),
});

export type AddVisitState = { error: string | null };

export async function addVisitAction(
  _prevState: AddVisitState,
  formData: FormData,
): Promise<AddVisitState> {
  const session = await requireSession();
  // Staff-only write: a patient session throws AuthzError here before any
  // row is touched — this is the app-layer stand-in for the RLS policy that
  // denies patients INSERT on `visits` (see lib/authz/guards.ts).
  requireStaff(session);

  const parsed = visitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { patientId, visitDate, reason, notes } = parsed.data;

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
