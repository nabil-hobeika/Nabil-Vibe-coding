import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { patients, patientGuardians } from "@/db/schema";
import { requireSession } from "@/lib/authz/guards";

export default async function ProfileListPage() {
  const session = await requireSession();

  const managed = await db
    .select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      dob: patients.dob,
      relationship: patientGuardians.relationship,
    })
    .from(patientGuardians)
    .innerJoin(patients, eq(patientGuardians.patientId, patients.id))
    .where(eq(patientGuardians.appUserId, session.userId));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Your patients</h1>
        <Link
          href="/profile/dependents/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          Add dependent
        </Link>
      </div>

      <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {managed.map((p) => (
          <li key={p.id}>
            <Link
              href={`/profile/${p.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {p.firstName} {p.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  DOB {p.dob} &middot; {p.relationship === "self" ? "You" : p.relationship}
                </p>
              </div>
              <span className="text-sm text-slate-400">Edit &rarr;</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
