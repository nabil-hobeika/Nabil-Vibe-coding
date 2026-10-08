"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { requireSession, requirePatientAccess } from "@/lib/authz/guards";
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

export async function cancelAppointmentAction(
  appointmentId: string,
): Promise<AppointmentActionResult> {
  const session = await requireSession();

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  if (!appointment) return { error: "Appointment not found" };

  const bypassCutoff = isStaffRole(session.role);
  if (!bypassCutoff) {
    await requirePatientAccess(session, appointment.patientId);
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

export async function rescheduleAppointmentAction(
  appointmentId: string,
  newSlotId: string,
): Promise<AppointmentActionResult> {
  const session = await requireSession();

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  if (!appointment) return { error: "Appointment not found" };

  const bypassCutoff = isStaffRole(session.role);
  if (!bypassCutoff) {
    await requirePatientAccess(session, appointment.patientId);
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
