import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { appointments, slots } from "@/db/schema";

export class SlotUnavailableError extends Error {
  constructor() {
    super("This slot is no longer available");
    this.name = "SlotUnavailableError";
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Core booking logic, callable within an existing transaction (used by
 * reschedule, which cancels + rebooks atomically). The conditional UPDATE
 * (`WHERE status = 'open'`) is the primary guard against a double-booking
 * race; the partial unique index on `appointments(slot_id)` for confirmed
 * rows (see schema) is the hard database-level backstop.
 */
export async function bookSlotTx(
  tx: Tx,
  {
    slotId,
    patientId,
    bookedByUserId,
  }: { slotId: string; patientId: string; bookedByUserId: string },
) {
  const [slot] = await tx.select().from(slots).where(eq(slots.id, slotId)).limit(1);
  if (!slot) throw new SlotUnavailableError();

  const [claimed] = await tx
    .update(slots)
    .set({ status: "booked", updatedAt: new Date() })
    .where(and(eq(slots.id, slotId), eq(slots.status, "open")))
    .returning();

  if (!claimed) throw new SlotUnavailableError();

  const [appointment] = await tx
    .insert(appointments)
    .values({
      practiceId: slot.practiceId,
      slotId,
      patientId,
      bookedByUserId,
      status: "confirmed",
    })
    .returning();

  return appointment;
}

export async function bookSlot(params: {
  slotId: string;
  patientId: string;
  bookedByUserId: string;
}) {
  return db.transaction((tx) => bookSlotTx(tx, params));
}

export async function getNextAvailableSlots({
  doctorUserId,
  limit = 60,
}: {
  doctorUserId: string;
  limit?: number;
}) {
  return db
    .select()
    .from(slots)
    .where(
      and(
        eq(slots.doctorUserId, doctorUserId),
        eq(slots.status, "open"),
        gte(slots.startAt, new Date()),
      ),
    )
    .orderBy(asc(slots.startAt))
    .limit(limit);
}
