"use client";

import { useActionState } from "react";
import { addTemplateAction, type ActionState } from "./actions";

const initialState: ActionState = { error: null };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function TemplateForm({ doctorUserId }: { doctorUserId: string }) {
  const [state, formAction, pending] = useActionState(addTemplateAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="doctorUserId" value={doctorUserId} />

      <label className="text-sm">
        <span className="block text-slate-700">Day</span>
        <select
          name="dayOfWeek"
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          {DAYS.map((day, i) => (
            <option key={day} value={i}>
              {day}
            </option>
          ))}
        </select>
      </label>

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

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add hours"}
      </button>

      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
