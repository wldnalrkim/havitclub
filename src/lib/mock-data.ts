export type Screen = "today" | "plan" | "checkout" | "dashboard" | "next-plan";

export type TaskStatus = "pending" | "completed" | "partial" | "incomplete";

export type Recovery = {
  sourceTaskId: string;
  sourceTaskTitle: string;
  sourceTaskStatus: "partial" | "incomplete" | "completed";
  title: string;
  scheduledAt: string;
  status: "open" | "completed";
  incompleteReason?: string;
};

export type Task = {
  id: string;
  title: string;
  subject: string;
  status: TaskStatus;
  incompleteReason?: string;
};

export const subjectOptions = ["국어", "수학", "영어", "사회", "과학", "역사", "기타"] as const;
export type SubjectOption = (typeof subjectOptions)[number];

export type MockPlan = {
  plannedCheckOutTime: string;
  tasks: Task[];
};

export const mockPlan: MockPlan = {
  plannedCheckOutTime: "21:30",
  tasks: [],
};

export const mockDashboard = {
  attendanceDays: 4,
  plannedMinutes: 1_020,
  actualMinutes: 975,
  completionRate: 78,
  openRecoveryCount: 1,
};

export const incompleteReasons = [
  "시간이 부족했어요",
  "계획량이 많았어요",
  "예상보다 어려웠어요",
  "다른 일정이 생겼어요",
  "집중하기 어려웠어요",
];

export function formatToday() {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(2026, 8, 25));
}
