import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers, patients, slots } from "@/db/schema";
import { sendEmail } from "./send";
import { bookingConfirmationEmail } from "./templates";

/**
 * Sends the booking-confirmation email. Best-effort: a failure here must
 * never roll back or fail the booking itself, so errors are logged and
 * swallowed rather than thrown.
 */
export async function notifyBookingConfirmed({
  slotId,
  patientId,
  bookedByUserId,
}: {
  slotId: string;
  patientId: string;
  bookedByUserId: string;
}): Promise<void> {
  try {
    const [slot] = await db.select().from(slots).where(eq(slots.id, slotId)).limit(1);
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    const [bookedBy] = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.id, bookedByUserId))
      .limit(1);

    if (!slot || !patient || !bookedBy) return;

    const { subject, text } = bookingConfirmationEmail({
      patientName: `${patient.firstName} ${patient.lastName}`,
      startAt: slot.startAt,
    });

    await sendEmail({ to: bookedBy.email, subject, text });
  } catch (err) {
    console.error("Failed to send booking confirmation email:", err);
  }
}
