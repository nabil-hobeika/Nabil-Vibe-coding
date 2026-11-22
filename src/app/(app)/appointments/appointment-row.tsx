"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cancelAppointmentAction, markVisitedAction } from "./actions";

export function AppointmentRow({
  appointmentId,
  patientId,
  label,
  allowReschedule = true,
  allowMarkVisited = false,
}: {
  appointmentId: string;
  patientId: string;
  label: ReactNode;
  allowReschedule?: boolean;
  allowMarkVisited?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showVisitForm, setShowVisitForm] = useState(false);
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

  function markVisited(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await markVisitedAction(
        appointmentId,
        String(form.get("reason") ?? ""),
        String(form.get("notes") ?? ""),
      );
      if (result.error) {
        setError(result.error);
      } else {
        setShowVisitForm(false);
        router.refresh();
      }
    });
  }

  return (
    <li className="py-2">
      <div className="flex items-center justify-between text-sm text-slate-700">
        <span>{label}</span>
        <div className="flex items-center gap-3">
          {allowMarkVisited && (
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowVisitForm((v) => !v)}
              className="text-xs text-green-700 hover:underline disabled:opacity-50"
            >
              Mark as visited
            </button>
          )}
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
      {showVisitForm && (
        <form onSubmit={markVisited} className="mt-2 space-y-2 rounded-md bg-slate-50 p-3">
          <label className="block text-xs text-slate-700">
            Reason
            <input
              name="reason"
              defaultValue="Appointment"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
          <label className="block text-xs text-slate-700">
            Notes (optional)
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save visit"}
            </button>
            <button
              type="button"
              onClick={() => setShowVisitForm(false)}
              className="text-xs text-slate-500 hover:underline"
            >
              Close
            </button>
          </div>
        </form>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}
