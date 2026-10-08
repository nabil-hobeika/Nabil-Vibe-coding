import { NextResponse } from "next/server";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { appUsers, appointments, patients, slots } from "@/db/schema";
import { sendEmail } from "@/lib/email/send";
import { appointmentReminderEmail } from "@/lib/email/templates";

// Nightly job: emails a reminder for every confirmed appointment starting
// within the next 24h that hasn't been reminded yet, then stamps
// `reminderSentAt` so re-running (or a retry) never double-sends.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const due = await db
    .select({
      appointmentId: appointments.id,
      bookedByUserId: appointments.bookedByUserId,
      startAt: slots.startAt,
      firstName: patients.firstName,
      lastName: patients.lastName,
      email: appUsers.email,
    })
    .from(appointments)
    .innerJoin(slots, eq(appointments.slotId, slots.id))
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(appUsers, eq(appointments.bookedByUserId, appUsers.id))
    .where(
      and(
        eq(appointments.status, "confirmed"),
        isNull(appointments.reminderSentAt),
        gte(slots.startAt, now),
        lte(slots.startAt, in24h),
      ),
    );

  for (const row of due) {
    const { subject, text } = appointmentReminderEmail({
      patientName: `${row.firstName} ${row.lastName}`,
      startAt: row.startAt,
    });
    await sendEmail({ to: row.email, subject, text });

    await db
      .update(appointments)
      .set({ reminderSentAt: new Date() })
      .where(eq(appointments.id, row.appointmentId));
  }

  return NextResponse.json({ remindersSent: due.length });
}
