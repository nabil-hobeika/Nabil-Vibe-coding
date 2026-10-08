import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers } from "@/db/schema";

/** Single-doctor practice: returns the one doctor account for a practice. */
export async function getPracticeDoctor(practiceId: string) {
  const [doctor] = await db
    .select()
    .from(appUsers)
    .where(and(eq(appUsers.practiceId, practiceId), eq(appUsers.role, "doctor")))
    .limit(1);

  return doctor ?? null;
}
