"use client";

import { useActionState } from "react";
import { addVisitAction, type AddVisitState } from "./actions";

const initialState: AddVisitState = { error: null };
const today = () => new Date().toISOString().slice(0, 10);

export function VisitForm({ patientId }: { patientId: string }) {
  const [state, formAction, pending] = useActionState(addVisitAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="patientId" value={patientId} />

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-slate-700">Visit date</span>
          <input
            type="date"
            name="visitDate"
            defaultValue={today()}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-700">Reason</span>
          <input
            name="reason"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-slate-700">Notes</span>
        <textarea
          name="notes"
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Add visit record"}
      </button>
    </form>
  );
}
