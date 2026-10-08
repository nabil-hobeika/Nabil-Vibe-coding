import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers } from "@/db/schema";
import { generateSlots } from "@/lib/scheduling/generate-slots";

// Entry point for the nightly slot-generation job. Locally it can be hit
// manually with curl; in production this is wired to Vercel Cron with the
// same CRON_SECRET check.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doctors = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.role, "doctor"));

  const results = await Promise.all(
    doctors.map((doctor) =>
      generateSlots({ practiceId: doctor.practiceId, doctorUserId: doctor.id }),
    ),
  );

  const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
  return NextResponse.json({ doctors: doctors.length, created: totalCreated });
}
