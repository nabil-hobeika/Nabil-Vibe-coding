import { Resend } from "resend";

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "appointments@example.com";

/**
 * Sends transactional email via Resend when RESEND_API_KEY is configured.
 * Locally (no key set) it logs to the console instead — same pattern as the
 * signup verification link, so the send call site never needs to know
 * whether a real provider is wired up.
 */
export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[dev] Email to ${to} — ${subject}\n${text}\n`);
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({ from: FROM_ADDRESS, to, subject, text });
}
