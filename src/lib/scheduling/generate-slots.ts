import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  availabilityExceptions,
  availabilityTemplates,
  slots,
} from "@/db/schema";

const DEFAULT_HORIZON_DAYS = 60;

function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

function atTime(date: Date, time: string): Date {
  const { hours, minutes } = parseTime(time);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type Window = { start: string; end: string; slotDurationMinutes: number };

const DEFAULT_EXCEPTION_SLOT_MINUTES = 30;

/**
 * Expands weekly availability templates + date-specific exceptions into
 * materialized `slots` rows for a rolling horizon. Idempotent: re-running
 * never creates duplicate slots for the same doctor/start time.
 */
export async function generateSlots({
  practiceId,
  doctorUserId,
  horizonDays = DEFAULT_HORIZON_DAYS,
}: {
  practiceId: string;
  doctorUserId: string;
  horizonDays?: number;
}): Promise<{ created: number; consideredDays: number }> {
  const today = startOfDay(new Date());
  const horizonEnd = new Date(today);
  horizonEnd.setDate(horizonEnd.getDate() + horizonDays);

  const templates = await db
    .select()
    .from(availabilityTemplates)
    .where(
      and(
        eq(availabilityTemplates.practiceId, practiceId),
        eq(availabilityTemplates.doctorUserId, doctorUserId),
        eq(availabilityTemplates.active, true),
      ),
    );

  const exceptions = await db
    .select()
    .from(availabilityExceptions)
    .where(
      and(
        eq(availabilityExceptions.practiceId, practiceId),
        eq(availabilityExceptions.doctorUserId, doctorUserId),
        gte(availabilityExceptions.date, toDateKey(today)),
        lte(availabilityExceptions.date, toDateKey(horizonEnd)),
      ),
    );

  const exceptionsByDate = new Map<string, typeof exceptions>();
  for (const exception of exceptions) {
    const list = exceptionsByDate.get(exception.date) ?? [];
    list.push(exception);
    exceptionsByDate.set(exception.date, list);
  }

  const templatesByDayOfWeek = new Map<number, typeof templates>();
  for (const template of templates) {
    const list = templatesByDayOfWeek.get(template.dayOfWeek) ?? [];
    list.push(template);
    templatesByDayOfWeek.set(template.dayOfWeek, list);
  }

  const newSlots: (typeof slots.$inferInsert)[] = [];

  for (let i = 0; i < horizonDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateKey = toDateKey(date);

    const dayExceptions = exceptionsByDate.get(dateKey) ?? [];
    if (dayExceptions.some((e) => e.type === "blackout")) continue;

    const windows: Window[] = (templatesByDayOfWeek.get(date.getDay()) ?? []).map(
      (t) => ({ start: t.startTime, end: t.endTime, slotDurationMinutes: t.slotDurationMinutes }),
    );

    for (const exception of dayExceptions) {
      if (exception.type === "extra_hours" && exception.startTime && exception.endTime) {
        windows.push({
          start: exception.startTime,
          end: exception.endTime,
          slotDurationMinutes: DEFAULT_EXCEPTION_SLOT_MINUTES,
        });
      }
    }

    for (const window of windows) {
      let cursor = atTime(date, window.start);
      const windowEnd = atTime(date, window.end);

      while (cursor < windowEnd) {
        const end = new Date(cursor.getTime() + window.slotDurationMinutes * 60_000);
        if (end > windowEnd) break;

        newSlots.push({
          practiceId,
          doctorUserId,
          startAt: new Date(cursor),
          endAt: end,
          status: "open",
        });

        cursor = end;
      }
    }
  }

  if (newSlots.length === 0) {
    return { created: 0, consideredDays: horizonDays };
  }

  const inserted = await db
    .insert(slots)
    .values(newSlots)
    .onConflictDoNothing({ target: [slots.doctorUserId, slots.startAt] })
    .returning({ id: slots.id });

  return { created: inserted.length, consideredDays: horizonDays };
}
