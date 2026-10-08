import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, practices, slots } from "@/db/schema";
import { bookSlotTx, SlotUnavailableError } from "./book-slot";

export { SlotUnavailableError };

export class CutoffError extends Error {
  constructor(cutoffHours: number) {
    super(
      `This appointment can no longer be changed online — it starts in less than ${cutoffHours}h. Please contact the practice.`,
    );
    this.name = "CutoffError";
  }
}

export class AppointmentNotFoundError extends Error {
  constructor() {
    super("Appointment not found");
    this.name = "AppointmentNotFoundError";
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function assertWithinCutoff(
  tx: Tx,
  practiceId: string,
  slotStartAt: Date,
  bypassCutoff: boolean,
) {
  if (bypassCutoff) return;

  const [practice] = await tx
    .select()
    .from(practices)
    .where(eq(practices.id, practiceId))
    .limit(1);
  const cutoffHours = practice?.selfServiceCutoffHours ?? 24;

  const hoursUntilStart = (slotStartAt.getTime() - Date.now()) / 3_600_000;
  if (hoursUntilStart < cutoffHours) {
    throw new CutoffError(cutoffHours);
  }
}

async function cancelAppointmentTx(
  tx: Tx,
  {
    appointmentId,
    bypassCutoff,
    reason,
  }: { appointmentId: string; bypassCutoff: boolean; reason?: string },
) {
  const [appointment] = await tx
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  if (!appointment || appointment.status !== "confirmed") {
    throw new AppointmentNotFoundError();
  }

  const [slot] = await tx.select().from(slots).where(eq(slots.id, appointment.slotId)).limit(1);
  if (!slot) throw new AppointmentNotFoundError();

  await assertWithinCutoff(tx, appointment.practiceId, slot.startAt, bypassCutoff);

  await tx
    .update(appointments)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationReason: reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId));

  await tx
    .update(slots)
    .set({ status: "open", updatedAt: new Date() })
    .where(eq(slots.id, slot.id));

  return appointment;
}

export async function cancelAppointment(params: {
  appointmentId: string;
  bypassCutoff: boolean;
  reason?: string;
}) {
  return db.transaction((tx) => cancelAppointmentTx(tx, params));
}

/** Cancels the existing appointment and books the new slot atomically. */
export async function rescheduleAppointment({
  appointmentId,
  newSlotId,
  patientId,
  bookedByUserId,
  bypassCutoff,
}: {
  appointmentId: string;
  newSlotId: string;
  patientId: string;
  bookedByUserId: string;
  bypassCutoff: boolean;
}) {
  return db.transaction(async (tx) => {
    await cancelAppointmentTx(tx, { appointmentId, bypassCutoff });
    return bookSlotTx(tx, { slotId: newSlotId, patientId, bookedByUserId });
  });
}
