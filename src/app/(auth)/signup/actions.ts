"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers, consents, patients, patientGuardians, practices } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { createVerificationToken } from "@/lib/auth/verification";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().min(1),
  consent: z.literal("on"),
});

export type SignupState = { error: string | null };

export async function signupAction(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dob: formData.get("dob"),
    consent: formData.get("consent"),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const message =
      firstIssue?.path[0] === "consent"
        ? "You must accept the consent terms"
        : (firstIssue?.message ?? "Invalid input");
    return { error: message };
  }

  const { email, password, firstName, lastName, dob } = parsed.data;

  const [existing] = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(eq(appUsers.email, email))
    .limit(1);

  if (existing) {
    return { error: "An account with that email already exists" };
  }

  const [practice] = await db.select().from(practices).limit(1);
  if (!practice) {
    return { error: "Practice is not configured. Run the seed script first." };
  }

  const passwordHash = await hashPassword(password);

  const user = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(appUsers)
      .values({
        practiceId: practice.id,
        email,
        passwordHash,
        role: "patient",
        displayName: `${firstName} ${lastName}`,
      })
      .returning();

    await tx.insert(consents).values({
      appUserId: newUser.id,
      consentType: "treatment_v1",
      version: "1",
    });

    const [patient] = await tx
      .insert(patients)
      .values({
        practiceId: practice.id,
        firstName,
        lastName,
        dob,
      })
      .returning();

    await tx.insert(patientGuardians).values({
      patientId: patient.id,
      appUserId: newUser.id,
      relationship: "self",
    });

    return newUser;
  });

  const token = await createVerificationToken(user.id);
  // No email provider in local dev — log the verification link instead of sending mail.
  console.log(`[dev] Verification link for ${email}: /verify/${token}`);

  await createSession({
    userId: user.id,
    role: user.role,
    practiceId: user.practiceId,
  });

  redirect("/profile");
}
