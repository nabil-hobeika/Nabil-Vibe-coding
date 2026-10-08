import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { appUsers } from "@/db/schema";
import { verifyVerificationToken } from "@/lib/auth/verification";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const userId = await verifyVerificationToken(token);

  if (!userId) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Invalid or expired link</h1>
        <p className="mt-2 text-sm text-slate-500">
          Request a new verification email from your profile page.
        </p>
      </div>
    );
  }

  await db
    .update(appUsers)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(appUsers.id, userId));

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Email verified</h1>
      <p className="mt-2 text-sm text-slate-500">
        Your email address has been confirmed.
      </p>
      <Link
        href="/profile"
        className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Go to your profile
      </Link>
    </div>
  );
}
