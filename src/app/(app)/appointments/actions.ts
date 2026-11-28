"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { toLocalDateKey } from "@/lib/date-key";
import { appointments, slots, visits } from "@/db/schema";
import { AuthzError, requirePatientAccess } from "@/lib/authz/guards";
import { getSession } from "@/lib/auth/session";
import {
  cancelAppointment,
  rescheduleAppointment,
  CutoffError,
  AppointmentNotFoundError,
} from "@/lib/scheduling/cancel-appointment";
import { SlotUnavailableError } from "@/lib/scheduling/book-slot";
import { notifyBookingConfirmed } from "@/lib/email/notifications";

export type AppointmentActionResult = { error: string | null };

function isStaffRole(role: string) {
  return role === "staff" || role === "doctor";
}

const SIGN_IN_ERROR = "Please sign in to manage appointments.";
const PERMISSION_ERROR = "You don't have permission to change this appointment.";

// Returns an error message when the (non-staff) caller has no access to the
// patient, so the action can return it instead of throwing an AuthzError.
async function patientAccessError(
  session: Parameters<typeof requirePatientAccess>[0],
  patientId: string,
): Promise<string | null> {
  try {
    await requirePatientAccess(session, patientId);
    return null;
  } catch (err) {
    if (err instanceof AuthzError) return PERMISSION_ERROR;
    throw err;
  }
}

export async function cancelAppointmentAction(
  appointmentId: string,
): Promise<AppointmentActionResult> {
  const session = await getSession();
  if (!session) return { error: SIGN_IN_ERROR };

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  if (!appointment || appointment.practiceId !== session.practiceId) {
    return { error: "Appointment not found" };
  }

  const bypassCutoff = isStaffRole(session.role);
  if (!bypassCutoff) {
    const accessError = await patientAccessError(session, appointment.patientId);
    if (accessError) return { error: accessError };
  }

  try {
    await cancelAppointment({ appointmentId, bypassCutoff });
  } catch (err) {
    if (err instanceof CutoffError || err instanceof AppointmentNotFoundError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath(`/profile/${appointment.patientId}`);
  revalidatePath("/staff/appointments");
  return { error: null };
}

export async function markVisitedAction(
  appointmentId: string,
  reason: string,
  notes?: string,
): Promise<AppointmentActionResult> {
  const session = await getSession();
  if (!session) return { error: SIGN_IN_ERROR };
  if (!isStaffRole(session.role)) return { error: PERMISSION_ERROR };

  const trimmedReason = reason.trim();
  if (!trimmedReason) return { error: "Please enter a reason for the visit" };

  const [row] = await db
    .select({ appointment: appointments, startAt: slots.startAt })
    .from(appointments)
    .innerJoin(slots, eq(appointments.slotId, slots.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  if (!row || row.appointment.practiceId !== session.practiceId) {
    return { error: "Appointment not found" };
  }
  if (row.appointment.status !== "confirmed") {
    return { error: "Only confirmed appointments can be marked as visited" };
  }

  const { appointment, startAt } = row;

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(appointments)
      .set({ status: "completed", updatedAt: new Date() })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.status, "confirmed")))
      .returning({ id: appointments.id });
    if (updated.length === 0) return;

    await tx.insert(visits).values({
      practiceId: appointment.practiceId,
      patientId: appointment.patientId,
      appointmentId,
      visitDate: toLocalDateKey(startAt),
      reason: trimmedReason,
      notes: notes?.trim() || null,
      createdBy: session.userId,
    });
  });

  revalidatePath(`/profile/${appointment.patientId}`);
  revalidatePath(`/staff/patients/${appointment.patientId}`);
  revalidatePath("/staff/appointments");
  return { error: null };
}

export async function rescheduleAppointmentAction(
  appointmentId: string,
  newSlotId: string,
): Promise<AppointmentActionResult> {
  const session = await getSession();
  if (!session) return { error: SIGN_IN_ERROR };

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  if (!appointment || appointment.practiceId !== session.practiceId) {
    return { error: "Appointment not found" };
  }

  const bypassCutoff = isStaffRole(session.role);
  if (!bypassCutoff) {
    const accessError = await patientAccessError(session, appointment.patientId);
    if (accessError) return { error: accessError };
  }

  try {
    await rescheduleAppointment({
      appointmentId,
      newSlotId,
      patientId: appointment.patientId,
      bookedByUserId: session.userId,
      bypassCutoff,
    });
  } catch (err) {
    if (
      err instanceof CutoffError ||
      err instanceof AppointmentNotFoundError ||
      err instanceof SlotUnavailableError
    ) {
      return { error: err.message };
    }
    throw err;
  }

  await notifyBookingConfirmed({
    slotId: newSlotId,
    patientId: appointment.patientId,
    bookedByUserId: session.userId,
  });

  revalidatePath(`/profile/${appointment.patientId}`);
  revalidatePath(`/book/${appointment.patientId}`);
  revalidatePath("/staff/appointments");
  return { error: null };
}
