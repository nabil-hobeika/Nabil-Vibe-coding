"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { availabilityTemplates, availabilityExceptions } from "@/db/schema";
import { requireSession, requireStaff } from "@/lib/authz/guards";
import { generateSlots } from "@/lib/scheduling/generate-slots";

const templateSchema = z.object({
  doctorUserId: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export type ActionState = { error: string | null };

export async function addTemplateAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  requireStaff(session);

  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (parsed.data.startTime >= parsed.data.endTime) {
    return { error: "Start time must be before end time" };
  }

  await db.insert(availabilityTemplates).values({
    practiceId: session.practiceId,
    doctorUserId: parsed.data.doctorUserId,
    dayOfWeek: parsed.data.dayOfWeek,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
  });

  revalidatePath("/staff/availability");
  return { error: null };
}

export async function deleteTemplateAction(templateId: string): Promise<void> {
  const session = await requireSession();
  requireStaff(session);

  await db
    .delete(availabilityTemplates)
    .where(eq(availabilityTemplates.id, templateId));

  revalidatePath("/staff/availability");
}

const exceptionSchema = z.object({
  doctorUserId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["blackout", "extra_hours"]),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().optional(),
});

export async function addExceptionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  requireStaff(session);

  const parsed = exceptionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { doctorUserId, date, type, startTime, endTime, reason } = parsed.data;

  if (type === "extra_hours" && (!startTime || !endTime)) {
    return { error: "Extra hours need a start and end time" };
  }

  await db.insert(availabilityExceptions).values({
    practiceId: session.practiceId,
    doctorUserId,
    date,
    type,
    startTime: type === "extra_hours" ? startTime : null,
    endTime: type === "extra_hours" ? endTime : null,
    reason: reason || null,
  });

  revalidatePath("/staff/availability");
  return { error: null };
}

export async function deleteExceptionAction(exceptionId: string): Promise<void> {
  const session = await requireSession();
  requireStaff(session);

  await db
    .delete(availabilityExceptions)
    .where(eq(availabilityExceptions.id, exceptionId));

  revalidatePath("/staff/availability");
}

export async function generateSlotsNowAction(
  doctorUserId: string,
): Promise<{ created: number }> {
  const session = await requireSession();
  requireStaff(session);

  const result = await generateSlots({
    practiceId: session.practiceId,
    doctorUserId,
  });

  revalidatePath("/staff/availability");
  return { created: result.created };
}
