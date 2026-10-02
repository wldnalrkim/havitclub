import type { StudentLookupResult } from "@/domain/student/student";
import type { StudentRepository } from "@/repositories/interfaces/student-repository";

export type LoginResult =
  | { status: "not_found" }
  | { status: "ambiguous" }
  | { status: "found"; student: Extract<StudentLookupResult, { status: "found" }>["student"] };

export class LoginService {
  constructor(private readonly studentRepository: StudentRepository) {}

  async login(studentCode: string): Promise<LoginResult> {
    const lookup = await this.studentRepository.findByAttendanceCode(studentCode);

    if (lookup.status === "not_found") {
      return { status: "not_found" };
    }
    if (lookup.status === "ambiguous") {
      return { status: "ambiguous" };
    }

    return { status: "found", student: lookup.student };
  }
}
