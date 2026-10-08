import { and, eq, gte, count } from "drizzle-orm";
import { db } from "@/db";
import { availabilityExceptions, availabilityTemplates, slots } from "@/db/schema";
import { requireSession, requireStaff } from "@/lib/authz/guards";
import { getPracticeDoctor } from "@/lib/scheduling/doctor";
import { TemplateForm } from "./template-form";
import { ExceptionForm } from "./exception-form";
import { GenerateSlotsButton } from "./generate-button";
import { DeleteButton } from "./delete-button";
import { deleteTemplateAction, deleteExceptionAction } from "./actions";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AvailabilityPage() {
  const session = await requireSession();
  requireStaff(session);

  const doctor = await getPracticeDoctor(session.practiceId);

  if (!doctor) {
    return (
      <p className="text-sm text-slate-500">
        No doctor account found for this practice yet.
      </p>
    );
  }

  const templates = await db
    .select()
    .from(availabilityTemplates)
    .where(eq(availabilityTemplates.doctorUserId, doctor.id))
    .orderBy(availabilityTemplates.dayOfWeek, availabilityTemplates.startTime);

  const exceptions = await db
    .select()
    .from(availabilityExceptions)
    .where(
      and(
        eq(availabilityExceptions.doctorUserId, doctor.id),
        gte(availabilityExceptions.date, new Date().toISOString().slice(0, 10)),
      ),
    )
    .orderBy(availabilityExceptions.date);

  const [{ value: openSlotCount }] = await db
    .select({ value: count() })
    .from(slots)
    .where(
      and(
        eq(slots.doctorUserId, doctor.id),
        eq(slots.status, "open"),
        gte(slots.startAt, new Date()),
      ),
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Availability</h1>
        <p className="mt-1 text-sm text-slate-500">
          Set the doctor&apos;s weekly hours, then generate bookable slots.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Weekly hours</h2>
        <div className="mt-3">
          <TemplateForm doctorUserId={doctor.id} />
        </div>
        <ul className="mt-4 divide-y divide-slate-100">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {DAYS[t.dayOfWeek]}: {t.startTime}&ndash;{t.endTime}
              </span>
              <DeleteButton id={t.id} action={deleteTemplateAction} />
            </li>
          ))}
          {templates.length === 0 && (
            <li className="py-2 text-sm text-slate-400">No weekly hours set yet.</li>
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Exceptions</h2>
        <div className="mt-3">
          <ExceptionForm doctorUserId={doctor.id} />
        </div>
        <ul className="mt-4 divide-y divide-slate-100">
          {exceptions.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {e.date} &mdash; {e.type === "blackout" ? "Day off" : `Extra: ${e.startTime}–${e.endTime}`}
                {e.reason ? ` (${e.reason})` : ""}
              </span>
              <DeleteButton id={e.id} action={deleteExceptionAction} />
            </li>
          ))}
          {exceptions.length === 0 && (
            <li className="py-2 text-sm text-slate-400">No upcoming exceptions.</li>
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Bookable slots</h2>
        <p className="mt-1 text-sm text-slate-500">
          {openSlotCount} open slot(s) currently scheduled. Regenerate after changing hours.
        </p>
        <div className="mt-3">
          <GenerateSlotsButton doctorUserId={doctor.id} />
        </div>
      </section>
    </div>
  );
}
