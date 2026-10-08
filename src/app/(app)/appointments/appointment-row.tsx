"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cancelAppointmentAction } from "./actions";

export function AppointmentRow({
  appointmentId,
  patientId,
  label,
  allowReschedule = true,
}: {
  appointmentId: string;
  patientId: string;
  label: ReactNode;
  allowReschedule?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelAppointmentAction(appointmentId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <li className="py-2">
      <div className="flex items-center justify-between text-sm text-slate-700">
        <span>{label}</span>
        <div className="flex items-center gap-3">
          {allowReschedule && (
            <Link
              href={`/book/${patientId}?reschedule=${appointmentId}`}
              className="text-xs text-slate-500 hover:underline"
            >
              Reschedule
            </Link>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={cancel}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            {pending ? "..." : "Cancel"}
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}
