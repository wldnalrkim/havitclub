import { NextResponse } from "next/server";
import { LoginService } from "@/application/services/login-service";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/infrastructure/auth/session";
import { NotionStudentRepository } from "@/repositories/notion/notion-student-repository";

export const dynamic = "force-dynamic";

const loginService = new LoginService(new NotionStudentRepository());

function errorResponse(
  code: "INVALID_STUDENT_CODE" | "STUDENT_NOT_FOUND" | "DUPLICATE_STUDENT_CODE" | "AUTH_SERVICE_UNAVAILABLE",
  message: string,
  status: number,
) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "INVALID_STUDENT_CODE",
      "학생 번호를 확인해주세요.",
      400,
    );
  }

  const studentCode =
    typeof body === "object" &&
    body !== null &&
    "studentCode" in body &&
    typeof body.studentCode === "string"
      ? body.studentCode.trim()
      : "";

  if (!/^\d{4}$/.test(studentCode)) {
    return errorResponse(
      "INVALID_STUDENT_CODE",
      "출결번호 4자리를 입력해주세요.",
      400,
    );
  }

  let result;
  try {
    result = await loginService.login(studentCode);
  } catch {
    return errorResponse(
      "AUTH_SERVICE_UNAVAILABLE",
      "학생 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.",
      503,
    );
  }

  if (result.status === "not_found") {
    return errorResponse(
      "STUDENT_NOT_FOUND",
      "학생 정보를 확인할 수 없습니다.",
      401,
    );
  }

  if (result.status === "ambiguous") {
    return errorResponse(
      "DUPLICATE_STUDENT_CODE",
      "같은 번호를 사용하는 학생이 있습니다. 관리자에게 문의해주세요.",
      409,
    );
  }

  try {
    const response = NextResponse.json({
      ok: true,
      student: {
        id: result.student.id,
        displayName: result.student.displayName,
      },
    });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken({
        studentId: result.student.id,
        displayName: result.student.displayName,
      }),
      sessionCookieOptions,
    );
    return response;
  } catch {
    return errorResponse(
      "AUTH_SERVICE_UNAVAILABLE",
      "로그인을 완료할 수 없습니다. 잠시 후 다시 시도해주세요.",
      503,
    );
  }
}
