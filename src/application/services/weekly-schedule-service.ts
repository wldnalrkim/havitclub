import {
  getTodaySeoulDate,
  isEditableWeek,
  validateWeeklyScheduleInput,
  WeeklyScheduleError,
  type WeeklySchedule,
  type WeeklyScheduleInput,
} from "@/domain/weekly-schedule/weekly-schedule";
import type { WeeklyScheduleRepository } from "@/repositories/interfaces/weekly-schedule-repository";

export class WeeklyScheduleService {
  constructor(
    private readonly weeklyScheduleRepository: WeeklyScheduleRepository,
  ) {}

  async get(studentId: string, weekStartDate: string) {
    return this.weeklyScheduleRepository.findByStudentAndWeek(
      studentId,
      weekStartDate,
    );
  }

  async save(
    studentId: string,
    input: WeeklyScheduleInput,
    now = new Date(),
  ): Promise<{ schedule: WeeklySchedule; created: boolean; idempotent: boolean }> {
    validateWeeklyScheduleInput(input, now);
    if (!isEditableWeek(input.weekStartDate, now)) {
      throw new WeeklyScheduleError("WEEK_NOT_EDITABLE");
    }

    const existing = await this.weeklyScheduleRepository.findByStudentAndWeek(
      studentId,
      input.weekStartDate,
    );
    if (existing) {
      const isSamePlan = existing.days.every((day, index) => {
        const inputDay = input.days[index];
        return (
          inputDay &&
          day.date === inputDay.date &&
          day.isPlanned === inputDay.isPlanned &&
          day.plannedArrivalTime === inputDay.plannedArrivalTime &&
          day.plannedDepartureTime === inputDay.plannedDepartureTime
        );
      });

      if (isSamePlan) {
        return { schedule: existing, created: false, idempotent: true };
      }
      throw new WeeklyScheduleError("SCHEDULE_LOCKED");
    }

    const todayDate = getTodaySeoulDate(now);

    input.days.forEach((day) => {
      if (day.date >= todayDate) return;
      const isSameAsExisting =
        !day.isPlanned &&
        day.plannedArrivalTime === null &&
        day.plannedDepartureTime === null;
      if (!isSameAsExisting) {
        throw new WeeklyScheduleError("PAST_DATE_NOT_EDITABLE");
      }
    });

    const timestamp = now.toISOString();

    return {
      schedule: await this.weeklyScheduleRepository.create(
        studentId,
        input,
        timestamp,
      ),
      created: true,
      idempotent: false,
    };
  }
}
