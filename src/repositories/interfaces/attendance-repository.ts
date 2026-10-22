import type { AttendanceEvent } from "@/domain/attendance/attendance";

export interface AttendanceRepository {
  findByStudentAndDate(
    studentId: string,
    date: string,
  ): Promise<AttendanceEvent[]>;
  findByStudentAndDateRange(
    studentId: string,
    from: string,
    to: string,
  ): Promise<AttendanceEvent[]>;
}
