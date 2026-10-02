import type { DailyRecord, Recovery, Task } from "@/lib/mock-data";

export type DaySummary = {
  date: string;
  total: number;
  completed: number;
  partial: number;
  incomplete: number;
  isCheckedOut: boolean;
  rate: number | null;
};

// 일부 완료는 절반만 해낸 것으로 계산합니다.
const PARTIAL_WEIGHT = 0.5;

export function isCheckedOut(tasks: Task[]) {
  return tasks.length > 0 && tasks.every((task) => task.status !== "pending");
}

export function summarizeTasks(date: string, tasks: Task[]): DaySummary {
  const completed = tasks.filter((task) => task.status === "completed").length;
  const partial = tasks.filter((task) => task.status === "partial").length;
  const incomplete = tasks.filter((task) => task.status === "incomplete").length;
  const checkedOut = isCheckedOut(tasks);

  return {
    date,
    total: tasks.length,
    completed,
    partial,
    incomplete,
    isCheckedOut: checkedOut,
    rate: checkedOut ? Math.round(((completed + partial * PARTIAL_WEIGHT) / tasks.length) * 100) : null,
  };
}

export function summarizeRecords(records: DailyRecord[]) {
  return new Map(records.map((record) => [record.date, summarizeTasks(record.date, record.tasks)]));
}

export function averageRate(summaries: DaySummary[]) {
  const checked = summaries.filter((summary) => summary.rate !== null);
  if (checked.length === 0) return null;
  return Math.round(checked.reduce((sum, summary) => sum + (summary.rate ?? 0), 0) / checked.length);
}

function toDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function addDays(date: string, days: number) {
  const next = toDate(date);
  next.setDate(next.getDate() + days);
  return toDateKey(next);
}

export function getWeekDates(date: string) {
  const mondayOffset = (toDate(date).getDay() + 6) % 7;
  const monday = addDays(date, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function getMonthCalendar(date: string) {
  const base = toDate(date);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return {
    year,
    month: month + 1,
    leadingBlanks: (firstDay.getDay() + 6) % 7,
    dates: Array.from({ length: daysInMonth }, (_, index) => toDateKey(new Date(year, month, index + 1))),
  };
}

export function getCarryOverRecoveries(recoveries: Recovery[], currentDate: string) {
  return recoveries.filter((recovery) => recovery.status === "open" && recovery.sourceDate < currentDate);
}

export function createCarryOverTasks(recoveries: Recovery[], currentDate: string): Task[] {
  return getCarryOverRecoveries(recoveries, currentDate).map((recovery) => ({
    id: `task-recovery-${recovery.sourceTaskId}`,
    title: recovery.sourceTaskTitle,
    subject: recovery.sourceTaskSubject ?? "기타",
    status: "pending",
    recoverySourceTaskId: recovery.sourceTaskId,
  }));
}
