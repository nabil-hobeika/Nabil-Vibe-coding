"use client";

import { useActionState, useState } from "react";
import { addExceptionAction, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function ExceptionForm({ doctorUserId }: { doctorUserId: string }) {
  const [state, formAction, pending] = useActionState(addExceptionAction, initialState);
  const [type, setType] = useState<"blackout" | "extra_hours">("blackout");

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="doctorUserId" value={doctorUserId} />

      <label className="text-sm">
        <span className="block text-slate-700">Date</span>
        <input
          type="date"
          name="date"
          required
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>

      <label className="text-sm">
        <span className="block text-slate-700">Type</span>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as "blackout" | "extra_hours")}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="blackout">Blackout (day off)</option>
          <option value="extra_hours">Extra hours</option>
        </select>
      </label>

      {type === "extra_hours" && (
        <>
          <label className="text-sm">
            <span className="block text-slate-700">Start</span>
            <input
              type="time"
              name="startTime"
              required
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block text-slate-700">End</span>
            <input
              type="time"
              name="endTime"
              required
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
        </>
      )}

      <label className="text-sm">
        <span className="block text-slate-700">Reason (optional)</span>
        <input
          type="text"
          name="reason"
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add exception"}
      </button>

      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
