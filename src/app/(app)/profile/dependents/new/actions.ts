"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { patients, patientGuardians, practices } from "@/db/schema";
import { requireSession } from "@/lib/authz/guards";

const dependentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().min(1),
  relationship: z.enum(["parent", "child", "guardian", "other"]),
});

export type AddDependentState = { error: string | null };

export async function addDependentAction(
  _prevState: AddDependentState,
  formData: FormData,
): Promise<AddDependentState> {
  const session = await requireSession();

  const parsed = dependentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { firstName, lastName, dob, relationship } = parsed.data;

  const [practice] = await db
    .select()
    .from(practices)
    .where(eq(practices.id, session.practiceId))
    .limit(1);
  if (!practice) return { error: "Practice not found" };

  await db.transaction(async (tx) => {
    const [dependent] = await tx
      .insert(patients)
      .values({ practiceId: practice.id, firstName, lastName, dob })
      .returning();

    await tx.insert(patientGuardians).values({
      patientId: dependent.id,
      appUserId: session.userId,
      relationship,
    });
  });

  redirect("/profile");
}
