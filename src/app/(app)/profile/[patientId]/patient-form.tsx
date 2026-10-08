"use client";

import { useActionState } from "react";
import { updatePatientAction, type UpdatePatientState } from "./actions";
import type { patients } from "@/db/schema";

const initialState: UpdatePatientState = { error: null };

export function PatientForm({
  patient,
  insurance,
  emergency,
}: {
  patient: typeof patients.$inferSelect;
  insurance: { insurerName?: string; policyNumber?: string };
  emergency: { name?: string; phone?: string };
}) {
  const [state, formAction, pending] = useActionState(updatePatientAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="patientId" value={patient.id} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" name="firstName" defaultValue={patient.firstName} required />
        <Field label="Last name" name="lastName" defaultValue={patient.lastName} required />
      </div>
      <Field label="Date of birth" name="dob" type="date" defaultValue={patient.dob} required />
      <Field label="Address" name="address" defaultValue={patient.address ?? ""} />
      <Field
        label="Government ID / SSN"
        name="governmentId"
        defaultValue={patient.governmentId ?? ""}
      />

      <fieldset className="rounded-md border border-slate-200 p-3">
        <legend className="px-1 text-xs font-medium text-slate-500">Insurance</legend>
        <div className="space-y-3">
          <Field label="Insurer name" name="insurerName" defaultValue={insurance.insurerName ?? ""} />
          <Field
            label="Policy number"
            name="policyNumber"
            defaultValue={insurance.policyNumber ?? ""}
          />
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-slate-200 p-3">
        <legend className="px-1 text-xs font-medium text-slate-500">Emergency contact</legend>
        <div className="space-y-3">
          <Field label="Name" name="emergencyContactName" defaultValue={emergency.name ?? ""} />
          <Field label="Phone" name="emergencyContactPhone" defaultValue={emergency.phone ?? ""} />
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
    </label>
  );
}
