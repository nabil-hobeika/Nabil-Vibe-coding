"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteVisitAction, updateVisitAction, type AddVisitState } from "./actions";

const initialState: AddVisitState = { error: null };
const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

export function VisitItem({
  visit,
  patientId,
}: {
  visit: { id: string; visitDate: string; reason: string; notes: string | null };
  patientId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateVisitAction, initialState);
  const [submitted, setSubmitted] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteState, deleteAction, deleting] = useActionState(deleteVisitAction, initialState);

  useEffect(() => {
    if (submitted && !pending && !state.error) {
      setEditing(false);
      setSubmitted(false);
    }
  }, [submitted, pending, state.error]);

  if (!editing) {
    return (
      <li className="flex items-start justify-between gap-3 py-2 text-sm">
        <div>
          <p className="font-medium text-slate-900">
            {visit.visitDate} &mdash; {visit.reason}
          </p>
          {visit.notes && <p className="mt-0.5 text-slate-600">{visit.notes}</p>}
        </div>
        {confirmingDelete ? (
          <form action={deleteAction} className="shrink-0 text-right">
            <input type="hidden" name="visitId" value={visit.id} />
            <input type="hidden" name="patientId" value={patientId} />
            <p className="text-xs font-medium text-slate-700">Delete this visit?</p>
            {deleteState.error && <p className="text-xs text-red-600">{deleteState.error}</p>}
            <div className="mt-1 flex justify-end gap-2">
              <button
                type="submit"
                disabled={deleting}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-500 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:border-red-500 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="py-3">
      <form
        action={(fd) => {
          setSubmitted(true);
          formAction(fd);
        }}
        className="space-y-3"
      >
        <input type="hidden" name="visitId" value={visit.id} />
        <input type="hidden" name="patientId" value={patientId} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-slate-700">Visit date</span>
            <input type="date" name="visitDate" defaultValue={visit.visitDate} required className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Reason</span>
            <input name="reason" defaultValue={visit.reason} required className={inputCls} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-slate-700">Notes</span>
          <textarea name="notes" rows={3} defaultValue={visit.notes ?? ""} className={inputCls} />
        </label>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </li>
  );
}
