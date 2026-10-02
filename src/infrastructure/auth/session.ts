import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "havitclub_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24;

export type StudentSession = {
  studentId: string;
  displayName: string;
  issuedAt: number;
  expiresAt: number;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Session configuration is missing.");
  }
  return secret;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(student: Pick<StudentSession, "studentId" | "displayName">) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: StudentSession = {
    ...student,
    issuedAt,
    expiresAt: issuedAt + SESSION_DURATION_SECONDS,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function readSessionToken(token: string | undefined): StudentSession | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  let expectedSignature: string;
  try {
    expectedSignature = sign(encodedPayload);
  } catch {
    return null;
  }

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(decode(encodedPayload)) as Partial<StudentSession>;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof session.studentId !== "string" ||
      typeof session.displayName !== "string" ||
      typeof session.issuedAt !== "number" ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= now ||
      session.issuedAt > now
    ) {
      return null;
    }
    return session as StudentSession;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};
