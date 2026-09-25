export type Screen = "today" | "plan" | "checkout" | "dashboard";

export type TaskStatus = "pending" | "completed" | "partial" | "incomplete";

export type Task = {
  id: string;
  title: string;
  subject: string;
  status: TaskStatus;
  incompleteReason?: string;
};

export type MockPlan = {
  plannedCheckOutTime: string;
  tasks: Task[];
};

export const mockStudent = {
  name: "민서",
  grade: "고등학교 1학년",
  phoneSuffix: "1234",
};

export const mockPlan: MockPlan = {
  plannedCheckOutTime: "21:30",
  tasks: [
    { id: "task-1", title: "수학 문제집 2쪽 풀기", subject: "수학", status: "pending" },
    { id: "task-2", title: "영어 단어 30개 복습", subject: "영어", status: "pending" },
    { id: "task-3", title: "국어 지문 1개 읽기", subject: "국어", status: "pending" },
  ],
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
