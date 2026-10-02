import type { Recovery, Task } from "@/lib/mock-data";

export type MockTodayPlan = {
  plannedCheckOutTime: string;
  tasks: Task[];
  status: "editing" | "submitted";
};

export type MockState = {
  todayPlan: MockTodayPlan | null;
  recoveries: Recovery[];
  attendance: [];
  studyRecords: [];
  habitScore: null;
};

export const mockStudent = {
  studentId: "STU-023",
  name: "김지우",
  phoneSuffix: "4288",
};

export function createInitialMockState(): MockState {
  return {
    todayPlan: null,
    recoveries: [],
    attendance: [],
    studyRecords: [],
    habitScore: null,
  };
}
