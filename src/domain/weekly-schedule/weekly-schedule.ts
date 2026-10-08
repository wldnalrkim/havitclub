export const TIME_ZONE = "Asia/Seoul";
export const DAY_COUNT = 7;

export type PlannedDay = {
  date: string;
  isPlanned: boolean;
  plannedArrivalTime: string | null;
  plannedDepartureTime: string | null;
};

export type WeeklySchedule = {
  studentId: string;
  weekStartDate: string;
  days: PlannedDay[];
  submittedAt: string;
  updatedAt: string;
};

export type WeeklyScheduleInput = {
  weekStartDate: string;
  days: PlannedDay[];
};

export type WeeklyScheduleValidationError =
  | "INVALID_WEEK_START"
  | "INVALID_DAYS"
  | "INVALID_DATE"
  | "INVALID_TIME"
  | "ARRIVAL_AFTER_DEPARTURE"
  | "PAST_DATE_NOT_EDITABLE"
  | "SCHEDULE_LOCKED"
  | "WEEK_NOT_EDITABLE";

export class WeeklyScheduleError extends Error {
  readonly code: WeeklyScheduleValidationError;

  constructor(code: WeeklyScheduleValidationError) {
    super(code);
    this.name = "WeeklyScheduleError";
    this.code = code;
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function parseCalendarDate(date: string) {
  if (!DATE_PATTERN.test(date)) return null;

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function isValidDate(date: string) {
  return parseCalendarDate(date) !== null;
}

export function isValidTime(time: string) {
  return TIME_PATTERN.test(time);
}

export function getWeekStartDate(date: string) {
  const parsed = parseCalendarDate(date);
  if (!parsed) throw new WeeklyScheduleError("INVALID_DATE");

  const dayOfWeek = parsed.getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % DAY_COUNT;
  parsed.setUTCDate(parsed.getUTCDate() - daysFromMonday);
  return parsed.toISOString().slice(0, 10);
}

export function getWeekDates(weekStartDate: string) {
  if (getWeekStartDate(weekStartDate) !== weekStartDate) {
    throw new WeeklyScheduleError("INVALID_WEEK_START");
  }

  const start = parseCalendarDate(weekStartDate);
  if (!start) throw new WeeklyScheduleError("INVALID_WEEK_START");

  return Array.from({ length: DAY_COUNT }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function getTodaySeoulDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function getCurrentWeekStartDate(now = new Date()) {
  return getWeekStartDate(getTodaySeoulDate(now));
}

export function isEditableWeek(weekStartDate: string, now = new Date()) {
  const currentWeekStart = getCurrentWeekStartDate(now);
  const nextWeekStart = addDays(currentWeekStart, DAY_COUNT);
  return weekStartDate === currentWeekStart || weekStartDate === nextWeekStart;
}

export function addDays(date: string, days: number) {
  const parsed = parseCalendarDate(date);
  if (!parsed) throw new WeeklyScheduleError("INVALID_DATE");
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function createEmptyWeeklyScheduleInput(weekStartDate: string): WeeklyScheduleInput {
  return {
    weekStartDate,
    days: getWeekDates(weekStartDate).map((date) => ({
      date,
      isPlanned: false,
      plannedArrivalTime: null,
      plannedDepartureTime: null,
    })),
  };
}

function validatePlannedDay(day: PlannedDay, expectedDate: string) {
  if (
    typeof day !== "object" ||
    day === null ||
    day.date !== expectedDate ||
    typeof day.isPlanned !== "boolean"
  ) {
    throw new WeeklyScheduleError("INVALID_DAYS");
  }

  if (!day.isPlanned) {
    if (day.plannedArrivalTime !== null || day.plannedDepartureTime !== null) {
      throw new WeeklyScheduleError("INVALID_DAYS");
    }
    return;
  }

  if (
    typeof day.plannedArrivalTime !== "string" ||
    typeof day.plannedDepartureTime !== "string" ||
    !isValidTime(day.plannedArrivalTime) ||
    !isValidTime(day.plannedDepartureTime)
  ) {
    throw new WeeklyScheduleError("INVALID_TIME");
  }

  if (day.plannedArrivalTime >= day.plannedDepartureTime) {
    throw new WeeklyScheduleError("ARRIVAL_AFTER_DEPARTURE");
  }
}

export function validateWeeklyScheduleInput(
  input: WeeklyScheduleInput,
  now = new Date(),
) {
  if (
    typeof input !== "object" ||
    input === null ||
    typeof input.weekStartDate !== "string" ||
    !isValidDate(input.weekStartDate)
  ) {
    throw new WeeklyScheduleError("INVALID_WEEK_START");
  }

  const weekDates = getWeekDates(input.weekStartDate);
  if (!isEditableWeek(input.weekStartDate, now)) {
    throw new WeeklyScheduleError("WEEK_NOT_EDITABLE");
  }

  if (!Array.isArray(input.days) || input.days.length !== DAY_COUNT) {
    throw new WeeklyScheduleError("INVALID_DAYS");
  }

  input.days.forEach((day, index) => validatePlannedDay(day, weekDates[index]));
  return input;
}
