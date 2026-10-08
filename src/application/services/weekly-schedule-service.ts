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
  ): Promise<{ schedule: WeeklySchedule; created: boolean }> {
    validateWeeklyScheduleInput(input, now);
    if (!isEditableWeek(input.weekStartDate, now)) {
      throw new WeeklyScheduleError("WEEK_NOT_EDITABLE");
    }

    const existing = await this.weeklyScheduleRepository.findByStudentAndWeek(
      studentId,
      input.weekStartDate,
    );
    const todayDate = getTodaySeoulDate(now);

    input.days.forEach((day, index) => {
      if (day.date >= todayDate) return;
      const existingDay = existing?.days[index];
      const isSameAsExisting =
        existingDay
          ? existingDay.isPlanned === day.isPlanned &&
            existingDay.plannedArrivalTime === day.plannedArrivalTime &&
            existingDay.plannedDepartureTime === day.plannedDepartureTime
          : !day.isPlanned &&
            day.plannedArrivalTime === null &&
            day.plannedDepartureTime === null;
      if (!isSameAsExisting) {
        throw new WeeklyScheduleError("PAST_DATE_NOT_EDITABLE");
      }
    });

    const timestamp = now.toISOString();

    if (existing) {
      return {
        schedule: await this.weeklyScheduleRepository.update(
          existing,
          input,
          timestamp,
        ),
        created: false,
      };
    }

    return {
      schedule: await this.weeklyScheduleRepository.create(
        studentId,
        input,
        timestamp,
      ),
      created: true,
    };
  }
}
