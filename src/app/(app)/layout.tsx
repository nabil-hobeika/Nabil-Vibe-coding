import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { logoutAction } from "@/app/logout/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const isStaff = session.role === "staff" || session.role === "doctor";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link href="/profile" className="hover:text-slate-900">
              My profile
            </Link>
            {isStaff && (
              <>
                <Link href="/staff/patients" className="hover:text-slate-900">
                  Patients
                </Link>
                <Link href="/staff/appointments" className="hover:text-slate-900">
                  Appointments
                </Link>
                <Link href="/staff/availability" className="hover:text-slate-900">
                  Availability
                </Link>
              </>
            )}
          </nav>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-900">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
