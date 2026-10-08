"use client";

import { useActionState } from "react";
import { addDependentAction, type AddDependentState } from "./actions";

const initialState: AddDependentState = { error: null };

export default function AddDependentPage() {
  const [state, formAction, pending] = useActionState(addDependentAction, initialState);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-slate-900">Add a dependent</h1>
      <p className="mt-1 text-sm text-slate-500">
        Manage appointments for a child or someone else in your care.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-slate-700">First name</span>
            <input
              name="firstName"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Last name</span>
            <input
              name="lastName"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-slate-700">Date of birth</span>
          <input
            name="dob"
            type="date"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-700">Relationship to you</span>
          <select
            name="relationship"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="child">Child</option>
            <option value="parent">Parent</option>
            <option value="guardian">Guardian of</option>
            <option value="other">Other</option>
          </select>
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Adding..." : "Add dependent"}
        </button>
      </form>
    </div>
  );
}
