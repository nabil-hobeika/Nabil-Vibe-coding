import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { requireSession, requirePatientAccess, AuthzError } from "@/lib/authz/guards";
import { getPracticeDoctor } from "@/lib/scheduling/doctor";
import { getNextAvailableSlots } from "@/lib/scheduling/book-slot";
import { SlotList } from "./slot-list";

function dayLabel(date: Date): string {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default async function BookAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<{ reschedule?: string }>;
}) {
  const { patientId } = await params;
  const { reschedule } = await searchParams;
  const session = await requireSession();

  try {
    await requirePatientAccess(session, patientId);
  } catch (err) {
    if (err instanceof AuthzError) notFound();
    throw err;
  }

  const [patient] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  if (!patient) notFound();

  let rescheduleAppointmentId: string | null = null;
  if (reschedule) {
    const [existing] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, reschedule))
      .limit(1);
    if (existing && existing.patientId === patientId && existing.status === "confirmed") {
      rescheduleAppointmentId = existing.id;
    }
  }

  const doctor = await getPracticeDoctor(session.practiceId);
  if (!doctor) {
    return <p className="text-sm text-slate-500">No doctor is configured for this practice.</p>;
  }

  const availableSlots = await getNextAvailableSlots({ doctorUserId: doctor.id });

  const groupsMap = new Map<string, { id: string; time: string }[]>();
  for (const slot of availableSlots) {
    const label = dayLabel(slot.startAt);
    const list = groupsMap.get(label) ?? [];
    list.push({
      id: slot.id,
      time: slot.startAt.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    });
    groupsMap.set(label, list);
  }
  const groups = Array.from(groupsMap, ([label, slots]) => ({ label, slots }));

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold text-slate-900">
        {rescheduleAppointmentId ? "Reschedule appointment" : "Book an appointment"} for{" "}
        {patient.firstName} {patient.lastName}
      </h1>
      <p className="mt-1 text-sm text-slate-500">Choose from the next available times.</p>

      <div className="mt-6">
        <SlotList
          patientId={patientId}
          groups={groups}
          rescheduleAppointmentId={rescheduleAppointmentId}
        />
      </div>
    </div>
  );
}
