import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
};

export const practices = sqliteTable("practices", {
  id: id(),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id"),
  selfServiceCutoffHours: integer("self_service_cutoff_hours")
    .notNull()
    .default(24),
  ...timestamps,
});

// role: 'patient' | 'staff' | 'doctor'
export const appUsers = sqliteTable("app_users", {
  id: id(),
  practiceId: text("practice_id")
    .notNull()
    .references(() => practices.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["patient", "staff", "doctor"] })
    .notNull()
    .default("patient"),
  displayName: text("display_name").notNull(),
  emailVerifiedAt: integer("email_verified_at", { mode: "timestamp_ms" }),
  ...timestamps,
});

export const consents = sqliteTable("consents", {
  id: id(),
  appUserId: text("app_user_id")
    .notNull()
    .references(() => appUsers.id),
  consentType: text("consent_type").notNull().default("treatment_v1"),
  version: text("version").notNull().default("1"),
  acceptedAt: integer("accepted_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});

export const patients = sqliteTable("patients", {
  id: id(),
  practiceId: text("practice_id")
    .notNull()
    .references(() => practices.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dob: text("dob").notNull(), // ISO date (YYYY-MM-DD)
  address: text("address"),
  governmentId: text("government_id"),
  insuranceInfo: text("insurance_info", { mode: "json" }),
  emergencyContact: text("emergency_contact", { mode: "json" }),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  ...timestamps,
});

// relationship: 'self' | 'parent' | 'child' | 'guardian' | 'other'
export const patientGuardians = sqliteTable("patient_guardians", {
  id: id(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  appUserId: text("app_user_id")
    .notNull()
    .references(() => appUsers.id),
  relationship: text("relationship", {
    enum: ["self", "parent", "child", "guardian", "other"],
  })
    .notNull()
    .default("self"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});

export const visits = sqliteTable("visits", {
  id: id(),
  practiceId: text("practice_id")
    .notNull()
    .references(() => practices.id),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  appointmentId: text("appointment_id"),
  visitDate: text("visit_date").notNull(), // ISO date
  reason: text("reason").notNull(),
  notes: text("notes"),
  createdBy: text("created_by")
    .notNull()
    .references(() => appUsers.id),
  ...timestamps,
});

export const availabilityTemplates = sqliteTable("availability_templates", {
  id: id(),
  practiceId: text("practice_id")
    .notNull()
    .references(() => practices.id),
  doctorUserId: text("doctor_user_id")
    .notNull()
    .references(() => appUsers.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday .. 6=Saturday
  startTime: text("start_time").notNull(), // "HH:MM"
  endTime: text("end_time").notNull(), // "HH:MM"
  slotDurationMinutes: integer("slot_duration_minutes").notNull().default(30),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

// type: 'blackout' | 'extra_hours'
export const availabilityExceptions = sqliteTable("availability_exceptions", {
  id: id(),
  practiceId: text("practice_id")
    .notNull()
    .references(() => practices.id),
  doctorUserId: text("doctor_user_id")
    .notNull()
    .references(() => appUsers.id),
  date: text("date").notNull(), // ISO date
  type: text("type", { enum: ["blackout", "extra_hours"] }).notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  reason: text("reason"),
  ...timestamps,
});

// status: 'open' | 'booked' | 'blocked'
export const slots = sqliteTable(
  "slots",
  {
    id: id(),
    practiceId: text("practice_id")
      .notNull()
      .references(() => practices.id),
    doctorUserId: text("doctor_user_id")
      .notNull()
      .references(() => appUsers.id),
    startAt: integer("start_at", { mode: "timestamp_ms" }).notNull(),
    endAt: integer("end_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", { enum: ["open", "booked", "blocked"] })
      .notNull()
      .default("open"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("slots_doctor_start_unique").on(
      table.doctorUserId,
      table.startAt,
    ),
  ],
);

// status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export const appointments = sqliteTable(
  "appointments",
  {
    id: id(),
    practiceId: text("practice_id")
      .notNull()
      .references(() => practices.id),
    slotId: text("slot_id")
      .notNull()
      .references(() => slots.id),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id),
    bookedByUserId: text("booked_by_user_id")
      .notNull()
      .references(() => appUsers.id),
    status: text("status", {
      enum: ["confirmed", "cancelled", "completed", "no_show"],
    })
      .notNull()
      .default("confirmed"),
    cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
    cancellationReason: text("cancellation_reason"),
    reminderSentAt: integer("reminder_sent_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [
    // Double-booking guard: only one CONFIRMED appointment can ever
    // reference a given slot, enforced by the database, not app logic.
    uniqueIndex("appointments_confirmed_slot_unique")
      .on(table.slotId)
      .where(sql`${table.status} = 'confirmed'`),
  ],
);
