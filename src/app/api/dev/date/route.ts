import { NextResponse } from "next/server";
import { DEV_DATE_COOKIE_NAME } from "@/lib/dev-date";
import { isTestDateOverrideEnabled } from "@/infrastructure/notion/config";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  if (!isTestDateOverrideEnabled()) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const body = (await request.json()) as { date?: unknown };
  if (typeof body.date !== "string" || !DATE_PATTERN.test(body.date)) {
    return NextResponse.json({ ok: false, message: "날짜 형식을 확인해주세요." }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true, date: body.date });
  response.cookies.set(DEV_DATE_COOKIE_NAME, body.date, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}

export async function DELETE() {
  if (!isTestDateOverrideEnabled()) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(DEV_DATE_COOKIE_NAME);
  return response;
}
