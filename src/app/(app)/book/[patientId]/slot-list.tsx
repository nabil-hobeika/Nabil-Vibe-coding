"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookSlotAction } from "./actions";
import { rescheduleAppointmentAction } from "@/app/(app)/appointments/actions";

type SlotGroup = {
  label: string;
  slots: { id: string; time: string }[];
};

export function SlotList({
  patientId,
  groups,
  rescheduleAppointmentId,
}: {
  patientId: string;
  groups: SlotGroup[];
  rescheduleAppointmentId?: string | null;
}) {
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function book(slotId: string) {
    setError(null);
    setPendingSlotId(slotId);
    startTransition(async () => {
      const result = rescheduleAppointmentId
        ? await rescheduleAppointmentAction(rescheduleAppointmentId, slotId)
        : await bookSlotAction(patientId, slotId);

      setPendingSlotId(null);
      if (result.error) {
        setError(result.error);
      } else if (rescheduleAppointmentId) {
        router.push(`/profile/${patientId}`);
      } else {
        router.refresh();
      }
    });
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No open slots right now. Check back soon, or contact the practice.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="text-sm font-medium text-slate-700">{group.label}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                disabled={pending}
                onClick={() => book(slot.id)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:border-slate-500 disabled:opacity-50"
              >
                {pendingSlotId === slot.id ? "Booking..." : slot.time}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
