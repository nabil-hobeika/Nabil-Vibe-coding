"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requirePatientAccess } from "@/lib/authz/guards";
import { bookSlot, SlotUnavailableError } from "@/lib/scheduling/book-slot";
import { notifyBookingConfirmed } from "@/lib/email/notifications";

export type BookSlotResult = { error: string | null };

export async function bookSlotAction(
  patientId: string,
  slotId: string,
): Promise<BookSlotResult> {
  const session = await requireSession();
  await requirePatientAccess(session, patientId);

  try {
    await bookSlot({ slotId, patientId, bookedByUserId: session.userId });
  } catch (err) {
    if (err instanceof SlotUnavailableError) {
      revalidatePath(`/book/${patientId}`);
      return { error: err.message };
    }
    throw err;
  }

  await notifyBookingConfirmed({ slotId, patientId, bookedByUserId: session.userId });

  revalidatePath(`/book/${patientId}`);
  revalidatePath(`/profile/${patientId}`);
  return { error: null };
}
