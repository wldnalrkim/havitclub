export type AuthStudent = {
  id: string;
  displayName: string;
};

type LoginResponse =
  | { ok: true; student: AuthStudent }
  | { ok: false; code?: string; message?: string };

export async function loginWithStudentCode(studentCode: string) {
  let response: Response;
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentCode }),
    });
  } catch {
    return { ok: false as const, message: "네트워크 연결을 확인해주세요." };
  }

  let data: LoginResponse;
  try {
    data = (await response.json()) as LoginResponse;
  } catch {
    return { ok: false as const, message: "서버 오류가 발생했습니다." };
  }

  if (!response.ok || !data.ok) {
    return {
      ok: false as const,
      code: data.ok ? undefined : data.code,
      message: data.ok ? "서버 오류가 발생했습니다." : data.message,
    };
  }

  return { ok: true as const, student: data.student };
}

export async function getCurrentStudent() {
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    if (response.status === 401) return null;
    if (!response.ok) return null;

    const data = (await response.json()) as {
      authenticated?: boolean;
      student?: AuthStudent;
    };
    return data.authenticated && data.student ? data.student : null;
  } catch {
    return null;
  }
}

export async function logoutCurrentStudent() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // 화면에서는 세션을 종료하고, 서버 재시도는 다음 요청에서 처리합니다.
  }
}
