import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getWeekStartDate,
  WeeklyScheduleError,
  type PlannedDay,
  type WeeklySchedule,
  type WeeklyScheduleInput,
} from "@/domain/weekly-schedule/weekly-schedule";
import { WeeklyScheduleService } from "@/application/services/weekly-schedule-service";
import {
  readSessionToken,
  SESSION_COOKIE_NAME,
} from "@/infrastructure/auth/session";
import { NotionWeeklyScheduleRepository } from "@/repositories/notion/notion-weekly-schedule-repository";

export const dynamic = "force-dynamic";

const weeklyScheduleService = new WeeklyScheduleService(
  new NotionWeeklyScheduleRepository(),
);

function clientSchedule(schedule: WeeklySchedule | null) {
  if (!schedule) return null;
  return {
    weekStartDate: schedule.weekStartDate,
    days: schedule.days,
    submittedAt: schedule.submittedAt,
    updatedAt: schedule.updatedAt,
  };
}

function errorResponse(
  code: string,
  message: string,
  status: number,
) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

async function getSession() {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

function parseWeekStart(value: string | null) {
  if (!value) throw new WeeklyScheduleError("INVALID_WEEK_START");
  if (getWeekStartDate(value) !== value) {
    throw new WeeklyScheduleError("INVALID_WEEK_START");
  }
  return value;
}

function parseInput(body: unknown): WeeklyScheduleInput {
  if (typeof body !== "object" || body === null) {
    throw new WeeklyScheduleError("INVALID_DAYS");
  }

  const candidate = body as {
    weekStartDate?: unknown;
    days?: unknown;
  };
  if (
    typeof candidate.weekStartDate !== "string" ||
    !Array.isArray(candidate.days)
  ) {
    throw new WeeklyScheduleError("INVALID_DAYS");
  }

  const days: PlannedDay[] = candidate.days.map((day) => {
    if (typeof day !== "object" || day === null) {
      throw new WeeklyScheduleError("INVALID_DAYS");
    }
    const value = day as Record<string, unknown>;
    return {
      date: typeof value.date === "string" ? value.date : "",
      isPlanned: value.isPlanned === true,
      plannedArrivalTime:
        typeof value.plannedArrivalTime === "string"
          ? value.plannedArrivalTime
          : null,
      plannedDepartureTime:
        typeof value.plannedDepartureTime === "string"
          ? value.plannedDepartureTime
          : null,
    };
  });

  return {
    weekStartDate: candidate.weekStartDate,
    days,
  };
}

function handleDomainError(error: unknown) {
  if (!(error instanceof WeeklyScheduleError)) return null;

  const messages: Record<WeeklyScheduleError["code"], string> = {
    INVALID_WEEK_START: "월요일 날짜를 기준으로 주를 선택해주세요.",
    INVALID_DAYS: "요일별 계획을 다시 확인해주세요.",
    INVALID_DATE: "날짜 형식을 확인해주세요.",
    INVALID_TIME: "등원·하원 시간을 올바르게 입력해주세요.",
    ARRIVAL_AFTER_DEPARTURE: "등원 시간은 하원 시간보다 빨라야 합니다.",
    PAST_DATE_NOT_EDITABLE: "지난 날짜의 계획은 수정할 수 없습니다.",
    SCHEDULE_LOCKED: "확정된 주간 계획은 직접 수정할 수 없습니다. 변경이 필요한 경우 담당 코치에게 요청해주세요.",
    WEEK_NOT_EDITABLE: "이번 주 또는 다음 주 계획만 수정할 수 있습니다.",
  };
  const status =
    error.code === "WEEK_NOT_EDITABLE" ||
    error.code === "PAST_DATE_NOT_EDITABLE" ||
    error.code === "SCHEDULE_LOCKED"
      ? 409
      : 400;
  return errorResponse(error.code, messages[error.code], status);
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let weekStartDate: string;
  try {
    weekStartDate = parseWeekStart(searchParams.get("weekStart"));
  } catch (error) {
    return handleDomainError(error) ?? errorResponse(
      "INVALID_WEEK_START",
      "조회할 주를 확인해주세요.",
      400,
    );
  }

  try {
    const schedule = await weeklyScheduleService.get(
      session.studentId,
      weekStartDate,
    );
    return NextResponse.json({
      ok: true,
      schedule: clientSchedule(schedule),
    });
  } catch {
    return errorResponse(
      "WEEKLY_SCHEDULE_UNAVAILABLE",
      "주간 계획을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.",
      503,
    );
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "INVALID_DAYS",
      "요일별 계획을 다시 확인해주세요.",
      400,
    );
  }

  let input: WeeklyScheduleInput;
  try {
    input = parseInput(body);
  } catch (error) {
    return handleDomainError(error) ?? errorResponse(
      "INVALID_DAYS",
      "요일별 계획을 다시 확인해주세요.",
      400,
    );
  }

  try {
    const result = await weeklyScheduleService.save(
      session.studentId,
      input,
    );
    return NextResponse.json({
      ok: true,
      created: result.created,
      idempotent: result.idempotent,
      schedule: clientSchedule(result.schedule),
    });
  } catch (error) {
    const domainResponse = handleDomainError(error);
    if (domainResponse) return domainResponse;

    return errorResponse(
      "WEEKLY_SCHEDULE_UNAVAILABLE",
      "주간 계획을 저장할 수 없습니다. 잠시 후 다시 시도해주세요.",
      503,
    );
  }
}
