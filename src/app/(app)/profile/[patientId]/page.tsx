import { and, asc, desc, eq, gte } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { appointments, patients, slots, visits } from "@/db/schema";
import { requireSession, requirePatientAccess, AuthzError } from "@/lib/authz/guards";
import { PatientForm } from "./patient-form";
import { AppointmentRow } from "@/app/(app)/appointments/appointment-row";

export default async function PatientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { patientId } = await params;
  const { saved } = await searchParams;
  const session = await requireSession();

  try {
    await requirePatientAccess(session, patientId);
  } catch (err) {
    if (err instanceof AuthzError) notFound();
    throw err;
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (!patient) notFound();

  const insurance = (patient.insuranceInfo as {
    insurerName?: string;
    policyNumber?: string;
  } | null) ?? {};
  const emergency = (patient.emergencyContact as {
    name?: string;
    phone?: string;
  } | null) ?? {};

  const upcoming = await db
    .select({
      id: appointments.id,
      startAt: slots.startAt,
      status: appointments.status,
    })
    .from(appointments)
    .innerJoin(slots, eq(appointments.slotId, slots.id))
    .where(
      and(
        eq(appointments.patientId, patientId),
        eq(appointments.status, "confirmed"),
        gte(slots.startAt, new Date()),
      ),
    )
    .orderBy(asc(slots.startAt));

  const history = await db
    .select()
    .from(visits)
    .where(eq(visits.patientId, patientId))
    .orderBy(desc(visits.visitDate));

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          {patient.firstName} {patient.lastName}
        </h1>
        <Link
          href={`/book/${patientId}`}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          Book appointment
        </Link>
      </div>
      {saved && <p className="mt-2 text-sm text-green-600">Saved.</p>}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Upcoming appointments</h2>
        <ul className="mt-2 divide-y divide-slate-100">
          {upcoming.map((a) => (
            <AppointmentRow
              key={a.id}
              appointmentId={a.id}
              patientId={patientId}
              label={a.startAt.toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            />
          ))}
          {upcoming.length === 0 && (
            <li className="py-2 text-sm text-slate-400">No upcoming appointments.</li>
          )}
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Visit history</h2>
        <ul className="mt-2 divide-y divide-slate-100">
          {history.map((v) => (
            <li key={v.id} className="py-2 text-sm">
              <p className="font-medium text-slate-900">
                {v.visitDate} &mdash; {v.reason}
              </p>
              {v.notes && <p className="mt-0.5 text-slate-600">{v.notes}</p>}
            </li>
          ))}
          {history.length === 0 && (
            <li className="py-2 text-sm text-slate-400">No visits recorded yet.</li>
          )}
        </ul>
      </section>

      <PatientForm patient={patient} insurance={insurance} emergency={emergency} />
    </div>
  );
}
