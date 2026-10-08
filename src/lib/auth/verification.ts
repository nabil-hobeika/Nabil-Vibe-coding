import { SignJWT, jwtVerify } from "jose";

const VERIFICATION_DURATION_SECONDS = 60 * 60 * 24; // 24h

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createVerificationToken(userId: string) {
  return new SignJWT({ purpose: "email_verification", userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${VERIFICATION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyVerificationToken(
  token: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "email_verification") return null;
    return (payload.userId as string) ?? null;
  } catch {
    return null;
  }
}
