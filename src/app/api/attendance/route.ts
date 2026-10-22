import { NextResponse } from "next/server";
import { AttendanceService } from "@/application/services/attendance-service";
import { AttendanceValidationError } from "@/domain/attendance/attendance";
import { getTodaySeoulDate } from "@/domain/weekly-schedule/weekly-schedule";
import { NotionAttendanceRepository } from "@/repositories/notion/notion-attendance-repository";
import { getSession } from "@/app/api/daily-commitments/shared";

export const dynamic = "force-dynamic";

const attendanceService = new AttendanceService(
  new NotionAttendanceRepository(),
);

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function getSeoulTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  const from = params.get("from");
  const to = params.get("to");
  if ((!date && (from === null || to === null)) || (date && (from || to))) {
    return errorResponse(
      "INVALID_ATTENDANCE_RANGE",
      "출결 조회 날짜를 확인해주세요.",
      400,
    );
  }

  try {
    const currentDate = getTodaySeoulDate();
    const result = date
      ? await attendanceService.getSummary(
          session.studentId,
          date,
          currentDate,
          date === currentDate ? getSeoulTime() : undefined,
        )
      : {
          events: await attendanceService.getByStudentAndDateRange(
          session.studentId,
          from as string,
          to as string,
          ),
          summary: null,
        };
    const { events, summary } = result;
    return NextResponse.json({
      ok: true,
      count: events.length,
      summary,
      events: events.map((event) => ({
        id: event.id,
        date: event.date,
        event: event.event,
        eventTime: event.eventTime,
        eventTimeSource: event.eventTimeSource,
        timeQuality: event.timeQuality,
        recordedAt: event.recordedAt,
      })),
    });
  } catch (error) {
    if (error instanceof AttendanceValidationError) {
      return errorResponse(
        "INVALID_ATTENDANCE_RANGE",
        "출결 조회 날짜를 확인해주세요.",
        400,
      );
    }
    if (error instanceof Error && error.message === "ATTENDANCE_RANGE_TOO_LARGE") {
      return errorResponse(
        "ATTENDANCE_RANGE_TOO_LARGE",
        "출결 조회 기간은 최대 31일까지 가능합니다.",
        400,
      );
    }
    return errorResponse(
      "ATTENDANCE_UNAVAILABLE",
      "출결 기록을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.",
      503,
    );
  }
}
