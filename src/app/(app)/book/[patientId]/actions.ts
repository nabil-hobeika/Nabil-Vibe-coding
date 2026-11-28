"use server";

import { revalidatePath } from "next/cache";
import { AuthzError, requirePatientAccess } from "@/lib/authz/guards";
import { getSession } from "@/lib/auth/session";
import { bookSlot, SlotUnavailableError } from "@/lib/scheduling/book-slot";
import { notifyBookingConfirmed } from "@/lib/email/notifications";

export type BookSlotResult = { error: string | null };

export async function bookSlotAction(
  patientId: string,
  slotId: string,
): Promise<BookSlotResult> {
  const session = await getSession();
  if (!session) return { error: "Please sign in to book an appointment." };
  try {
    await requirePatientAccess(session, patientId);
  } catch (err) {
    if (err instanceof AuthzError) {
      return { error: "You don't have permission to book for this patient." };
    }
    throw err;
  }

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
