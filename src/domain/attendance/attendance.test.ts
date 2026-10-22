import { describe, expect, it } from "vitest";
import {
  normalizeAttendanceEvent,
  normalizeAttendanceTime,
  selectEventTime,
  summarizeAttendance,
  type AttendanceEvent,
  type AttendanceEventType,
} from "./attendance";

const DATE = "2026-10-22";

function event(
  type: AttendanceEventType,
  time: string,
  id = `${type}-${time}`,
  date = DATE,
): AttendanceEvent {
  return {
    id,
    studentId: "test-student",
    date,
    event: type,
    eventTime: time,
    eventTimeSource: type === "등원" || type === "복귀" ? "등원시각" : "하원시각",
    timeQuality: "valid",
    recordedAt: null,
  };
}

describe("attendance domain", () => {
  it("정상 등원·하원을 계산한다", () => {
    const result = summarizeAttendance([
      event("등원", "09:00"),
      event("하원", "18:00"),
    ], DATE);

    expect(result.status).toBe("checked_out");
    expect(result.confirmedDurationMinutes).toBe(540);
  });

  it("외출과 복귀 사이를 체류시간에서 제외한다", () => {
    const result = summarizeAttendance([
      event("등원", "09:00"),
      event("외출", "12:00"),
      event("복귀", "13:00"),
      event("하원", "18:00"),
    ], DATE);

    expect(result.confirmedDurationMinutes).toBe(480);
    expect(result.intervals).toHaveLength(2);
  });

  it("여러 외출·복귀 구간을 합산한다", () => {
    const result = summarizeAttendance([
      event("등원", "09:00"),
      event("외출", "10:00"),
      event("복귀", "10:30"),
      event("외출", "14:00"),
      event("복귀", "15:00"),
      event("하원", "18:00"),
    ], DATE);

    expect(result.confirmedDurationMinutes).toBe(450);
  });

  it("같은 날 복수 방문을 허용한다", () => {
    const result = summarizeAttendance([
      event("등원", "09:00"),
      event("하원", "10:00"),
      event("등원", "13:00"),
      event("하원", "15:00"),
    ], DATE);

    expect(result.status).toBe("checked_out");
    expect(result.confirmedDurationMinutes).toBe(180);
  });

  it("외출 후 하원은 외출 이후 시간을 포함하지 않는다", () => {
    const result = summarizeAttendance([
      event("등원", "09:00"),
      event("외출", "12:00"),
      event("하원", "18:00"),
    ], DATE);

    expect(result.status).toBe("checked_out");
    expect(result.confirmedDurationMinutes).toBe(180);
  });

  it("하원 누락은 현재 날짜에서 체류 중으로 남긴다", () => {
    const result = summarizeAttendance([event("등원", "09:00")], DATE, DATE, "12:00");

    expect(result.status).toBe("in_progress");
    expect(result.quality).toBe("incomplete");
    expect(result.confirmedDurationMinutes).toBe(0);
    expect(result.ongoingDurationMinutes).toBe(180);
  });

  it("복귀 누락은 외출 중으로 남긴다", () => {
    const result = summarizeAttendance([
      event("등원", "09:00"),
      event("외출", "12:00"),
    ], DATE);

    expect(result.status).toBe("away");
    expect(result.quality).toBe("incomplete");
  });

  it("중복 태깅은 순서 충돌로 보류한다", () => {
    const result = summarizeAttendance([
      event("등원", "09:00", "first"),
      event("등원", "09:00", "duplicate"),
      event("하원", "18:00"),
    ], DATE);

    expect(result.quality).toBe("order_conflict");
    expect(result.confirmedDurationMinutes).toBeNull();
  });

  it("이벤트 순서 충돌을 보정하지 않는다", () => {
    const result = summarizeAttendance([
      event("복귀", "09:00"),
      event("등원", "10:00"),
      event("하원", "18:00"),
    ], DATE);

    expect(result.status).toBe("needs_review");
    expect(result.quality).toBe("order_conflict");
  });

  it("오전·오후와 24시간 시각을 같은 형식으로 변환한다", () => {
    expect(normalizeAttendanceEvent("재등원")).toBe("복귀");
    expect(normalizeAttendanceTime("오전 9:05")).toEqual({
      value: "09:05",
      quality: "valid",
    });
    expect(normalizeAttendanceTime("오후 6:30")).toEqual({
      value: "18:30",
      quality: "valid",
    });
    expect(normalizeAttendanceTime("18:30")).toEqual({
      value: "18:30",
      quality: "valid",
    });
  });

  it("날짜가 다른 이벤트는 자정 경계 해석을 보류한다", () => {
    const result = summarizeAttendance([
      event("등원", "23:50", "arrival", "2026-10-22"),
      event("하원", "00:10", "departure", "2026-10-23"),
    ], DATE);

    expect(result.quality).toBe("date_uninterpretable");
    expect(result.confirmedDurationMinutes).toBeNull();
  });

  it("과거의 필드 불일치와 종료 누락을 계산하지 않는다", () => {
    const selected = selectEventTime("하원", "18:00", null);
    expect(selected.quality).toBe("wrong_field");

    const result = summarizeAttendance([
      {
        ...event("하원", "18:00"),
        eventTime: null,
        eventTimeSource: null,
        timeQuality: "wrong_field",
      },
    ], DATE, "2026-10-23");
    expect(result.quality).toBe("missing_time");
    expect(result.confirmedDurationMinutes).toBeNull();
  });
});
