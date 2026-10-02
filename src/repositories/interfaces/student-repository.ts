import type { StudentLookupResult } from "@/domain/student/student";

export interface StudentRepository {
  findByAttendanceCode(code: string): Promise<StudentLookupResult>;
}
