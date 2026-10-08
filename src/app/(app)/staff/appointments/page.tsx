import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients, slots } from "@/db/schema";
import { requireSession, requireStaff } from "@/lib/authz/guards";
import { AppointmentRow } from "@/app/(app)/appointments/appointment-row";

export default async function StaffAppointmentsPage() {
  const session = await requireSession();
  requireStaff(session);

  const upcoming = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      startAt: slots.startAt,
      endAt: slots.endAt,
      status: appointments.status,
      firstName: patients.firstName,
      lastName: patients.lastName,
    })
    .from(appointments)
    .innerJoin(slots, eq(appointments.slotId, slots.id))
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(eq(appointments.status, "confirmed"), gte(slots.startAt, new Date())))
    .orderBy(asc(slots.startAt));

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Upcoming appointments</h1>

      <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white px-4">
        {upcoming.map((a) => (
          <AppointmentRow
            key={a.id}
            appointmentId={a.id}
            patientId={a.patientId}
            label={
              <>
                <p className="font-medium text-slate-900">
                  {a.firstName} {a.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {a.startAt.toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </>
            }
          />
        ))}
        {upcoming.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No upcoming appointments.
          </li>
        )}
      </ul>
    </div>
  );
}
