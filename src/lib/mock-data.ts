export type Screen = "today" | "plan" | "checkout" | "dashboard" | "next-plan";

export type TaskStatus = "pending" | "completed" | "partial" | "incomplete";

export type Recovery = {
  sourceTaskId: string;
  sourceTaskTitle: string;
  sourceTaskSubject?: string;
  sourceTaskStatus: "partial" | "incomplete" | "completed";
  sourceDate: string;
  title: string;
  scheduledAt: string;
  // open: 아직 이어서 하지 않음 · completed: 이어서 완료함 · carried_over: 이어서 했지만 다시 Recovery로 넘어감
  status: "open" | "completed" | "carried_over";
  incompleteReason?: string;
};

export type Task = {
  id: string;
  title: string;
  subject: string;
  status: TaskStatus;
  incompleteReason?: string;
  recoverySourceTaskId?: string;
};

export type DailyRecord = {
  date: string;
  plannedCheckOutTime: string;
  tasks: Task[];
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

export const incompleteReasons = [
  "시간이 부족했어요",
  "계획량이 많았어요",
  "예상보다 어려웠어요",
  "다른 일정이 생겼어요",
  "집중하기 어려웠어요",
];

export function formatDateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(year, month - 1, day));
}
