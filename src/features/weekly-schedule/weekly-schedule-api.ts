import type {
  PlannedDay,
  WeeklyScheduleInput,
} from "@/domain/weekly-schedule/weekly-schedule";

export type WeeklyScheduleClient = {
  weekStartDate: string;
  days: PlannedDay[];
  submittedAt: string;
  updatedAt: string;
};

type ScheduleResponse =
  | {
      ok: true;
      schedule: WeeklyScheduleClient | null;
      created?: boolean;
      idempotent?: boolean;
    }
  | { ok: false; code?: string; message?: string; authenticated?: false };

async function parseResponse(response: Response): Promise<ScheduleResponse> {
  try {
    return (await response.json()) as ScheduleResponse;
  } catch {
    return { ok: false, message: "서버 오류가 발생했습니다." };
  }
}

export async function getWeeklySchedule(weekStartDate: string) {
  try {
    const response = await fetch(
      `/api/weekly-schedules?weekStart=${encodeURIComponent(weekStartDate)}`,
      { cache: "no-store" },
    );
    const data = await parseResponse(response);
    return { response, data };
  } catch {
    return {
      response: null,
      data: { ok: false as const, message: "네트워크 연결을 확인해주세요." },
    };
  }
}

export async function saveWeeklySchedule(input: WeeklyScheduleInput) {
  try {
    const response = await fetch("/api/weekly-schedules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await parseResponse(response);
    return { response, data };
  } catch {
    return {
      response: null,
      data: { ok: false as const, message: "네트워크 연결을 확인해주세요." },
    };
  }
}
