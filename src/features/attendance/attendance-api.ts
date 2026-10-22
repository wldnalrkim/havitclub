import type {
  AttendanceEvent,
  AttendanceSummary,
} from "@/domain/attendance/attendance";

type ApiError = { ok: false; code?: string; message?: string };
type AttendanceResponse = {
  ok: true;
  count: number;
  summary: AttendanceSummary | null;
  summaries?: AttendanceSummary[];
  events: AttendanceEventView[];
} | ApiError;

export type AttendanceEventView = Omit<AttendanceEvent, "studentId">;

export async function getAttendance(date: string): Promise<{
  response?: Response;
  data: AttendanceResponse;
}> {
  return request(`/api/attendance?date=${encodeURIComponent(date)}`);
}

export async function getAttendanceRange(from: string, to: string): Promise<{
  response?: Response;
  data: AttendanceResponse;
}> {
  return request(
    `/api/attendance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}

async function request(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const data = (await response.json()) as AttendanceResponse;
    return { response, data };
  } catch {
    return {
      response: undefined,
      data: {
        ok: false,
        code: "NETWORK_ERROR",
        message: "출결 정보를 불러올 수 없습니다.",
      } as ApiError,
    };
  }
}
