import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { asc, desc } from "drizzle-orm";
import { db } from "./index";
import { patients, visits } from "./schema";

// Writes the current visit history to data/visit-history.json, grouped by
// patient, newest visit first. Read-only: it never changes the database.
async function main() {
  const allPatients = await db
    .select()
    .from(patients)
    .orderBy(asc(patients.lastName), asc(patients.firstName));
  const allVisits = await db.select().from(visits).orderBy(desc(visits.visitDate));

  const output = {
    exportedAt: new Date().toISOString(),
    patients: allPatients.map((p) => ({
      patientId: p.id,
      name: `${p.firstName} ${p.lastName}`,
      dob: p.dob,
      visits: allVisits
        .filter((v) => v.patientId === p.id)
        .map((v) => ({
          visitId: v.id,
          visitDate: v.visitDate,
          reason: v.reason,
          notes: v.notes,
          appointmentId: v.appointmentId,
          updatedAt: v.updatedAt?.toISOString() ?? null,
        })),
    })),
  };

  const file = path.join(process.cwd(), "data", "visit-history.json");
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(output, null, 2) + "\n", "utf8");

  const count = output.patients.reduce((n, p) => n + p.visits.length, 0);
  console.log(`Wrote ${count} visits for ${output.patients.length} patients to ${file}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
