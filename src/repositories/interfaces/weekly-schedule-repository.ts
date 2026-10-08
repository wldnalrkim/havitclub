import type {
  WeeklySchedule,
  WeeklyScheduleInput,
} from "@/domain/weekly-schedule/weekly-schedule";

export interface WeeklyScheduleRepository {
  findByStudentAndWeek(
    studentId: string,
    weekStartDate: string,
  ): Promise<WeeklySchedule | null>;
  create(
    studentId: string,
    input: WeeklyScheduleInput,
    submittedAt: string,
  ): Promise<WeeklySchedule>;
}
