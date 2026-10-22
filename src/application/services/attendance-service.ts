import {
  assertAttendanceDate,
  assertAttendanceDateRange,
  summarizeAttendance,
  type AttendanceEvent,
} from "@/domain/attendance/attendance";
import type { AttendanceRepository } from "@/repositories/interfaces/attendance-repository";

const MAX_RANGE_DAYS = 31;

function dayDistance(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

export class AttendanceService {
  constructor(private readonly repository: AttendanceRepository) {}

  async getByStudentAndDate(studentId: string, date: string) {
    assertAttendanceDate(date);
    return this.repository.findByStudentAndDate(studentId, date);
  }

  async getSummary(
    studentId: string,
    date: string,
    currentDate: string,
    nowTime?: string,
  ) {
    const events = await this.getByStudentAndDate(studentId, date);
    return {
      events,
      summary: summarizeAttendance(events, date, currentDate, nowTime),
    };
  }

  async getByStudentAndDateRange(
    studentId: string,
    from: string,
    to: string,
  ): Promise<AttendanceEvent[]> {
    assertAttendanceDateRange(from, to);
    if (dayDistance(from, to) > MAX_RANGE_DAYS) {
      throw new Error("ATTENDANCE_RANGE_TOO_LARGE");
    }
    return this.repository.findByStudentAndDateRange(studentId, from, to);
  }

  async getSummaries(
    studentId: string,
    from: string,
    to: string,
    currentDate: string,
    nowTime?: string,
  ) {
    const events = await this.getByStudentAndDateRange(studentId, from, to);
    const dates = [...new Set(events.map((event) => event.date))];
    const summaries = dates.map((date) =>
      summarizeAttendance(
        events.filter((event) => event.date === date),
        date,
        currentDate,
        date === currentDate ? nowTime : undefined,
      ),
    );
    return { events, summaries };
  }
}
