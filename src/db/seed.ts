import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { practices, appUsers, availabilityTemplates } from "./schema";
import { hashPassword } from "@/lib/auth/password";
import { generateSlots } from "@/lib/scheduling/generate-slots";

const PRACTICE_NAME = process.env.PRACTICE_NAME ?? "Nabil's Practice";
const DOCTOR_EMAIL = process.env.SEED_DOCTOR_EMAIL ?? "doctor@example.com";
const DOCTOR_PASSWORD = process.env.SEED_DOCTOR_PASSWORD ?? "changeme123";

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
