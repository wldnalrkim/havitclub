export const ATTENDANCE_EVENTS = ["등원", "외출", "복귀", "하원"] as const;
export type AttendanceEventType = (typeof ATTENDANCE_EVENTS)[number];

export type AttendanceTimeQuality =
  | "valid"
  | "missing"
  | "unparseable"
  | "wrong_field"
  | "conflicting_fields";

export type AttendanceEvent = {
  id: string;
  studentId: string;
  date: string;
  event: AttendanceEventType;
  eventTime: string | null;
  eventTimeSource: "등원시각" | "하원시각" | null;
  timeQuality: AttendanceTimeQuality;
  recordedAt: string | null;
};

export type AttendanceStatus =
  | "not_arrived"
  | "in_progress"
  | "away"
  | "checked_out"
  | "needs_review";

export type AttendanceDataQuality =
  | "normal"
  | "incomplete"
  | "missing_time"
  | "order_conflict"
  | "date_uninterpretable"
  | "query_error";

export type AttendanceInterval = {
  start: string;
  end: string;
  minutes: number;
};

export type AttendanceSummary = {
  date: string;
  status: AttendanceStatus;
  quality: AttendanceDataQuality;
  firstArrivalTime: string | null;
  finalDepartureTime: string | null;
  confirmedDurationMinutes: number | null;
  awayDurationMinutes: number | null;
  ongoingDurationMinutes: number | null;
  intervals: AttendanceInterval[];
};

export class AttendanceValidationError extends Error {
  constructor(message = "출결 조회 조건을 확인해주세요.") {
    super(message);
    this.name = "AttendanceValidationError";
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertAttendanceDate(date: string) {
  if (!DATE_PATTERN.test(date)) {
    throw new AttendanceValidationError();
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new AttendanceValidationError();
  }
}

export function assertAttendanceDateRange(from: string, to: string) {
  assertAttendanceDate(from);
  assertAttendanceDate(to);
  if (from > to) throw new AttendanceValidationError();
}

export function normalizeAttendanceEvent(value: string): AttendanceEventType | null {
  const normalized = value.trim().replace(/\s+/g, "");
  if (normalized === "재등원") return "복귀";
  return ATTENDANCE_EVENTS.includes(normalized as AttendanceEventType)
    ? (normalized as AttendanceEventType)
    : null;
}

function parseTime(value: string) {
  const normalized = value.trim();
  let match = normalized.match(/^(오전|오후)\s*(\d{1,2})(?::|시)\s*(\d{1,2})(?:분)?$/);
  if (match) {
    let hour = Number(match[2]);
    const minute = Number(match[3]);
    if (hour > 12 || minute > 59 || hour === 0) return null;
    if (match[1] === "오후" && hour < 12) hour += 12;
    if (match[1] === "오전" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60
    ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    : null;
}

export function normalizeAttendanceTime(value: string | null | undefined) {
  if (!value?.trim()) return { value: null, quality: "missing" as const };
  const parsed = parseTime(value);
  return parsed
    ? { value: parsed, quality: "valid" as const }
    : { value: null, quality: "unparseable" as const };
}

export function selectEventTime(
  event: AttendanceEventType,
  arrivalText: string | null,
  departureText: string | null,
) {
  const expected = event === "등원" || event === "복귀" ? arrivalText : departureText;
  const other = event === "등원" || event === "복귀" ? departureText : arrivalText;
  if (expected?.trim() && other?.trim()) {
    return {
      ...normalizeAttendanceTime(expected),
      quality: "conflicting_fields" as const,
      source: event === "등원" || event === "복귀" ? "등원시각" as const : "하원시각" as const,
    };
  }
  if (!expected?.trim() && other?.trim()) {
    return {
      value: null,
      quality: "wrong_field" as const,
      source: null,
    };
  }
  return {
    ...normalizeAttendanceTime(expected),
    source: event === "등원" || event === "복귀" ? "등원시각" as const : "하원시각" as const,
  };
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function duration(start: string, end: string) {
  const value = minutes(end) - minutes(start);
  return value > 0 ? value : null;
}

export function summarizeAttendance(
  events: AttendanceEvent[],
  date: string,
  currentDate = date,
  nowTime?: string,
): AttendanceSummary {
  if (events.length === 0) {
    return {
      date,
      status: "not_arrived",
      quality: "normal",
      firstArrivalTime: null,
      finalDepartureTime: null,
      confirmedDurationMinutes: 0,
      awayDurationMinutes: 0,
      ongoingDurationMinutes: null,
      intervals: [],
    };
  }

  if (events.some((event) => event.date !== date)) {
    return {
      date,
      status: "needs_review",
      quality: "date_uninterpretable",
      firstArrivalTime: null,
      finalDepartureTime: null,
      confirmedDurationMinutes: null,
      awayDurationMinutes: null,
      ongoingDurationMinutes: null,
      intervals: [],
    };
  }

  if (events.some((event) => event.timeQuality !== "valid" || !event.eventTime)) {
    return {
      date,
      status: "needs_review",
      quality: "missing_time",
      firstArrivalTime: null,
      finalDepartureTime: null,
      confirmedDurationMinutes: null,
      awayDurationMinutes: null,
      ongoingDurationMinutes: null,
      intervals: [],
    };
  }

  const ordered = [...events].sort((a, b) =>
    a.eventTime!.localeCompare(b.eventTime!) || a.id.localeCompare(b.id),
  );
  const signatures = new Set<string>();
  if (
    ordered.some((event) => {
      const signature = `${event.event}:${event.eventTime}`;
      if (signatures.has(signature)) return true;
      signatures.add(signature);
      return false;
    })
  ) {
    return {
      date,
      status: "needs_review",
      quality: "order_conflict",
      firstArrivalTime: null,
      finalDepartureTime: null,
      confirmedDurationMinutes: null,
      awayDurationMinutes: null,
      ongoingDurationMinutes: null,
      intervals: [],
    };
  }

  let state: "before" | "inside" | "away" | "ended" = "before";
  let start: string | null = null;
  let hasVisit = false;
  let firstArrivalTime: string | null = null;
  let finalDepartureTime: string | null = null;
  let awayStart: string | null = null;
  let awayDurationMinutes = 0;
  const intervals: AttendanceInterval[] = [];
  let conflict = false;

  for (const event of ordered) {
    const time = event.eventTime!;
    if (state === "before" || state === "ended") {
      if (event.event === "등원") {
        state = "inside";
        start = time;
        hasVisit = true;
        firstArrivalTime ??= time;
      } else {
        conflict = true;
      }
      continue;
    }

    if (state === "inside") {
      if (event.event === "외출") {
        const end = duration(start!, time);
        if (end === null) conflict = true;
        else intervals.push({ start: start!, end: time, minutes: end });
        start = null;
        awayStart = time;
        state = "away";
      } else if (event.event === "하원") {
        const end = duration(start!, time);
        if (end === null) conflict = true;
        else intervals.push({ start: start!, end: time, minutes: end });
        start = null;
        finalDepartureTime = time;
        state = "ended";
      } else {
        conflict = true;
      }
      continue;
    }

    if (event.event === "복귀") {
      const awayEnd = duration(awayStart!, time);
      if (awayEnd === null) conflict = true;
      else awayDurationMinutes += awayEnd;
      awayStart = null;
      state = "inside";
      start = time;
    } else if (event.event === "하원") {
      const awayEnd = duration(awayStart!, time);
      if (awayEnd === null) conflict = true;
      else awayDurationMinutes += awayEnd;
      awayStart = null;
      finalDepartureTime = time;
      state = "ended";
    } else {
      conflict = true;
    }
  }

  if (conflict || !hasVisit) {
    return {
      date,
      status: "needs_review",
      quality: "order_conflict",
      firstArrivalTime: null,
      finalDepartureTime: null,
      confirmedDurationMinutes: null,
      awayDurationMinutes: null,
      ongoingDurationMinutes: null,
      intervals: [],
    };
  }

  const confirmedDurationMinutes = intervals.reduce(
    (total, interval) => total + interval.minutes,
    0,
  );
  if (state === "ended") {
    return {
      date,
      status: "checked_out",
      quality: "normal",
      firstArrivalTime,
      finalDepartureTime,
      confirmedDurationMinutes,
      awayDurationMinutes,
      ongoingDurationMinutes: null,
      intervals,
    };
  }

  const isPast = date < currentDate;
  const status = isPast ? "needs_review" : state === "away" ? "away" : "in_progress";
  const quality: AttendanceDataQuality = "incomplete";
  const ongoingDurationMinutes =
    state === "inside" && currentDate === date && nowTime
      ? duration(start!, nowTime)
      : null;

  return {
    date,
    status,
    quality,
    firstArrivalTime,
    finalDepartureTime,
    confirmedDurationMinutes,
    awayDurationMinutes,
    ongoingDurationMinutes,
    intervals,
  };
}
