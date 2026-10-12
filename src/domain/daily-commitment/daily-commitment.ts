import { getTodaySeoulDate, getWeekStartDate, type WeeklySchedule } from "@/domain/weekly-schedule/weekly-schedule";

export { getTodaySeoulDate } from "@/domain/weekly-schedule/weekly-schedule";

export const DAILY_COMMITMENT_TIME_ZONE = "Asia/Seoul";
export const MAX_TASKS = 20;

export type StudyTask = {
  id: string;
  subject: string;
  description: string;
  recoveryId?: string;
};

export type DailyCommitment = {
  id: string;
  studentId: string;
  date: string;
  tasks: StudyTask[];
  initialTasks: StudyTask[];
  initialSubmittedAt: string;
  updatedAt: string;
  version: number;
  lastRequestId: string | null;
  checkout: DailyCheckout | null;
};

export type CheckoutTaskStatus = "completed" | "partial" | "incomplete";

export type CheckoutTaskResult = {
  taskId: string;
  status: CheckoutTaskStatus;
  reason: string | null;
};

export type DailyCheckout = {
  results: CheckoutTaskResult[];
  checkedOutAt: string;
};

export type DailyCommitmentSummary = {
  checkoutStatus: "미체크아웃" | "체크아웃 완료";
  totalTasks: number;
  completedTasks: number | null;
  partialTasks: number | null;
  incompleteTasks: number | null;
  needsCoaching: "미체크아웃" | "확인 필요" | "검토 불필요";
  resultSummary: string;
  plannedCheckOutTime: string | null;
  openRecoveryCount: number;
};

const CHECKOUT_LABELS: Record<CheckoutTaskStatus, string> = {
  completed: "완료",
  partial: "일부 완료",
  incomplete: "미완료",
};

export function createDailyCommitmentSummary(
  tasks: StudyTask[],
  checkout: DailyCheckout | null,
  plannedCheckOutTime: string | null,
  openRecoveryCount = 0,
): DailyCommitmentSummary {
  if (!checkout) {
    return {
      checkoutStatus: "미체크아웃",
      totalTasks: tasks.length,
      completedTasks: null,
      partialTasks: null,
      incompleteTasks: null,
      needsCoaching: "미체크아웃",
      resultSummary: tasks.length
        ? `[체크아웃 전]\n${tasks.map((task) => `[${task.subject}]\n- ${task.description}`).join("\n")}`
        : "체크아웃 전 또는 학습 항목 없음",
      plannedCheckOutTime,
      openRecoveryCount,
    };
  }

  const resultByTaskId = new Map(checkout.results.map((result) => [result.taskId, result]));
  const counts = { completed: 0, partial: 0, incomplete: 0 };
  const lines = tasks.map((task) => {
    const result = resultByTaskId.get(task.id);
    if (!result) {
      return `[${task.subject}]\n- ${task.description} — 결과 없음`;
    }
    counts[result.status] += 1;
    const reason = result.reason ? `\n- 미완료 사유: ${result.reason}` : "";
    return `[${task.subject}]\n- ${task.description} — ${CHECKOUT_LABELS[result.status]}${reason}`;
  });
  return {
    checkoutStatus: "체크아웃 완료",
    totalTasks: tasks.length,
    completedTasks: counts.completed,
    partialTasks: counts.partial,
    incompleteTasks: counts.incomplete,
    needsCoaching:
      counts.partial > 0 || counts.incomplete > 0
        ? "확인 필요"
        : "검토 불필요",
    resultSummary: lines.join("\n"),
    plannedCheckOutTime,
    openRecoveryCount,
  };
}

export type DailyCheckoutInput = {
  date: string;
  results: CheckoutTaskResult[];
};

export type DailyCommitmentRevisionAction = "CREATE" | "UPDATE" | "DELETE";

export type DailyCommitmentRevision = {
  id: string;
  commitmentId: string;
  studentId: string;
  date: string;
  taskId: string;
  action: DailyCommitmentRevisionAction;
  before: StudyTask | null;
  after: StudyTask | null;
  changedAt: string;
  changedBy: "student";
  version: number;
};

export type DailyCommitmentInput = {
  date: string;
  tasks: StudyTask[];
  expectedVersion?: number;
  requestId?: string;
  plannedCheckOutTime?: unknown;
};

export type PlannedCheckOut = {
  time: string | null;
  isPlanned: boolean;
  message: string | null;
};

export type DailyCommitmentErrorCode =
  | "INVALID_DATE"
  | "DATE_NOT_TODAY"
  | "INVALID_TASKS"
  | "TASK_LIMIT_EXCEEDED"
  | "VERSION_CONFLICT"
  | "CHECK_OUT_TIME_READ_ONLY"
  | "WEEKLY_SCHEDULE_NOT_FOUND"
  | "NOT_ATTENDING_TODAY"
  | "COMMITMENT_NOT_FOUND"
  | "CHECKED_OUT"
  | "INVALID_CHECKOUT"
  | "INVALID_RANGE";

export class DailyCommitmentError extends Error {
  readonly code: DailyCommitmentErrorCode;

  constructor(code: DailyCommitmentErrorCode) {
    super(code);
    this.name = "DailyCommitmentError";
    this.code = code;
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string) {
  if (!DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? parsed
    : null;
}

export function isValidDailyDate(value: string) {
  return parseDate(value) !== null;
}

export function validateDailyCommitmentInput(
  input: DailyCommitmentInput,
  now = new Date(),
) {
  if (!isValidDailyDate(input.date)) {
    throw new DailyCommitmentError("INVALID_DATE");
  }
  if (input.date !== getTodaySeoulDate(now)) {
    throw new DailyCommitmentError("DATE_NOT_TODAY");
  }
  if (input.plannedCheckOutTime !== undefined) {
    throw new DailyCommitmentError("CHECK_OUT_TIME_READ_ONLY");
  }
  if (!Array.isArray(input.tasks) || input.tasks.length === 0) {
    throw new DailyCommitmentError("INVALID_TASKS");
  }
  if (input.tasks.length > MAX_TASKS) {
    throw new DailyCommitmentError("TASK_LIMIT_EXCEEDED");
  }

  const ids = new Set<string>();
  input.tasks.forEach((task) => {
    if (
      typeof task !== "object" ||
      task === null ||
      typeof task.id !== "string" ||
      !task.id ||
      ids.has(task.id) ||
      typeof task.subject !== "string" ||
      !task.subject.trim() ||
      typeof task.description !== "string" ||
      !task.description.trim() ||
      (task.recoveryId !== undefined &&
        (typeof task.recoveryId !== "string" || !task.recoveryId)) ||
      task.subject.length > 100 ||
      task.description.length > 500
    ) {
      throw new DailyCommitmentError("INVALID_TASKS");
    }
    ids.add(task.id);
  });

  if (
    input.expectedVersion !== undefined &&
    (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0)
  ) {
    throw new DailyCommitmentError("VERSION_CONFLICT");
  }
}

const CHECKOUT_STATUSES: CheckoutTaskStatus[] = ["completed", "partial", "incomplete"];
export const MAX_CHECKOUT_REASON_LENGTH = 200;
export const MAX_RANGE_DAYS = 62;

export function validateDailyCheckoutInput(
  input: DailyCheckoutInput,
  tasks: StudyTask[],
  now = new Date(),
) {
  if (!isValidDailyDate(input.date)) {
    throw new DailyCommitmentError("INVALID_DATE");
  }
  if (input.date !== getTodaySeoulDate(now)) {
    throw new DailyCommitmentError("DATE_NOT_TODAY");
  }
  if (!Array.isArray(input.results) || input.results.length !== tasks.length) {
    throw new DailyCommitmentError("INVALID_CHECKOUT");
  }
  const taskIds = new Set(tasks.map((task) => task.id));
  const seen = new Set<string>();
  input.results.forEach((result) => {
    if (
      !taskIds.has(result.taskId) ||
      seen.has(result.taskId) ||
      !CHECKOUT_STATUSES.includes(result.status)
    ) {
      throw new DailyCommitmentError("INVALID_CHECKOUT");
    }
    if (result.status === "completed") {
      if (result.reason !== null) throw new DailyCommitmentError("INVALID_CHECKOUT");
    } else if (
      typeof result.reason !== "string" ||
      !result.reason.trim() ||
      result.reason.length > MAX_CHECKOUT_REASON_LENGTH
    ) {
      throw new DailyCommitmentError("INVALID_CHECKOUT");
    }
    seen.add(result.taskId);
  });
}

export function validateDateRange(from: string, to: string) {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end || start > end) {
    throw new DailyCommitmentError("INVALID_RANGE");
  }
  if ((end.getTime() - start.getTime()) / 86_400_000 + 1 > MAX_RANGE_DAYS) {
    throw new DailyCommitmentError("INVALID_RANGE");
  }
}

export function isCheckoutComplete(commitment: Pick<DailyCommitment, "tasks" | "checkout">) {
  if (!commitment.checkout || commitment.tasks.length === 0) return false;
  const resultIds = new Set(commitment.checkout.results.map((result) => result.taskId));
  return commitment.tasks.every((task) => resultIds.has(task.id));
}

export function diffTasks(
  before: StudyTask[],
  after: StudyTask[],
  changedAt: string,
  commitmentId: string,
  studentId: string,
  date: string,
  version: number,
): Omit<DailyCommitmentRevision, "id">[] {
  const previous = new Map(before.map((task) => [task.id, task]));
  const next = new Map(after.map((task) => [task.id, task]));
  const revisions: Omit<DailyCommitmentRevision, "id">[] = [];

  for (const task of after) {
    const oldTask = previous.get(task.id);
    if (!oldTask) {
      revisions.push({
        commitmentId, studentId, date, taskId: task.id, action: "CREATE",
        before: null, after: task, changedAt, changedBy: "student", version,
      });
    } else if (
      oldTask.subject !== task.subject ||
      oldTask.description !== task.description
    ) {
      revisions.push({
        commitmentId, studentId, date, taskId: task.id, action: "UPDATE",
        before: oldTask, after: task, changedAt, changedBy: "student", version,
      });
    }
  }

  for (const task of before) {
    if (!next.has(task.id)) {
      revisions.push({
        commitmentId, studentId, date, taskId: task.id, action: "DELETE",
        before: task, after: null, changedAt, changedBy: "student", version,
      });
    }
  }

  return revisions;
}

export function getPlannedCheckOut(
  schedule: WeeklySchedule | null,
  date: string,
): PlannedCheckOut {
  if (!schedule) {
    return {
      time: null,
      isPlanned: false,
      message: "이번 주 주간 등하원 계획이 아직 확정되지 않았습니다.",
    };
  }

  const weekStartDate = getWeekStartDate(date);
  if (schedule.weekStartDate !== weekStartDate) {
    return {
      time: null,
      isPlanned: false,
      message: "오늘의 주간 등하원 계획을 확인할 수 없습니다.",
    };
  }

  const day = schedule.days.find((item) => item.date === date);
  if (!day || !day.isPlanned) {
    return {
      time: null,
      isPlanned: false,
      message: "오늘은 주간 계획상 미등원 예정일입니다.",
    };
  }

  return {
    time: day.plannedDepartureTime,
    isPlanned: true,
    message: day.plannedDepartureTime
      ? null
      : "오늘의 확정된 하원 예정시간이 없습니다. 담당 코치에게 확인해주세요.",
  };
}
