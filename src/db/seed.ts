import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { practices, appUsers, availabilityTemplates, patients, visits } from "./schema";
import { hashPassword } from "@/lib/auth/password";
import { generateSlots } from "@/lib/scheduling/generate-slots";

const PRACTICE_NAME = process.env.PRACTICE_NAME ?? "Nabil's Practice";
const DOCTOR_EMAIL = process.env.SEED_DOCTOR_EMAIL ?? "doctor@example.com";
const DOCTOR_PASSWORD = process.env.SEED_DOCTOR_PASSWORD ?? "changeme123";

type SeedVisits = {
  patient: { firstName: string; lastName: string; dob: string };
  visits: { visitDate: string; reason: string; notes: string | null }[];
};

// Test data for the visit history lives in data/seed-visits.json. Idempotent:
// the patient is matched on name + dob, and visits on date + reason.
async function seedVisits(practiceId: string, createdBy: string) {
  const file = path.join(process.cwd(), "data", "seed-visits.json");
  if (!existsSync(file)) return;
  const seed: SeedVisits = JSON.parse(readFileSync(file, "utf8"));

  let [patient] = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.practiceId, practiceId),
        eq(patients.firstName, seed.patient.firstName),
        eq(patients.lastName, seed.patient.lastName),
        eq(patients.dob, seed.patient.dob),
      ),
    )
    .limit(1);

  if (!patient) {
    [patient] = await db
      .insert(patients)
      .values({ practiceId, ...seed.patient })
      .returning();
    console.log(`Seeded test patient: ${patient.firstName} ${patient.lastName}`);
  }

  const existing = await db.select().from(visits).where(eq(visits.patientId, patient.id));
  let added = 0;
  for (const v of seed.visits) {
    if (existing.some((e) => e.visitDate === v.visitDate && e.reason === v.reason)) continue;
    await db.insert(visits).values({
      practiceId,
      patientId: patient.id,
      visitDate: v.visitDate,
      reason: v.reason,
      notes: v.notes,
      createdBy,
    });
    added++;
  }
  console.log(`Seeded ${added} test visits`);
}

async function main() {
  let [practice] = await db.select().from(practices).limit(1);

  if (!practice) {
    [practice] = await db
      .insert(practices)
      .values({ name: PRACTICE_NAME })
      .returning();
    console.log(`Seeded practice: ${practice.name} (${practice.id})`);
  } else {
    console.log(`Practice already exists: ${practice.name} (${practice.id})`);
  }

  const [existingDoctor] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.email, DOCTOR_EMAIL))
    .limit(1);

  if (!existingDoctor) {
    const passwordHash = await hashPassword(DOCTOR_PASSWORD);
    const [doctor] = await db
      .insert(appUsers)
      .values({
        practiceId: practice.id,
        email: DOCTOR_EMAIL,
        passwordHash,
        role: "doctor",
        displayName: "Doctor",
        emailVerifiedAt: new Date(),
      })
      .returning();
    console.log(`Seeded doctor account: ${doctor.email} / ${DOCTOR_PASSWORD}`);
  } else {
    console.log(`Doctor account already exists: ${existingDoctor.email}`);
  }

  const [doctor] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.email, DOCTOR_EMAIL))
    .limit(1);

  // Default weekly hours (Mon-Fri, 09:00-17:00, 30-minute slots) so patients
  // have something to book. Only seeded when no templates exist yet.
  const [existingTemplate] = await db
    .select()
    .from(availabilityTemplates)
    .where(eq(availabilityTemplates.doctorUserId, doctor.id))
    .limit(1);

  if (!existingTemplate) {
    await db.insert(availabilityTemplates).values(
      [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        practiceId: practice.id,
        doctorUserId: doctor.id,
        dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
        slotDurationMinutes: 30,
      })),
    );
    console.log("Seeded default availability: Mon-Fri 09:00-17:00");
  }

  await seedVisits(practice.id, doctor.id);

  const { created } = await generateSlots({
    practiceId: practice.id,
    doctorUserId: doctor.id,
  });
  console.log(`Generated ${created} new slots`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
