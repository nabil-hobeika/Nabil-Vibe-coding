import { sql, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { patients, visits } from "@/db/schema";
import { requireSession, requireStaff } from "@/lib/authz/guards";

export default async function StaffPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  requireStaff(session);
  const { q } = await searchParams;

  const rows = await db
    .select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      dob: patients.dob,
      visitCount: sql<number>`count(${visits.id})`.as("visit_count"),
    })
    .from(patients)
    .leftJoin(visits, eq(visits.patientId, patients.id))
    .where(isNull(patients.deletedAt))
    .groupBy(patients.id)
    .orderBy(patients.lastName, patients.firstName);

  const filtered = q
    ? rows.filter((p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q.toLowerCase()),
      )
    : rows;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Patients</h1>

      <form className="mt-4" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name..."
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </form>

      <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {filtered.map((p) => (
          <li key={p.id}>
            <Link
              href={`/staff/patients/${p.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {p.firstName} {p.lastName}
                </p>
                <p className="text-xs text-slate-500">DOB {p.dob}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  Number(p.visitCount) > 0
                    ? "bg-slate-100 text-slate-600"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {Number(p.visitCount) > 0 ? "Returning" : "New"}
              </span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">No patients found.</li>
        )}
      </ul>
    </div>
  );
}
