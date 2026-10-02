import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  readSessionToken,
  SESSION_COOKIE_NAME,
} from "@/infrastructure/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const session = readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    student: {
      id: session.studentId,
      displayName: session.displayName,
    },
  });
}
