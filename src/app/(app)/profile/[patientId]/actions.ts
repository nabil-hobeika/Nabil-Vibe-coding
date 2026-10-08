"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { requireSession, requirePatientAccess } from "@/lib/authz/guards";

const updateSchema = z.object({
  patientId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().min(1),
  address: z.string().optional(),
  governmentId: z.string().optional(),
  insurerName: z.string().optional(),
  policyNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export type UpdatePatientState = { error: string | null };

export async function updatePatientAction(
  _prevState: UpdatePatientState,
  formData: FormData,
): Promise<UpdatePatientState> {
  const session = await requireSession();

  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const {
    patientId,
    firstName,
    lastName,
    dob,
    address,
    governmentId,
    insurerName,
    policyNumber,
    emergencyContactName,
    emergencyContactPhone,
  } = parsed.data;

  await requirePatientAccess(session, patientId);

  await db
    .update(patients)
    .set({
      firstName,
      lastName,
      dob,
      address: address || null,
      governmentId: governmentId || null,
      insuranceInfo:
        insurerName || policyNumber
          ? { insurerName: insurerName ?? "", policyNumber: policyNumber ?? "" }
          : null,
      emergencyContact:
        emergencyContactName || emergencyContactPhone
          ? {
              name: emergencyContactName ?? "",
              phone: emergencyContactPhone ?? "",
            }
          : null,
      updatedAt: new Date(),
    })
    .where(eq(patients.id, patientId));

  redirect(`/profile/${patientId}?saved=1`);
}
